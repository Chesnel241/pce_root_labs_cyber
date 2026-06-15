/**
 * @file Idempotent seed script. Reads ../data/curriculum.json (the single source
 * of truth) and upserts tracks, modules and challenges into PostgreSQL using
 * DATABASE_URL. Flags: challenge 1.1.1 gets the canonical lab flag; every other
 * challenge gets a deterministic placeholder `PCE{<id_with_underscores>_flag}`
 * so flag submission works end-to-end. Also seeds a small set of badges.
 *
 * Usage:  DATABASE_URL=postgres://... node db/seed.js
 *         (or, from backend/: npm run seed)
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The runtime deps (pg, dotenv) are installed in ../backend/node_modules. The
// seed lives in db/ (no node_modules of its own), so resolve them from the
// backend install rather than from db/. This avoids a duplicate npm install.
const backendRequire = createRequire(path.resolve(__dirname, '../backend/package.json'));

/**
 * Import a backend dependency by name, resolving it against backend/node_modules.
 * @param {string} name
 * @returns {Promise<any>}
 */
async function loadDep(name) {
  try {
    return await import(pathToFileURL(backendRequire.resolve(name)).href);
  } catch (err) {
    console.error(
      `\n✗ Dépendance « ${name} » introuvable. Lancez d'abord : cd backend && npm install\n`,
    );
    throw err;
  }
}

const dotenv = (await loadDep('dotenv')).default;
const pg = (await loadDep('pg')).default;

// Load env from db/.env then backend/.env (whichever exists) for convenience.
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const DATABASE_URL = process.env.DATABASE_URL;
const FLAG_PREFIX = process.env.FLAG_PREFIX || 'PCE';

const FIRST_LAB_CHALLENGE_ID = '1.1.1';
const FIRST_LAB_FLAG = 'PCE{s3_public_bucket_recon_2024}';

// Real flags for challenges backed by a real Docker lab (labs/<slug>/). Any
// challenge not listed here falls back to its deterministic placeholder flag.
// Keep these in sync with each lab's challenge.json + frontend/lib/hints.ts.
const REAL_LAB_FLAGS = {
  [FIRST_LAB_CHALLENGE_ID]: FIRST_LAB_FLAG,
  '1.2.1': 'PCE{s3_exfil_hidden_prefix_2024}',
  '1.3.1': 'PCE{passrole_createaccesskey_escalation_2024}',
  '1.4.1': 'PCE{imds_ssrf_stolen_role_creds_2024}',
  '2.1.3': 'PCE{iam_wildcard_admin_policy_2024}',
  '3.1.1': 'PCE{jenkins_plaintext_aws_creds_2024}',
  '3.3.1': 'PCE{git_history_leaked_aws_key_2024}',
  '4.1.4': 'PCE{docker_layer_hardcoded_secret_2024}',
  '4.2.1': 'PCE{k8s_clusteradmin_binding_2024}',
  '5.1.1': 'PCE{cloudtrail_unauthorized_assumerole_2024}',
  '6.3.1': 'PCE{cis_public_s3_block_2024}',
};

if (!DATABASE_URL) {
  console.error('\n✗ DATABASE_URL non défini. Renseignez-le pour seeder la base.\n');
  process.exit(1);
}

const CURRICULUM_PATH = path.resolve(__dirname, '../data/curriculum.json');
/** @type {{meta:object, tracks:any[], vulnerabilities:any[]}} */
const curriculum = JSON.parse(readFileSync(CURRICULUM_PATH, 'utf-8'));

/**
 * Deterministic placeholder flag for a challenge id.
 * @param {string} challengeId
 * @returns {string}
 */
function deterministicFlag(challengeId) {
  return `${FLAG_PREFIX}{${challengeId.replace(/\./g, '_')}_flag}`;
}

/**
 * Canonical flag for a challenge: the real lab flag when one exists, otherwise
 * a deterministic placeholder so flag submission still works end-to-end.
 * @param {string} challengeId
 * @returns {string}
 */
function flagFor(challengeId) {
  return REAL_LAB_FLAGS[challengeId] ?? deterministicFlag(challengeId);
}

