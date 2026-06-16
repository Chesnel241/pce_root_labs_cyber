import type { ChallengeGuide } from "../guides";
import { guides as track1 } from "./track1";
import { guides as track2 } from "./track2";
import { guides as track3 } from "./track3";
import { guides as track4 } from "./track4";
import { guides as track5 } from "./track5";
import { guides as track6 } from "./track6";

/** Guides détaillés par track, fusionnés (clé = id de challenge). */
export const extraGuides: Record<string, ChallengeGuide> = {
  ...track1,
  ...track2,
  ...track3,
  ...track4,
  ...track5,
  ...track6,
};
