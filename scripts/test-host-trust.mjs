/**
 * Unit checks for hostTrust PIN / trust flags / gift auth token.
 */
class MemoryStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    this.map.set(String(key), String(value));
  }
  removeItem(key) {
    this.map.delete(String(key));
  }
  clear() {
    this.map.clear();
  }
}

globalThis.localStorage = new MemoryStorage();

const {
  getStoredHostPin,
  setStoredHostPin,
  verifyHostPin,
  isTrustModeEnabled,
  setTrustModeEnabled,
  shouldHideDebugAnswers,
  setHideDebugAnswers,
  getHostGiftAuthToken,
  isAuthorizedGiftSubmit,
} = await import("../src/utils/hostTrust.js");

let failed = 0;
const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  failed += 1;
};
const ok = (msg) => console.log(`OK:   ${msg}`);

// No PIN → open
if (!verifyHostPin("anything")) fail("empty PIN should allow");
else ok("empty PIN allows entry");

setStoredHostPin("1234");
if (getStoredHostPin() !== "1234") fail("PIN store");
else ok("PIN stored");
if (!verifyHostPin("1234")) fail("correct PIN");
else ok("correct PIN verifies");
if (verifyHostPin("9999")) fail("wrong PIN should fail");
else ok("wrong PIN rejected");

setStoredHostPin("");
if (getStoredHostPin() !== "") fail("clear PIN");
else ok("PIN cleared");

setTrustModeEnabled(true);
if (!isTrustModeEnabled()) fail("trust on");
else ok("trust mode on");
if (!shouldHideDebugAnswers()) fail("trust forces hide answers");
else ok("trust forces hide answers");

setTrustModeEnabled(false);
setHideDebugAnswers(true);
if (!shouldHideDebugAnswers()) fail("manual hide answers");
else ok("manual hide answers");
setHideDebugAnswers(false);

// Token must NOT be recoverable via Symbol.for
const token = getHostGiftAuthToken();
if (typeof token !== "symbol") fail("token is symbol");
else ok("auth token is Symbol");

if (Symbol.for("pirate.giftSubmitToken") === token) {
  fail("token must not be Symbol.for (console-recoverable)");
} else ok("token is not Symbol.for");

if (!isAuthorizedGiftSubmit(token)) fail("valid token authorized");
else ok("valid token authorized");
if (isAuthorizedGiftSubmit(Symbol.for("pirate.giftSubmitToken"))) {
  fail("Symbol.for spoof must not authorize");
} else ok("Symbol.for spoof rejected");
if (isAuthorizedGiftSubmit(undefined) || isAuthorizedGiftSubmit("secret")) {
  fail("junk auth rejected");
} else ok("junk auth rejected");

if (failed > 0) {
  console.error(`\n${failed} host-trust test(s) failed`);
  process.exit(1);
}
console.log("\nAll host-trust tests passed");
