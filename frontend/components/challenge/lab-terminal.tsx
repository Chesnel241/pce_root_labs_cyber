"use client";

import * as React from "react";
import { getScenario, type ShellScenario } from "@/lib/lab-shell";
import "@xterm/xterm/css/xterm.css";

interface LabTerminalProps {
  challengeId: string;
  labSlug?: string;
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

export function LabTerminal({ challengeId, labSlug }: LabTerminalProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

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
      ro.observe(containerRef.current);

      cleanup = () => {
        dispose.dispose();
        ro.disconnect();
        term.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [challengeId, labSlug]);

  return (
    <div className="h-full w-full overflow-hidden rounded-lg bg-[#0F172A] p-3">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
