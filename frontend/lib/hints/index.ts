import { hints as t1 } from "./track1";
import { hints as t2 } from "./track2";
import { hints as t3 } from "./track3";
import { hints as t4 } from "./track4";
import { hints as t5 } from "./track5";
import { hints as t6 } from "./track6";

/** Indices par track, fusionnés (clé = id de challenge). */
export const extraHints: Record<string, string[]> = {
  ...t1, ...t2, ...t3, ...t4, ...t5, ...t6,
};
