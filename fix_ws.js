export function terminalWsUrl(sessionId: string, token: string): string | null {
  if (!apiEnabled()) return null;
  try {
    const url = new URL(API_URL);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws/terminal";
    const params = new URLSearchParams({ sessionId, token });
    url.search = params.toString();
    return url.toString();
  } catch {
    // Fallback if API_URL is not a valid absolute URL (e.g. relative path)
    const base = API_URL.replace(/^http/i, "ws").replace(/\/api\/?$/, "").replace(/\/$/, "");
    const params = new URLSearchParams({ sessionId, token });
    return `${base}/ws/terminal?${params.toString()}`;
  }
}
