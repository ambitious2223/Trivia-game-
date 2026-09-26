/**
 * One-click host start: TikTok bridge (server.js) + Vite dev server.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

function run(cmd, args, label) {
  const child = spawn(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: isWin,
    env: process.env,
  });
  child.on("exit", (code, signal) => {
    console.log(`[${label}] exited code=${code} signal=${signal || ""}`);
  });
  return child;
}

console.log("Starting Trivia Game bridge + Vite from", root);
const bridge = run("node", ["server.js"], "bridge");
const vite = run("npm", ["run", "dev"], "vite");

const shutdown = () => {
  try { bridge.kill("SIGTERM"); } catch { /* ignore */ }
  try { vite.kill("SIGTERM"); } catch { /* ignore */ }
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
