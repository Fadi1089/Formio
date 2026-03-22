/* Load .env.local (then .env) before invoking Prisma CLI — same as src/loadEnv.ts */
const path = require("path");
const { spawnSync } = require("child_process");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const args = process.argv.slice(2);
const r = spawnSync("npx", ["prisma", ...args], {
  stdio: "inherit",
  env: process.env,
  cwd: path.join(__dirname, ".."),
  shell: process.platform === "win32",
});
process.exit(r.status ?? 1);
