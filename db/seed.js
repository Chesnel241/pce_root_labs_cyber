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
  '2.2.1': 'PCE{passrole_runinstances_privesc_2024}',
  '2.3.1': 'PCE{oidc_trust_wildcard_sub_2024}',
  '3.2.1': 'PCE{terraform_five_misconfigs_2024}',
  '3.4.1': 'PCE{npm_typosquat_postinstall_2024}',
  '4.3.1': 'PCE{k8s_networkpolicy_gap_2024}',
  '4.4.1': 'PCE{k8s_pods_run_as_root_2024}',
  '5.2.1': 'PCE{lateral_movement_role_chain_2024}',
  '5.3.2': 'PCE{s3_forensics_exfil_actor_2024}',
  '5.4.2': 'PCE{guardduty_true_positive_2024}',
  '6.1.2': 'PCE{security_group_least_exposure_2024}',
  '6.2.1': 'PCE{least_privilege_scoped_policy_2024}',
  '1.1.2': 'PCE{unauth_s3_buck3t_enum_2026}',
  '1.3.4': 'PCE{iam_attach_policy_privesc_2024}',
  '1.1.3': 'PCE{api_gw_unprotected_2026}',
  '1.2.2': 'PCE{api_gateway_path_normalization_bypass_2024}',
  '1.3.3': 'PCE{lambda_cmd_injection_2026}',
  '1.3.2': 'PCE{assume_role_pivot_2024}',
  '1.1.4': 'PCE{passive_recon_reveals_all_2024}',
  '1.2.4': 'PCE{cloud_sg_too_permissive_2024}',
  '1.2.3': 'PCE{rds_pUbl1c_2024}',
  '1.4.2': 'PCE{1mdsv2_byp4ss_h34d3rs_2026}',
  '1.4.3': 'PCE{ssrf_m3t4d4t4_2026}',
  '2.1.1': 'PCE{iam_no_mfa_found_2024}',
  '2.1.4': 'PCE{git_keys_exposed_2024}',
  '2.2.2': 'PCE{iam_pivot_key_2026}',
  '2.3.3': 'PCE{saml_sig_bypass_2026}',
  '2.3.2': 'PCE{cross_account_trust_abuse_2024}',
  '2.2.3': 'PCE{update_assume_role_policy_admin_2024}',
  '2.1.2': 'PCE{AKIA5QYV7B8E9F0G1H2I}',
  '3.2.3': 'PCE{d0ck3rf1l3_s3cr3t_l34k_2024}',
  '3.2.2': 'PCE{cfn_auditing_and_securing_2026}',
  '3.1.4': 'PCE{j3nk1ns_p1p3l1n3_s3cur3d}',
  '3.3.2': 'PCE{env_v4r_s3cr3t_2026}',
  '3.1.2': 'PCE{pipeline_cmd_inj_2024}',
  '3.3.3': 'PCE{migrated_to_secrets_manager_2024}',
  '3.4.3': 'PCE{sbom_and_signatures_secured_2026}',
  '3.4.2': 'PCE{typ0squatt1ng_busted}',
  '3.1.3': 'PCE{gha_secrets_leaked_2024}',
  '4.2.3': 'PCE{etcd_secrets_unencrypted_2024}',
  '4.2.2': 'PCE{k8s_d4shb04rd_n0_4uth_2026}',
  '4.3.2': 'PCE{ingr3ss_byp4ss_2026}',
  '4.2.4': 'PCE{k8s_sa_token_abused_2024}',
  '4.4.2': 'PCE{sys_admin_c4p_m0unt_2024}',
  '4.1.1': 'PCE{escap3d_pr1v_c0ntain3r_2026}',
  '4.4.3': 'PCE{psp_bypass_2024}',
  '4.1.3': 'PCE{nsenter_mount_breakout_2024}',
  '4.1.2': 'PCE{d0ck3r_s0ck3t_rc3_pwnd_2026}',
  '4.3.3': 'PCE{k8s_dns_rebinding_2024}',
  '6.1.3': 'PCE{bastion_vpn_secured_2026}',
  '5.4.3': 'PCE{Suspicious_API_Calls_Detected_2026}',
  '6.2.3': 'PCE{scp_region_bypass_2024}',
  '5.2.3': 'PCE{crypt0_m1n3r_3c2_d3t3ct3d}',
  '6.3.2': 'PCE{cloud_security_hub_2026}',
  '6.1.1': 'PCE{vpc_segmentation_fixed_2024}',
  '5.1.4': 'PCE{n0_m0r3_l0gs_4_u}',
  '5.4.1': 'PCE{iam_detection_rules_2024}',
  '6.1.4': 'PCE{waf_rules_designed_2024}',
  '6.3.3': 'PCE{cloudtrail_config_bypassed_2026}',
  '5.1.3': 'PCE{cloudtrail_iam_privesc_detected_2024}',
  '5.2.2': 'PCE{L4mbd4_B4ckd00r_P3rsist3nc3_2024}',
  '5.3.1': 'PCE{ec2_containment_2024}',
  '6.2.2': 'PCE{mTLS_auth_successful_2024}',
  '5.1.2': 'PCE{198.51.100.42_dns_exfil}',
  '5.3.3': 'PCE{203.0.113.42_AKIAIOSFODNN7EXAMPLE}',
  '5.2.4': 'PCE{dns_tunn3ling_d3t3ct3d}',
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
