/**
 * @file Loads data/curriculum.json (the single source of truth) and exposes
 * read helpers. Flags live ONLY in the database (or in the deterministic
 * fallback computed here); they are NEVER part of the curriculum JSON and must
 * never be leaked to clients. This module also computes deterministic fallback
 * flags so flag-submission works end-to-end even without Postgres.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { config } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve the curriculum file. Default: backend/src/db -> repo root
// /data/curriculum.json. Overridable via CURRICULUM_PATH (e.g. in containers
// where the data dir is mounted/copied to a different location).
const CURRICULUM_PATH = process.env.CURRICULUM_PATH
  ? path.resolve(process.env.CURRICULUM_PATH)
  : path.resolve(__dirname, '../../../data/curriculum.json');

/**
 * The canonical flag for the first lab. Other challenges get a deterministic
 * placeholder so the submit flow works end-to-end before real labs exist.
 */
export const FIRST_LAB_CHALLENGE_ID = '1.1.1';
export const FIRST_LAB_FLAG = 'PCE{s3_public_bucket_recon_2024}';

/** @typedef {{id:string,title:string,description:string,points:number,lab?:string}} RawChallenge */
/** @typedef {{id:string,name:string,difficulty:string,xp:number,summary:string,challenges:RawChallenge[]}} RawModule */
/** @typedef {{id:string,order:number,name:string,subtitle:string,description:string,accent:string,icon:string,totalXp:number,modules:RawModule[]}} RawTrack */

/** @type {{meta:object, tracks:RawTrack[], vulnerabilities:object[]}} */
const curriculum = JSON.parse(readFileSync(CURRICULUM_PATH, 'utf-8'));

/**
 * Compute the deterministic placeholder flag for a challenge id.
 * Example: "1.2.3" -> "PCE{1_2_3_flag}".
 * @param {string} challengeId
 * @returns {string}
 */
export function deterministicFlag(challengeId) {
  return `${config.flagPrefix}{${challengeId.replace(/\./g, '_')}_flag}`;
}

/**
 * Canonical flag for a challenge (used for in-memory fallback validation and
 * for seeding). The first lab has its real flag; everything else is the
 * deterministic placeholder.
 * @param {string} challengeId
 * @returns {string}
 */
export function expectedFlag(challengeId) {
  if (challengeId === FIRST_LAB_CHALLENGE_ID) return FIRST_LAB_FLAG;
  return deterministicFlag(challengeId);
}

/**
 * The raw curriculum meta block.
 * @returns {object}
 */
export function getMeta() {
  return curriculum.meta;
}

/**
 * The vulnerabilities catalog.
 * @returns {object[]}
 */
export function getVulnerabilities() {
  return curriculum.vulnerabilities;
}

/**
 * All tracks (ordered) with nested modules and challenges. Challenges never
 * include flags.
 * @returns {RawTrack[]}
 */
export function getTracks() {
  return curriculum.tracks;
}

/**
 * A single track by id.
 * @param {string} trackId
 * @returns {RawTrack | null}
 */
export function getTrack(trackId) {
  return curriculum.tracks.find((t) => t.id === trackId) ?? null;
}

/**
 * Find a challenge by id, returning it with its parent track/module context.
 * @param {string} challengeId
 * @returns {{ challenge: RawChallenge, module: RawModule, track: RawTrack } | null}
 */
export function getChallenge(challengeId) {
  for (const track of curriculum.tracks) {
    for (const module of track.modules) {
      const challenge = module.challenges.find((c) => c.id === challengeId);
      if (challenge) return { challenge, module, track };
    }
  }
  return null;
}

/**
 * Flatten every challenge across all tracks, enriched with parent ids and the
 * canonical flag (server-side only).
 * @returns {Array<RawChallenge & {trackId:string, moduleId:string, flag:string}>}
 */
export function flattenChallenges() {
  /** @type {Array<RawChallenge & {trackId:string, moduleId:string, flag:string}>} */
  const out = [];
  for (const track of curriculum.tracks) {
    for (const module of track.modules) {
      for (const challenge of module.challenges) {
        out.push({
          ...challenge,
          trackId: track.id,
          moduleId: module.id,
          flag: expectedFlag(challenge.id),
        });
      }
    }
  }
  return out;
}

/**
 * Total number of challenges in the curriculum.
 * @returns {number}
 */
export function totalChallenges() {
  return flattenChallenges().length;
}
