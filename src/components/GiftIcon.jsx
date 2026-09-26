// src/components/GiftIcon.jsx — local PNG or offline letter chip (no CDN)
import React, { useState, memo } from "react";
import { findGiftDef, getGiftById, hasLocalGiftIcon } from "../utils/giftsConfig";

/**
 * Local gift PNG when available; otherwise a cheap offline letter chip.
 * Never calls ui-avatars / external CDNs (those were hanging Debug clicks).
 */
function GiftIcon({ giftId, size = 28, style, className, alt, title }) {
  const gift = findGiftDef(giftId) || getGiftById(giftId);
  const local = !!(gift && hasLocalGiftIcon(gift.id));
  const [failed, setFailed] = useState(false);
  const label = gift?.name || gift?.id || String(giftId || "?");
  const letter = String(label).trim().charAt(0).toUpperCase() || "?";

  if (local && !failed) {
    return (
      <img
        className={className}
        src={gift.icon}
        alt={alt || label}
        title={title || label}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        style={{
          width: size,
          height: size,
          minWidth: size,
          objectFit: "contain",
          ...style,
        }}
      />
    );
  }

  return (
    <span
      className={className}
      title={title || label}
      aria-label={alt || label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        minWidth: size,
        borderRadius: 6,
        background: "#fe2c55",
        color: "#fff",
        fontSize: Math.max(10, Math.round(size * 0.45)),
        fontWeight: 800,
        lineHeight: 1,
        userSelect: "none",
        ...style,
      }}
    >
      {letter}
    </span>
  );
}

export default memo(GiftIcon);
