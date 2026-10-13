// Creates BE/.env and FE/.env.local from their examples with one shared,
// random JWT_SECRET. The backend signs tokens with it and the frontend
// verifies them, so the two values must match.
// Safe to re-run: existing files are kept, and FE is re-synced to BE's secret.
import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const beEnv = join(root, "BE", ".env");
const feEnv = join(root, "FE", ".env.local");

function readSecret(file) {
  const match = readFileSync(file, "utf8").match(/^JWT_SECRET=(.*)$/m);
  return match?.[1].trim() ?? "";
}

function writeSecret(file, secret) {
  const text = readFileSync(file, "utf8");
  writeFileSync(
    file,
    /^JWT_SECRET=.*$/m.test(text)
      ? text.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`)
      : `${text.trimEnd()}\nJWT_SECRET=${secret}\n`,
  );
}

if (!existsSync(beEnv)) {
  copyFileSync(join(root, "BE", ".env.example"), beEnv);
  console.log("Created BE/.env");
}
let secret = readSecret(beEnv);
if (secret.length < 32) {
  secret = randomBytes(32).toString("hex");
  writeSecret(beEnv, secret);
  console.log("Generated JWT_SECRET in BE/.env");
}

if (!existsSync(feEnv)) {
  copyFileSync(join(root, "FE", ".env.example"), feEnv);
  console.log("Created FE/.env.local");
}
if (readSecret(feEnv) !== secret) {
  writeSecret(feEnv, secret);
  console.log("Copied JWT_SECRET to FE/.env.local");
}
console.log("Environment files are ready.");
