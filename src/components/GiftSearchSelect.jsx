// Fast gift picker for Debug — avoids sorting/rendering 1500 rows every click
import React, { useState, useMemo, useDeferredValue, memo } from "react";
import { getGiftById, TIKTOK_GIFTS, hasLocalGiftIcon, LOCAL_GIFT_ICON_IDS } from "../utils/giftsConfig";
import GiftIcon from "./GiftIcon";

const LOCAL_GIFTS = TIKTOK_GIFTS.filter((g) => LOCAL_GIFT_ICON_IDS.has(g.id));
const GIFT_RESULT_LIMIT = 40;

const GiftSearchSelect = memo(function GiftSearchSelect({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const selectedGift = useMemo(
    () => TIKTOK_GIFTS.find((g) => g.id === value) || getGiftById(value) || LOCAL_GIFTS[0],
    [value]
  );

  const options = useMemo(() => {
    if (!isOpen) return [];
    const q = deferredSearch.trim().toLowerCase();
    if (!q) {
      const base = [...LOCAL_GIFTS];
      if (selectedGift && !LOCAL_GIFT_ICON_IDS.has(selectedGift.id)) {
        base.unshift(selectedGift);
      }
      return base.slice(0, GIFT_RESULT_LIMIT);
    }
    if (q.length < 2) {
      // Require 2 chars before scanning the full catalog
      return LOCAL_GIFTS.filter(
        (g) => g.name.toLowerCase().includes(q) || g.id.toLowerCase().includes(q)
      ).slice(0, GIFT_RESULT_LIMIT);
    }
    const out = [];
    for (const g of TIKTOK_GIFTS) {
      if (g.name.toLowerCase().includes(q) || g.id.toLowerCase().includes(q)) {
        out.push(g);
        if (out.length >= GIFT_RESULT_LIMIT) break;
      }
    }
    return out;
  }, [isOpen, deferredSearch, selectedGift]);

  return (
    <div style={{ position: "relative", width: "110px" }} onMouseLeave={() => setIsOpen(false)}>
      <div
        onClick={() => setIsOpen((o) => !o)}
        style={{
          background: "#111",
          color: "#fff",
          border: "1px solid #555",
          padding: "4px",
          borderRadius: "4px",
          fontSize: "11px",
          cursor: "pointer",
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <GiftIcon giftId={selectedGift?.id || value} size={18} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {selectedGift?.name || "اختر"}
        </span>
      </div>
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            width: "220px",
            background: "#222",
            border: "1px solid #555",
            borderRadius: "4px",
            zIndex: 10000,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 5px 15px rgba(0,0,0,0.9)",
            direction: "rtl",
          }}
        >
          <input
            id="gift-search-input"
            name="giftSearchInput"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 اكتب حرفين للبحث..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "6px",
              background: "#111",
              color: "#fff",
              border: "none",
              borderBottom: "1px solid #555",
              fontSize: "11px",
              outline: "none",
              borderRadius: "4px 4px 0 0",
            }}
          />
          <div style={{ maxHeight: "180px", overflowY: "auto" }}>
            {options.length === 0 ? (
              <div style={{ padding: "8px", fontSize: "10px", color: "#888" }}>
                لا نتائج — اكتب حرفين على الأقل
              </div>
            ) : (
              options.map((g) => (
                <div
                  key={g.id}
                  onClick={() => {
                    onChange(g.id);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  style={{
                    padding: "6px",
                    fontSize: "11px",
                    color: "#ccc",
                    cursor: "pointer",
                    borderBottom: "1px solid #333",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <GiftIcon giftId={g.id} size={20} />
                  <span style={{ flex: 1 }}>{g.name}</span>
                  {!hasLocalGiftIcon(g.id) && (
                    <span style={{ fontSize: "9px", color: "#888" }}>بديل</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default GiftSearchSelect;
