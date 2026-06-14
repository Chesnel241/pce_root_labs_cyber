"use client";

import * as React from "react";
import { getScenario, type ShellScenario } from "@/lib/lab-shell";
import { terminalWsUrl } from "@/lib/api";
import "@xterm/xterm/css/xterm.css";

interface LabTerminalProps {
  challengeId: string;
  labSlug?: string;
  /** Session de lab réelle (mode live). Si absent -> simulateur démo. */
  sessionId?: string | null;
  token?: string | null;
}

const THEME = {
  background: "#0F172A",
  foreground: "#E2E8F0",
  cursor: "#818CF8",
  selectionBackground: "rgba(129,140,248,0.3)",
  black: "#0F172A",
  red: "#FB7185",
  green: "#34D399",
  yellow: "#FBBF24",
  blue: "#60A5FA",
  magenta: "#A78BFA",
  cyan: "#22D3EE",
  white: "#E2E8F0",
};

// Control characters from xterm onData (kept as char codes to keep the source ASCII).
const ENTER = "\r";
const BACKSPACE = String.fromCharCode(127);
const CTRL_C = String.fromCharCode(3);

export function LabTerminal({
  challengeId,
  labSlug,
  sessionId,
  token,
}: LabTerminalProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // URL WebSocket : seulement si on a une session + un token + une API configurée.
  const wsUrl =
    sessionId && token ? terminalWsUrl(sessionId, token) : null;

  React.useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");
      if (disposed || !containerRef.current) return;

      const term = new Terminal({
        fontSize: 13,
        fontFamily:
          "var(--font-mono), ui-monospace, SFMono-Regular, monospace",
        theme: THEME,
        cursorBlink: true,
        convertEol: true,
        scrollback: 1000,
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(containerRef.current);
      fit.fit();

      // `cleanup` est toujours réassigné de manière à ne disposer le terminal
      // qu'une seule fois (par la couche active : WS ou simulateur).
      const disposeTerm = () => {
        try {
          term.dispose();
        } catch {
          /* noop */
        }
      };

      if (wsUrl) {
        const stopWs = connectWebSocket(term, fit, wsUrl, () => {
          // Repli sur le simulateur : on coupe les ressources WS (sans disposer
          // le terminal) puis on lance le simulateur sur le même terminal.
          if (disposed) return;
          stopWs();
          const stopSim = runSimulator(term, fit, challengeId, labSlug);
          cleanup = () => {
            stopSim();
            disposeTerm();
          };
        });
        cleanup = () => {
          stopWs();
          disposeTerm();
        };
      } else {
        const stopSim = runSimulator(term, fit, challengeId, labSlug);
        cleanup = () => {
          stopSim();
          disposeTerm();
        };
      }
    })();

    return () => {
      disposed = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeId, labSlug, wsUrl]);

  return (
    <div className="h-full w-full overflow-hidden rounded-lg bg-[#0F172A] p-3">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

type XTerm = import("@xterm/xterm").Terminal;
type Fit = import("@xterm/addon-fit").FitAddon;

/**
 * Connecte le terminal au WebSocket du backend. Renvoie une fonction de
 * nettoyage. En cas d'erreur de connexion immédiate, appelle `onFailure` pour
 * basculer sur le simulateur.
 */
function connectWebSocket(
  term: XTerm,
  fit: Fit,
  url: string,
  onFailure: () => void,
): () => void {
  term.writeln("\x1b[2mConnexion au conteneur du lab…\x1b[0m");

  let ws: WebSocket;
  try {
    ws = new WebSocket(url);
  } catch {
    onFailure();
    return () => {};
  }
  ws.binaryType = "arraybuffer";

  let opened = false;
  let failedOver = false;
  let disposed = false;

  const decoder = new TextDecoder();

  const sendResize = () => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }),
      );
    }
  };

  ws.onopen = () => {
    opened = true;
    sendResize();
  };

  ws.onmessage = (ev: MessageEvent) => {
    if (typeof ev.data === "string") {
      term.write(ev.data);
    } else if (ev.data instanceof ArrayBuffer) {
      term.write(decoder.decode(ev.data));
    } else if (ev.data instanceof Blob) {
      ev.data.arrayBuffer().then((buf) => term.write(decoder.decode(buf)));
    }
  };

  ws.onerror = () => {
    // Si la connexion n'a jamais abouti, on bascule sur le simulateur.
    if (!opened && !failedOver && !disposed) {
      failedOver = true;
      term.writeln("\r\n\x1b[33mTerminal live indisponible — mode démo.\x1b[0m");
      onFailure();
    }
  };

  ws.onclose = () => {
    if (!opened && !failedOver && !disposed) {
      failedOver = true;
      term.writeln("\r\n\x1b[33mTerminal live indisponible — mode démo.\x1b[0m");
      onFailure();
    } else if (opened && !disposed) {
      term.writeln("\r\n\x1b[2mSession terminée.\x1b[0m");
    }
  };

  // Clavier -> WS (keystrokes bruts).
  const onData = term.onData((data) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  });

  // Redimensionnement.
  const ro = new ResizeObserver(() => {
    try {
      fit.fit();
      sendResize();
    } catch {
      /* container detached */
    }
  });
  if (term.element?.parentElement) ro.observe(term.element.parentElement);

  return () => {
    disposed = true;
    onData.dispose();
    ro.disconnect();
    try {
      ws.close();
    } catch {
      /* noop */
    }
  };
}

/** Simulateur de shell (mode démo). Renvoie une fonction de nettoyage. */
function runSimulator(
  term: XTerm,
  fit: Fit,
  challengeId: string,
  labSlug?: string,
): () => void {
  const scenario: ShellScenario = getScenario(challengeId, labSlug);
  scenario.banner.forEach((line) => term.writeln(line));

  let buffer = "";
  const prompt = () => term.write(`\x1b[38;5;111m${scenario.prompt}\x1b[0m`);
  prompt();

  const dispose = term.onData((data) => {
    if (data === ENTER) {
      term.write("\r\n");
      const result = scenario.run(buffer);
      buffer = "";
      if (result.clear) {
        term.clear();
      } else if (result.lines) {
        result.lines.forEach((l) => term.writeln(l));
      }
      prompt();
    } else if (data === BACKSPACE) {
      if (buffer.length > 0) {
        buffer = buffer.slice(0, -1);
        term.write("\b \b");
      }
    } else if (data === CTRL_C) {
      term.write("^C\r\n");
      buffer = "";
      prompt();
    } else if (data >= " " || data === "\t") {
      buffer += data;
      term.write(data);
    }
  });

  const ro = new ResizeObserver(() => {
    try {
      fit.fit();
    } catch {
      /* container detached */
    }
  });
  if (term.element?.parentElement) ro.observe(term.element.parentElement);

  return () => {
    dispose.dispose();
    ro.disconnect();
  };
}
