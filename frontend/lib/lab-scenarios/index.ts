/**
 * Registre des scénarios de terminal simulé (mode démo) pour les labs câblés
 * via un fichier dédié. Chaque module exporte `createScenario(): ShellScenario`.
 * `lab-shell.ts::getScenario` consulte ce registre en priorité (par labSlug).
 */
import type { ShellScenario } from "@/lib/lab-shell";

import { createScenario as iam02 } from "./iam-02-passrole-audit";
import { createScenario as iam03 } from "./iam-03-oidc-trust-audit";
import { createScenario as devsecops03 } from "./devsecops-03-terraform-audit";
import { createScenario as devsecops04 } from "./devsecops-04-npm-supplychain";
import { createScenario as container03 } from "./container-03-networkpolicy-audit";
import { createScenario as container04 } from "./container-04-pod-security-audit";
import { createScenario as soc02 } from "./soc-02-threat-hunting";
import { createScenario as soc03 } from "./soc-03-s3-forensics";
import { createScenario as soc04 } from "./soc-04-guardduty-triage";
import { createScenario as arch02 } from "./arch-02-security-group-remediation";
import { createScenario as arch03 } from "./arch-03-least-privilege-remediation";

export const scenarioRegistry: Record<string, () => ShellScenario> = {
  "iam-02-passrole-audit": iam02,
  "iam-03-oidc-trust-audit": iam03,
  "devsecops-03-terraform-audit": devsecops03,
  "devsecops-04-npm-supplychain": devsecops04,
  "container-03-networkpolicy-audit": container03,
  "container-04-pod-security-audit": container04,
  "soc-02-threat-hunting": soc02,
  "soc-03-s3-forensics": soc03,
  "soc-04-guardduty-triage": soc04,
  "arch-02-security-group-remediation": arch02,
  "arch-03-least-privilege-remediation": arch03,
};