const DEFAULT_BADGES = [
  { id: 'first-blood', name: 'First Blood', description: 'Premier challenge résolu.', icon: 'Droplet', criteria: { solved: 1 } },
  { id: 'recon-master', name: 'Recon Master', description: 'Module de reconnaissance complété.', icon: 'Search', criteria: { module: '1.1' } },
  { id: 'cloud-breaker', name: 'Cloud Breaker', description: 'Track Cloud Pentesting complété.', icon: 'Crosshair', criteria: { track: 'cloud-pentesting' } },
  { id: 'streak-7', name: 'Sur une lancée', description: '7 jours consécutifs d’activité.', icon: 'Flame', criteria: { streak: 7 } },
  { id: 'top-10', name: 'Top 10', description: 'Entré dans le top 10 du classement.', icon: 'Trophy', criteria: { rank: 10 } },
];

async function main() {
  const { Pool } = pg;
  const pool = new Pool({ connectionString: DATABASE_URL });

  const counts = { tracks: 0, modules: 0, challenges: 0, badges: 0 };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const track of curriculum.tracks) {
      await client.query(
        `INSERT INTO tracks (id, "order", name, subtitle, description, accent, icon, total_xp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           "order" = EXCLUDED."order",
           name = EXCLUDED.name,
           subtitle = EXCLUDED.subtitle,
           description = EXCLUDED.description,
           accent = EXCLUDED.accent,
           icon = EXCLUDED.icon,
           total_xp = EXCLUDED.total_xp`,
        [track.id, track.order ?? 0, track.name, track.subtitle ?? null, track.description ?? null, track.accent ?? null, track.icon ?? null, track.totalXp ?? 0],
      );
      counts.tracks += 1;

      let moduleOrder = 0;
      for (const module of track.modules) {
        moduleOrder += 1;
        await client.query(
          `INSERT INTO modules (id, track_id, name, difficulty, xp, summary, "order")
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET
             track_id = EXCLUDED.track_id,
             name = EXCLUDED.name,
             difficulty = EXCLUDED.difficulty,
             xp = EXCLUDED.xp,
             summary = EXCLUDED.summary,
             "order" = EXCLUDED."order"`,
          [module.id, track.id, module.name, module.difficulty ?? null, module.xp ?? 0, module.summary ?? null, moduleOrder],
        );
        counts.modules += 1;

        let challengeOrder = 0;
        for (const challenge of module.challenges) {
          challengeOrder += 1;
          await client.query(
            `INSERT INTO challenges (id, module_id, track_id, title, description, points, lab, flag, "order")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO UPDATE SET
               module_id = EXCLUDED.module_id,
               track_id = EXCLUDED.track_id,
               title = EXCLUDED.title,
               description = EXCLUDED.description,
               points = EXCLUDED.points,
               lab = EXCLUDED.lab,
               flag = EXCLUDED.flag,
               "order" = EXCLUDED."order"`,
            [
              challenge.id,
              module.id,
              track.id,
              challenge.title,
              challenge.description ?? null,
              challenge.points ?? 0,
              challenge.lab ?? null,
              flagFor(challenge.id),
              challengeOrder,
            ],
          );
          counts.challenges += 1;
        }
      }
    }

    for (const badge of DEFAULT_BADGES) {
      await client.query(
        `INSERT INTO badges (id, name, description, icon, criteria)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           icon = EXCLUDED.icon,
           criteria = EXCLUDED.criteria`,
        [badge.id, badge.name, badge.description, badge.icon, JSON.stringify(badge.criteria)],
      );
      counts.badges += 1;
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }

  console.log('\n✓ Seed terminé.');
  console.log('  Tracks     :', counts.tracks);
  console.log('  Modules    :', counts.modules);
  console.log('  Challenges :', counts.challenges);
  console.log('  Badges     :', counts.badges);
  console.log('  Flags réels :', Object.keys(REAL_LAB_FLAGS).join(', '), '(labs Docker)');
  console.log('  Autres flags : déterministes -> PCE{<id>_flag}\n');
}

main().catch((err) => {
  console.error('\n✗ Échec du seed :', err.message);
  process.exit(1);
});
