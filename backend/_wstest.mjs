import jwt from 'jsonwebtoken';
import { WebSocket } from 'ws';
const token = jwt.sign({ email:'t@t.com', username:'t' }, 'test-secret-123', { subject:'00000000-0000-0000-0000-000000000000', expiresIn:'1h' });

const bad = new WebSocket('ws://localhost:4097/ws/terminal?sessionId=x&token=BAD');
bad.on('error', () => console.log('badToken: rejected as expected (401 at upgrade)'));
bad.on('open', () => { console.log('badToken: UNEXPECTEDLY opened'); bad.close(); });

setTimeout(() => {
  const ws = new WebSocket(`ws://localhost:4097/ws/terminal?sessionId=none&token=${token}`);
  let buf = '';
  ws.on('open', () => {
    console.log('goodToken: opened (pty fallback)');
    ws.send('echo PCE_WS_OK\n');
    ws.send(JSON.stringify({ type:'resize', cols:120, rows:40 }));
  });
  ws.on('message', (m) => { buf += m.toString(); });
  ws.on('error', (e) => console.log('goodToken error:', e.message));
  setTimeout(() => {
    console.log('pty output contains PCE_WS_OK:', buf.includes('PCE_WS_OK'));
    console.log('pty banner present:', buf.includes('Terminal local'));
    ws.close();
    process.exit(0);
  }, 1800);
}, 600);
