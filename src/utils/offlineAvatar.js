// Offline avatar / gift placeholder — never hits the network
export function offlineAvatarDataUri(name = "?", bg = "fe2c55", fg = "ffffff") {
  const letter = String(name || "?")
    .trim()
    .charAt(0)
    .toUpperCase() || "?";
  const safeBg = String(bg).replace(/[^a-fA-F0-9]/g, "").slice(0, 6) || "fe2c55";
  const safeFg = String(fg).replace(/[^a-fA-F0-9]/g, "").slice(0, 6) || "ffffff";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">` +
    `<rect fill="#${safeBg}" width="128" height="128" rx="20"/>` +
    `<text x="64" y="68" text-anchor="middle" fill="#${safeFg}" ` +
    `font-size="64" font-family="Segoe UI,Arial,sans-serif" font-weight="700">${letter}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Drop-in for <img onError> — stops retry loops and avoids CDN hangs. */
export function setImgOfflineFallback(imgEl, name, bg = "2ecc71") {
  if (!imgEl) return;
  imgEl.onerror = null;
  imgEl.src = offlineAvatarDataUri(name, bg);
}
