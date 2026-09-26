// src/hooks/useDonators.js
import { useState, useEffect, useCallback } from "react";
import {
  loadAllTimeDonators,
  saveAllTimeDonators,
  clearAllTimeDonators,
  normalizeDonatorRecord,
} from "../utils/gamePersistence";

export function useDonators() {
  const [allTimeDonators, setAllTimeDonators] = useState(loadAllTimeDonators);

  useEffect(() => {
    saveAllTimeDonators(allTimeDonators);
  }, [allTimeDonators]);

  const handleDeleteDonator = useCallback((id) => {
    setAllTimeDonators((prev) => {
      const next = prev.filter((d) => d.id !== id);
      saveAllTimeDonators(next);
      return next;
    });
  }, []);

  const handleRenameDonator = useCallback((id, newName) => {
    setAllTimeDonators((prev) => {
      const next = prev.map((d) =>
        d.id === id ? { ...normalizeDonatorRecord(d), name: newName } : d
      );
      saveAllTimeDonators(next);
      return next;
    });
  }, []);

  const trackDonation = useCallback((sender, coinValue = 0) => {
    if (!sender || !sender.id) return;

    const extractCoins = (val) => {
      if (!val) return 0;
      if (typeof val === "number") return val;
      if (typeof val === "string") return parseInt(val.replace(/\D/g, ""), 10) || 0;
      if (typeof val === "object") {
        return (
          extractCoins(val.diamondCount) ||
          extractCoins(val.diamond_count) ||
          extractCoins(val.diamonds) ||
          extractCoins(val.coins) ||
          extractCoins(val.gift) ||
          0
        );
      }
      return 0;
    };

    let safeCoinValue = extractCoins(coinValue);
    if (safeCoinValue === 0 && sender) safeCoinValue = extractCoins(sender);

    setAllTimeDonators((prev) => {
      const existing = prev.find((d) => d.id === sender.id);
      let next;
      if (existing) {
        next = prev
          .map((d) =>
            d.id === sender.id
              ? {
                  ...normalizeDonatorRecord(d),
                  score: (Number(d.score) || 0) + safeCoinValue,
                  avatar: sender.avatar || d.avatar,
                  name: sender.name || d.name,
                }
              : d
          )
          .sort((a, b) => b.score - a.score);
      } else {
        next = [
          ...prev,
          normalizeDonatorRecord({
            ...sender,
            score: safeCoinValue,
          }),
        ]
          .filter(Boolean)
          .sort((a, b) => b.score - a.score);
      }
      saveAllTimeDonators(next);
      return next;
    });
  }, []);

  const handleRefreshDonatorImages = useCallback(() => {
    setAllTimeDonators((prev) => {
      const next = prev.map((item) => ({
        ...item,
        avatar: `https://unavatar.io/tiktok/${item.id}`,
      }));
      saveAllTimeDonators(next);
      return next;
    });
  }, []);

  const handleClearAllDonators = useCallback(() => {
    setAllTimeDonators([]);
    clearAllTimeDonators();
  }, []);

  return {
    allTimeDonators,
    handleDeleteDonator,
    handleRenameDonator,
    trackDonation,
    handleRefreshDonatorImages,
    handleClearAllDonators,
  };
}
