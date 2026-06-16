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
      term.focus();

      // Cliquer dans la zone redonne le focus au terminal — sinon les touches
      // (notamment les flèches haut/bas pour l'historique) sont captées par la
      // page (scroll) au lieu d'être envoyées au shell.
      const el = containerRef.current;
      const focusTerm = () => term.focus();
      el.addEventListener("mousedown", focusTerm);

      // `cleanup` est toujours réassigné de manière à ne disposer le terminal
      // qu'une seule fois (par la couche active : WS ou simulateur).
      const disposeTerm = () => {
        el.removeEventListener("mousedown", focusTerm);
        try {
          term.dispose();
        } catch {
          /* noop */
        }
      };

      if (wsUrl) {
        // Mode LIVE : PAS de repli sur le simulateur (ce serait trompeur en
        // production). En cas d'échec, connectWebSocket affiche une erreur claire
        // avec le code de fermeture WS ; l'apprenant peut relancer via « Reset ».
        const stopWs = connectWebSocket(term, fit, wsUrl);
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
 * Connecte le terminal au WebSocket du backend (mode LIVE). Renvoie une fonction
 * de nettoyage. En cas d'échec, affiche une erreur claire + le code de fermeture
 * WS (utile pour diagnostiquer un proxy mal configuré) — sans jamais retomber sur
 * le simulateur de démonstration.
 */
function connectWebSocket(term: XTerm, fit: Fit, url: string): () => void {
  term.writeln("\x1b[2mConnexion au conteneur du lab…\x1b[0m");

  let ws: WebSocket;
  try {
    ws = new WebSocket(url);
  } catch (err) {
    term.writeln(
      `\r\n\x1b[31mImpossible d'ouvrir le terminal : ${
        err instanceof Error ? err.message : "URL WebSocket invalide"
      }\x1b[0m`,
    );
    return () => {};
  }
  ws.binaryType = "arraybuffer";

  let opened = false;
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
    term.focus();
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
    // Pas de détail exploitable ici ; le diagnostic complet (code/raison) est
    // affiché dans onclose, déclenché juste après.
  };

  ws.onclose = (ev) => {
    if (disposed) return;
    if (opened) {
      term.writeln("\r\n\x1b[2mSession terminée.\x1b[0m");
      return;
    }
    // La connexion n'a jamais abouti -> diagnostic clair (jamais "mode démo").
    const code = ev.code || 0;
    const reason = (ev.reason || "").toLowerCase();
    const hint =
      code === 1006
        ? "le reverse proxy ne route probablement pas le WebSocket vers le backend (vérifier le proxy de /api/ws/terminal et l'en-tête Upgrade)"
        : code === 1008 || code === 4401 || reason.includes("unauth")
          ? "authentification refusée (token invalide/expiré) — reconnectez-vous"
          : "le service de terminal est injoignable";
    term.writeln(
      `\r\n\x1b[31mConnexion au terminal impossible (code ${code}). ${hint}.\x1b[0m`,
    );
    term.writeln(
      "\x1b[33mLe conteneur du lab est démarré — cliquez sur « Reset » pour réessayer.\x1b[0m",
    );
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
