// Host trust / prize-mode helpers — PIN lock, answer hide, gift spoof gate.

const PIN_KEY = "trivia_host_pin";
const TRUST_KEY = "trivia_trust_mode";
const HIDE_ANSWERS_KEY = "trivia_hide_debug_answers";

/**
 * Module-private auth token (NOT Symbol.for — that is globally recoverable).
 * Host Debug triggers call triggerGiftLogic directly and never need this.
 * In trust mode, window.submitViewerGift is disabled entirely.
 */
const GIFT_SUBMIT_TOKEN = Symbol("pirate.giftSubmitToken");

/** @deprecated Prefer isTrustModeEnabled() + direct triggerGiftLogic for hosts. */
export function getHostGiftAuthToken() {
  return GIFT_SUBMIT_TOKEN;
}

export function isAuthorizedGiftSubmit(authToken) {
  return authToken === GIFT_SUBMIT_TOKEN;
}

export function getStoredHostPin() {
  return localStorage.getItem(PIN_KEY) || "";
}

export function setStoredHostPin(pin) {
  const clean = String(pin || "").trim();
  if (!clean) localStorage.removeItem(PIN_KEY);
  else localStorage.setItem(PIN_KEY, clean);
}

export function isTrustModeEnabled() {
  return localStorage.getItem(TRUST_KEY) === "true";
}

export function setTrustModeEnabled(on) {
  localStorage.setItem(TRUST_KEY, on ? "true" : "false");
}

export function shouldHideDebugAnswers() {
  if (isTrustModeEnabled()) return true;
  return localStorage.getItem(HIDE_ANSWERS_KEY) === "true";
}

export function setHideDebugAnswers(on) {
  localStorage.setItem(HIDE_ANSWERS_KEY, on ? "true" : "false");
}

export function verifyHostPin(attempt) {
  const stored = getStoredHostPin();
  if (!stored) return true;
  return String(attempt || "") === stored;
}
