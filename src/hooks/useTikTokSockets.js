// src/hooks/useTikTokSockets.js
import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const BRIDGE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_BRIDGE_URL) ||
  "http://localhost:4480";

const DEFAULT_STATUS = {
  username: "",
  mode: "auto",
  tikfinityHost: "127.0.0.1",
  tikfinityPort: 21213,
  bridgeOk: false,
  tiktokState: "idle",
  source: "none",
  roomId: null,
  lastError: null,
};

export function useTikTokSockets({ onChatBatch, onGiftBatch, onLikeBatch, onConnect, onStatus }) {
  const chatQueue = useRef([]);
  const giftQueue = useRef([]);
  const likeQueue = useRef([]);
  const flushTimeout = useRef(null);
  const socketRef = useRef(null);

  const callbacksRef = useRef({ onChatBatch, onGiftBatch, onLikeBatch, onConnect, onStatus });
  const [connectionStatus, setConnectionStatus] = useState(DEFAULT_STATUS);
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    callbacksRef.current = { onChatBatch, onGiftBatch, onLikeBatch, onConnect, onStatus };
  });

  useEffect(() => {
    const socket = io(BRIDGE_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    const flushQueues = () => {
      if (chatQueue.current.length && callbacksRef.current.onChatBatch) {
        callbacksRef.current.onChatBatch([...chatQueue.current]);
        chatQueue.current = [];
      }
      if (giftQueue.current.length && callbacksRef.current.onGiftBatch) {
        callbacksRef.current.onGiftBatch([...giftQueue.current]);
        giftQueue.current = [];
      }
      if (likeQueue.current.length && callbacksRef.current.onLikeBatch) {
        callbacksRef.current.onLikeBatch([...likeQueue.current]);
        likeQueue.current = [];
      }
      flushTimeout.current = null;
    };

    const scheduleFlush = () => {
      if (!flushTimeout.current) flushTimeout.current = setTimeout(flushQueues, 300);
    };

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("tiktok:status");
      if (callbacksRef.current.onConnect) callbacksRef.current.onConnect();
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
      setConnectionStatus((prev) => ({ ...prev, bridgeOk: false }));
    });

    socket.on("tiktok:status", (data) => {
      const next = { ...DEFAULT_STATUS, ...data, bridgeOk: socket.connected };
      setConnectionStatus(next);
      if (callbacksRef.current.onStatus) callbacksRef.current.onStatus(next);
    });

    socket.on("tiktok-event", (data) => {
      if (data.type === "chat") chatQueue.current.push(data);
      else if (data.type === "gift") giftQueue.current.push(data);
      else if (data.type === "like") likeQueue.current.push(data);
      scheduleFlush();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      if (flushTimeout.current) clearTimeout(flushTimeout.current);
    };
  }, []);

  const connectTikTok = useCallback((opts = {}) => {
    socketRef.current?.emit("tiktok:connect", opts);
  }, []);

  const disconnectTikTok = useCallback(() => {
    socketRef.current?.emit("tiktok:disconnect");
  }, []);

  const requestStatus = useCallback(() => {
    socketRef.current?.emit("tiktok:status");
  }, []);

  return {
    connectionStatus,
    socketConnected,
    connectTikTok,
    disconnectTikTok,
    requestStatus,
  };
}
