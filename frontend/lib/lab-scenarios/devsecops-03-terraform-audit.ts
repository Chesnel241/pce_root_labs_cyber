import type { ShellScenario, ShellResult } from "@/lib/lab-shell";

/**
 * Scénario du lab 3.2.1 — audit Terraform (5 misconfigurations).
 *
 * L'apprenant inspecte main.tf, détecte chaque misconfig (S3 public, SG
 * 0.0.0.0/0, stockage non chiffré, secret en dur, RDS publique) puis lance
 * le scanner tf-audit.py qui, une fois les 5 catégories trouvées, révèle le
 * flag en vert.
 */
export function createScenario(): ShellScenario {
  const flag = "PCE{terraform_five_misconfigs_2024}";

  return {
    prompt: "analyst@pce-lab:~$ ",
    banner: [
      "\x1b[1mPCE Root Labs — Lab 3.2.1 · Audit Terraform (mode démo)\x1b[0m",
      "Objectif : auditer l'infra Terraform de pce-data-platform et détecter ses 5 misconfigurations.",
      "Indice : inspectez main.tf (S3 public, SG 0.0.0.0/0, non chiffré, secret en dur, RDS publique) puis lancez tf-audit.py.",
      "Tapez \x1b[36mhelp\x1b[0m pour la liste des commandes.",
      "",
    ],
    run(input): ShellResult {
      const cmd = input.trim();
      if (!cmd) return { lines: [] };
      if (cmd === "clear") return { clear: true };
      if (cmd === "whoami") return { lines: ["analyst"] };

      if (cmd === "help") {
        return {
          lines: [
            "Commandes :",
            "  ls",
            "  cat main.tf",
            "  grep -n 'public-read' main.tf            (S3 public)",
            "  grep -n '0.0.0.0/0' main.tf              (security group ouvert)",
            "  grep -nE 'encrypted *= *false' main.tf   (volume non chiffré)",
            "  grep -niE 'password|secret' main.tf      (secret en dur)",
            "  grep -n 'publicly_accessible' main.tf    (RDS publique)",
            "  python3 tf-audit.py .                    (scanner -> flag si 5/5)",
          ],
        };
      }

      if (cmd === "ls") {
        return { lines: ["main.tf  tf-audit.py  README.md"] };
      }

      if (cmd.startsWith("cat") && cmd.includes("main.tf")) {
        return {
          lines: [
            'resource "aws_s3_bucket" "data_exports" {',
            '  bucket = "pce-data-platform-exports"',
            '  \x1b[33macl    = "public-read"\x1b[0m',
            "}",
            'resource "aws_security_group" "app_sg" {',
            "  ingress {",
            "    from_port = 22",
            '    \x1b[33mcidr_blocks = ["0.0.0.0/0"]\x1b[0m',
            "  }",
            "}",
            'resource "aws_instance" "app_server" {',
            "  root_block_device {",
            "    \x1b[33mencrypted   = false\x1b[0m",
            "  }",
            "}",
            'resource "aws_db_instance" "billing_db" {',
            '  \x1b[33mpassword = "Pr0d!Billing#2024"\x1b[0m',
            "  \x1b[33mpublicly_accessible = true\x1b[0m",
            "}",
            "",
            "5 misconfigurations sont présentes. Confirmez avec tf-audit.py.",
          ],
        };
      }

      if (cmd.startsWith("grep")) {
        if (cmd.includes("public-read")) {
          return { lines: ['main.tf:29:  acl    = "public-read"   \x1b[31m[#1 S3 public]\x1b[0m'] };
        }
        if (cmd.includes("0.0.0.0/0")) {
          return {
            lines: [
              'main.tf:66:    cidr_blocks = ["0.0.0.0/0"]   \x1b[31m[#2 SG ouvert]\x1b[0m',
              'main.tf:74:    cidr_blocks = ["0.0.0.0/0"]',
              'main.tf:81:    cidr_blocks = ["0.0.0.0/0"]',
            ],
          };
        }
        if (cmd.includes("encrypted")) {
          return { lines: ["main.tf:102:    encrypted   = false   \x1b[31m[#3 non chiffré]\x1b[0m"] };
        }
        if (/password|secret/i.test(cmd)) {
          return { lines: ['main.tf:127:  password = "Pr0d!Billing#2024"   \x1b[31m[#4 secret en dur]\x1b[0m'] };
        }
        if (cmd.includes("publicly_accessible")) {
          return { lines: ["main.tf:129:  publicly_accessible = true   \x1b[31m[#5 RDS publique]\x1b[0m"] };
        }
        return { lines: ["(aucune correspondance) — relisez les indices (help)."] };
      }

      if (cmd.includes("tf-audit.py")) {
        return {
          lines: [
            "=== Audit Terraform (offline) — pce-data-platform ===",
            "  \x1b[31m[FAIL] S3_PUBLIC\x1b[0m         acl = \"public-read\"",
            "  \x1b[31m[FAIL] SG_OPEN\x1b[0m           ingress cidr_blocks 0.0.0.0/0",
            "  \x1b[31m[FAIL] UNENCRYPTED\x1b[0m       encrypted = false + buckets sans SSE",
            "  \x1b[31m[FAIL] HARDCODED_SECRET\x1b[0m  password = \"Pr0d!Billing#2024\"",
            "  \x1b[31m[FAIL] RDS_PUBLIC\x1b[0m        publicly_accessible = true",
            "",
            "  Misconfigurations detectees : 5/5",
            "",
            "  [!] Les 5 categories de misconfiguration sont presentes.",
            `  Drapeau du lab : \x1b[32m${flag}\x1b[0m`,
            "",
            "Bien joué — copiez le flag et soumettez-le à droite.",
          ],
        };
      }

      return { lines: [`${cmd.split(" ")[0]}: commande non trouvée`] };
    },
  };
}
