#!/usr/bin/env node
/**
 * Bridge server smoke test — requires server.js already running on :4480.
 * No browser. No OBS. Does NOT force a TikTok LIVE connect (safe during dry runs).
 *
 * Terminal 1:  npm run bridge
 * Terminal 2:  npm run test:bridge
 *
 * After updating server.js, restart the bridge once so GET /health exists.
 */
import { io } from "socket.io-client";

const BRIDGE_URL = process.env.VITE_BRIDGE_URL || process.env.BRIDGE_URL || "http://localhost:4480";
const TIMEOUT_MS = Number(process.env.BRIDGE_TEST_TIMEOUT_MS) || 8000;

let failed = 0;
const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  failed += 1;
};
const ok = (msg) => console.log(`OK:   ${msg}`);
const warn = (msg) => console.log(`WARN: ${msg}`);

function withTimeout(promise, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${TIMEOUT_MS}ms: ${label}`)), TIMEOUT_MS)
    ),
  ]);
}

async function testHealthHttp() {
  let res;
  try {
    res = await withTimeout(fetch(`${BRIDGE_URL}/health`), "GET /health");
  } catch (err) {
    fail(`Cannot reach ${BRIDGE_URL} — is the server running? (${err.message})`);
    console.error("\nStart it first in another terminal:");
    console.error("  npm run bridge");
    console.error("Then re-run:");
    console.error("  npm run test:bridge\n");
    return { reachable: false, healthOk: false };
  }

  if (res.status === 404) {
    warn("GET /health → 404 (old server still running — restart: npm run bridge)");
    return { reachable: true, healthOk: false };
  }

  if (!res.ok) {
    fail(`GET /health status ${res.status}`);
    return { reachable: true, healthOk: false };
  }

  const body = await res.json();
  if (!body.ok) fail("/health body.ok is not true");
  else ok("GET /health → ok");

  if (body.service !== "trivia-game-bridge") fail(`unexpected service: ${body.service}`);
  else ok("service = trivia-game-bridge");

  if (typeof body.tiktokState !== "string") fail("missing tiktokState");
  else ok(`tiktokState = ${body.tiktokState}`);

  return { reachable: true, healthOk: true, body };
}

async function testSocketIo() {
  const socket = io(BRIDGE_URL, {
    transports: ["websocket", "polling"],
    timeout: TIMEOUT_MS,
    reconnection: false,
  });

  try {
    await withTimeout(
      new Promise((resolve, reject) => {
        socket.on("connect", resolve);
        socket.on("connect_error", (err) => reject(err));
      }),
      "socket.io connect"
    );
    ok(`Socket.IO connected (${socket.id})`);

    const firstStatus = await withTimeout(
      new Promise((resolve) => {
        socket.once("tiktok:status", resolve);
      }),
      "first tiktok:status"
    );

    const required = ["username", "mode", "bridgeOk", "tiktokState", "source"];
    let missing = false;
    for (const key of required) {
      if (!(key in firstStatus)) {
        fail(`status missing field: ${key}`);
        missing = true;
      }
    }
    if (!missing) {
      ok(
        `status payload: user=@${firstStatus.username || "?"} mode=${firstStatus.mode} state=${firstStatus.tiktokState} source=${firstStatus.source}`
      );
    }

    const refreshed = await withTimeout(
      new Promise((resolve) => {
        socket.once("tiktok:status", resolve);
        socket.emit("tiktok:status");
      }),
      "tiktok:status request"
    );
    if (!refreshed || typeof refreshed.tiktokState !== "string") {
      fail("status refresh failed");
    } else ok("tiktok:status request → reply");
  } catch (err) {
    fail(err.message || String(err));
  } finally {
    socket.disconnect();
  }
}

console.log(`\nBridge server test → ${BRIDGE_URL}\n`);

const health = await testHealthHttp();
if (health.reachable) {
  await testSocketIo();
}

if (failed > 0) {
  console.error(`\n${failed} bridge test(s) failed`);
  process.exit(1);
}
console.log("\nAll bridge server tests passed (no browser / OBS needed).");
if (!health.healthOk) {
  console.log("Tip: restart npm run bridge once to enable GET /health.");
}
process.exit(0);
