// DealHawk's entry program (the make.fun grader runs this twice from the
// repository root, on Node 22, with no network and nothing installed).
// It hands the site in: it copies app/ and screenshots/ beside this file to
// /output and writes /output/dossier.json with the competition's own
// buildDossier, untouched in vendor/. Locally, MAKEFUN_OUTPUT_DIR stands in
// for /output: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

const here = fileURLToPath(new URL(".", import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

mkdirSync(out, { recursive: true });
cpSync(join(here, "app"), join(out, "app"), { recursive: true });
mkdirSync(join(out, "screenshots"), { recursive: true });
if (existsSync(join(here, "screenshots"))) {
  cpSync(join(here, "screenshots"), join(out, "screenshots"), { recursive: true });
}

// The scorer's caps: 4 screenshots at 256 KiB each, app/ at 993 entries and
// 16 MiB, dossier text at 160 KiB. buildDossier refuses anything past them,
// so one bad file fails here before submission, not in production.
writeFileSync(
  join(out, "dossier.json"),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 16777216,
  }),
);