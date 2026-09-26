import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { WebcastPushConnection } from 'tiktok-live-connector';
import WebSocket from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '.tiktok-config.json');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (err) {
    console.warn('Could not read .tiktok-config.json', err.message);
  }
  return {
    username: process.env.TIKTOK_USERNAME || 'ahmadtiktokspace',
    mode: 'auto', // auto | bridge | tikfinity
    tikfinityHost: process.env.TIKFINITY_HOST || '127.0.0.1',
    tikfinityPort: Number(process.env.TIKFINITY_PORT) || 21213,
  };
}

function saveConfig(partial) {
  const next = { ...status.config, ...partial };
  status.config = next;
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2));
  } catch (err) {
    console.warn('Could not save .tiktok-config.json', err.message);
  }
}

const status = {
  config: loadConfig(),
  bridgeOk: false,
  tiktokState: 'idle', // idle | connecting | live | offline | error
  source: 'none', // bridge | tikfinity | none
  roomId: null,
  lastError: null,
  bridgeFailCount: 0,
};

let tiktokConnection = null;
let tikfinitySocket = null;
let bridgeRetryTimer = null;
let tikfinityRetryTimer = null;
let manualDisconnect = false;
/** Last room-wide like total from TikTok — used to credit missed like events */
let lastRoomLikeTotal = null;
const MAX_BRIDGE_FAILS_BEFORE_FALLBACK = 2;

function broadcastStatus() {
  io.emit('tiktok:status', {
    username: status.config.username,
    mode: status.config.mode,
    tikfinityHost: status.config.tikfinityHost,
    tikfinityPort: status.config.tikfinityPort,
    bridgeOk: status.bridgeOk,
    tiktokState: status.tiktokState,
    source: status.source,
    roomId: status.roomId,
    lastError: status.lastError,
  });
}

function emitGameEvent(payload) {
  io.emit('tiktok-event', payload);
}

function clearBridgeRetry() {
  if (bridgeRetryTimer) {
    clearTimeout(bridgeRetryTimer);
    bridgeRetryTimer = null;
  }
}

function clearTikfinityRetry() {
  if (tikfinityRetryTimer) {
    clearTimeout(tikfinityRetryTimer);
    tikfinityRetryTimer = null;
  }
}

function destroyBridge() {
  clearBridgeRetry();
  lastRoomLikeTotal = null;
  if (tiktokConnection) {
    try {
      tiktokConnection.removeAllListeners();
      tiktokConnection.disconnect();
    } catch {
      /* ignore */
    }
    tiktokConnection = null;
  }
}

function destroyTikfinity() {
  clearTikfinityRetry();
  lastRoomLikeTotal = null;
  if (tikfinitySocket) {
    try {
      tikfinitySocket.removeAllListeners();
      tikfinitySocket.close();
    } catch {
      /* ignore */
    }
    tikfinitySocket = null;
  }
}

function normalizeUsername(raw) {
  return String(raw || '')
    .trim()
    .replace(/^@+/, '')
    .replace(/\s+/g, '');
}

// ── TikFinity event normalizer ──────────────────────────────────────────────
function pickUser(data = {}) {
  const user = data.user || data;
  return {
    userId: user.userId || user.id || data.userId || data.uniqueId || '',
    username: user.uniqueId || user.username || data.uniqueId || data.username || '',
    name: user.nickname || user.nickName || user.name || data.nickname || data.name || user.uniqueId || 'Viewer',
    avatar:
      user.profilePictureUrl ||
      user.avatar ||
      data.profilePictureUrl ||
      data.avatar ||
      (user.userAvatar?.avatarUrl?.[0]) ||
      '',
  };
}

function handleNormalizedChat(data) {
  const u = pickUser(data);
  const message = data.comment || data.message || data.text || '';
  if (!message) return;
  console.log(`💬 [CHAT/${status.source}] ${u.name}: ${message}`);
  emitGameEvent({
    type: 'chat',
    userId: u.userId || u.username,
    username: u.username,
    name: u.name,
    message,
    avatar: u.avatar,
  });
}

function handleNormalizedGift(data) {
  // Ignore intermediate combo clicks
  if ((data.giftType === 1 || data.gift?.gift_type === 1) && !data.repeatEnd) {
    return;
  }

  const u = pickUser(data);
  const giftName = data.giftName || data.gift?.name || data.name || '';
  const giftId = data.giftId || data.gift?.id || data.gift?.gift_id || '';
  const baseCost = Number(data.diamondCount ?? data.diamond_count ?? data.gift?.diamond_count ?? data.coins ?? 0) || 0;
  const comboAmount = Number(data.repeatCount || data.repeat_count || 1) || 1;
  const coins = baseCost * comboAmount;

  console.log(`🎁 [GIFT/${status.source}] ${u.name} sent ${giftName} (${coins} coins)`);
  emitGameEvent({
    type: 'gift',
    msgId: data.msgId || data.msg_id || `${u.userId}_${giftId}_${Date.now()}`,
    giftId,
    userId: u.userId || u.username,
    username: u.username,
    name: u.name,
    giftName,
    diamondCount: coins,
    coins,
    avatar: u.avatar,
  });
}

/**
 * TikTok only emits like events "from time to time" — not every tap.
 * Prefer room totalLikeCount deltas so jumps cover likes we never saw as events.
 * Never treat totalLikeCount itself as a single-event burst (that overcounts on connect).
 */
function extractLikeDelta(data) {
  const rawBurst = data.likeCount ?? data.like_count ?? data.count;
  const burst = Number(rawBurst);
  const hasBurst = Number.isFinite(burst) && burst > 0;

  const rawRoom =
    data.totalLikeCount ??
    data.total_like_count ??
    data.totalLike ??
    data.likeTotal;
  const roomTotal = Number(rawRoom);
  const hasRoom = Number.isFinite(roomTotal) && roomTotal >= 0;

  if (hasRoom) {
    if (lastRoomLikeTotal == null) {
      lastRoomLikeTotal = roomTotal;
      return hasBurst ? burst : 0;
    }
    if (roomTotal > lastRoomLikeTotal) {
      const delta = roomTotal - lastRoomLikeTotal;
      lastRoomLikeTotal = roomTotal;
      return delta;
    }
    if (roomTotal < lastRoomLikeTotal) {
      // Room counter reset (new live / reconnect) — re-baseline
      lastRoomLikeTotal = roomTotal;
      return hasBurst ? burst : 0;
    }
    // Room total unchanged — still credit this event's burst if present
    return hasBurst ? burst : 0;
  }

  return hasBurst ? burst : 1;
}

function handleNormalizedLike(data) {
  const u = pickUser(data);
  const count = extractLikeDelta(data);
  if (count <= 0) return;

  emitGameEvent({
    type: 'like',
    username: u.username,
    likeCount: count,
    count,
  });
}

function routeTikfinityPayload(raw) {
  let msg = raw;
  if (typeof raw === 'string') {
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
  }
  if (!msg || typeof msg !== 'object') return;

  // TikFinity Desktop Events API: { event, data } (same family as tiktok-live-connector)
  const eventName = String(msg.event || msg.type || msg.eventName || '').toLowerCase();
  const data = msg.data && typeof msg.data === 'object' ? msg.data : msg;

  if (eventName === 'chat' || eventName === 'comment' || data.comment) {
    handleNormalizedChat(data);
    return;
  }
  if (eventName === 'gift' || data.giftId || data.giftName || data.gift) {
    handleNormalizedGift(data);
    return;
  }
  if (eventName === 'like' || data.likeCount != null || data.like_count != null || data.totalLikeCount != null || data.total_like_count != null) {
    handleNormalizedLike(data);
  }
}

function connectTikfinity(reason = 'fallback') {
  if (manualDisconnect) return;
  if (status.config.mode === 'bridge') return;
  if (status.source === 'bridge' && status.tiktokState === 'live') return;

  destroyTikfinity();

  const host = status.config.tikfinityHost || '127.0.0.1';
  const port = Number(status.config.tikfinityPort) || 21213;
  const url = `ws://${host}:${port}/`;

  status.tiktokState = 'connecting';
  status.lastError = null;
  status.source = 'tikfinity';
  broadcastStatus();
  console.log(`🔁 TikFinity ${reason}: connecting to ${url}`);

  try {
    tikfinitySocket = new WebSocket(url);
  } catch (err) {
    status.tiktokState = 'error';
    status.lastError = err.message;
    status.source = 'none';
    broadcastStatus();
    scheduleTikfinityRetry();
    return;
  }

  tikfinitySocket.on('open', () => {
    console.log(`✅ TikFinity connected at ${url}`);
    status.tiktokState = 'live';
    status.source = 'tikfinity';
    status.lastError = null;
    status.roomId = null;
    broadcastStatus();
  });

  tikfinitySocket.on('message', (buf) => {
    const text = Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf);
    routeTikfinityPayload(text);
  });

  tikfinitySocket.on('close', () => {
    console.log('⚠️ TikFinity socket closed');
    if (status.source === 'tikfinity') {
      status.tiktokState = 'offline';
      broadcastStatus();
    }
    if (!manualDisconnect && status.config.mode !== 'bridge') {
      scheduleTikfinityRetry();
      // Also keep trying bridge if mode is auto
      if (status.config.mode === 'auto') scheduleBridgeRetry(5000);
    }
  });

  tikfinitySocket.on('error', (err) => {
    console.log(`❌ TikFinity error: ${err.message}`);
    status.lastError = `TikFinity: ${err.message}`;
    if (status.source === 'tikfinity') status.tiktokState = 'error';
    broadcastStatus();
  });
}

function scheduleTikfinityRetry(ms = 8000) {
  clearTikfinityRetry();
  if (manualDisconnect || status.config.mode === 'bridge') return;
  tikfinityRetryTimer = setTimeout(() => connectTikfinity('retry'), ms);
}

function scheduleBridgeRetry(ms = 10000) {
  clearBridgeRetry();
  if (manualDisconnect || status.config.mode === 'tikfinity') return;
  bridgeRetryTimer = setTimeout(() => connectBridge(), ms);
}

function maybeFallbackToTikfinity(errMsg) {
  status.bridgeFailCount += 1;
  status.lastError = errMsg || status.lastError;
  broadcastStatus();

  if (status.config.mode === 'bridge') {
    scheduleBridgeRetry();
    return;
  }

  if (
    status.config.mode === 'tikfinity' ||
    status.bridgeFailCount >= MAX_BRIDGE_FAILS_BEFORE_FALLBACK
  ) {
    console.log('↪️ Falling back to TikFinity Events API...');
    connectTikfinity('bridge-failed');
  } else {
    scheduleBridgeRetry();
  }
}

function connectBridge() {
  if (manualDisconnect) return;
  if (status.config.mode === 'tikfinity') {
    connectTikfinity('mode-tikfinity');
    return;
  }

  const username = normalizeUsername(status.config.username);
  if (!username) {
    status.tiktokState = 'error';
    status.lastError = 'Username is empty';
    broadcastStatus();
    return;
  }

  destroyBridge();
  // If currently on TikFinity and mode is bridge-only, drop it; in auto keep it until bridge is live
  if (status.config.mode === 'bridge') destroyTikfinity();

  status.tiktokState = 'connecting';
  status.lastError = null;
  broadcastStatus();
  console.log(`⏳ Bridge connecting to @${username}...`);

  tiktokConnection = new WebcastPushConnection(username);

  tiktokConnection.on('chat', (data) => {
    if (status.source === 'tikfinity') return; // avoid double while switching
    handleNormalizedChat(data);
  });

  tiktokConnection.on('gift', (data) => {
    if (status.source === 'tikfinity') return;
    handleNormalizedGift(data);
  });

  tiktokConnection.on('like', (data) => {
    if (status.source === 'tikfinity') return;
    handleNormalizedLike(data);
  });

  tiktokConnection.on('disconnected', () => {
    console.log('⚠️ TikTok bridge disconnected');
    if (status.source === 'bridge') {
      status.tiktokState = 'offline';
      status.source = 'none';
      broadcastStatus();
    }
    if (!manualDisconnect) maybeFallbackToTikfinity('Bridge disconnected');
  });

  tiktokConnection
    .connect()
    .then((state) => {
      console.log(`✅ BRIDGE LIVE: @${username} (Room ${state.roomId})`);
      status.bridgeFailCount = 0;
      status.tiktokState = 'live';
      status.source = 'bridge';
      status.roomId = state.roomId || null;
      status.lastError = null;
      // Prefer bridge — stop TikFinity to avoid double events
      destroyTikfinity();
      broadcastStatus();
    })
    .catch((err) => {
      console.log(`❌ Bridge offline: ${err?.message || err}`);
      status.tiktokState = 'offline';
      status.source = status.source === 'tikfinity' ? 'tikfinity' : 'none';
      maybeFallbackToTikfinity(err?.message || String(err));
    });
}

function startConnection() {
  manualDisconnect = false;
  status.bridgeFailCount = 0;
  if (status.config.mode === 'tikfinity') {
    destroyBridge();
    connectTikfinity('manual');
  } else {
    connectBridge();
  }
}

function stopConnection() {
  manualDisconnect = true;
  destroyBridge();
  destroyTikfinity();
  status.tiktokState = 'idle';
  status.source = 'none';
  status.roomId = null;
  broadcastStatus();
  console.log('⏹ Connection stopped by host');
}

const BRIDGE_PORT = Number(process.env.BRIDGE_PORT) || 4480;

// Health check for Node bridge tests (no browser / OBS needed)
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'trivia-game-bridge',
    port: BRIDGE_PORT,
    tiktokState: status.tiktokState,
    source: status.source,
    username: status.config.username,
    mode: status.config.mode,
    clients: io.engine?.clientsCount ?? 0,
    lastError: status.lastError,
  });
});

io.on('connection', (socket) => {
  status.bridgeOk = true;
  socket.emit('tiktok:status', {
    username: status.config.username,
    mode: status.config.mode,
    tikfinityHost: status.config.tikfinityHost,
    tikfinityPort: status.config.tikfinityPort,
    bridgeOk: true,
    tiktokState: status.tiktokState,
    source: status.source,
    roomId: status.roomId,
    lastError: status.lastError,
  });

  socket.on('tiktok:connect', (payload = {}) => {
    const username = normalizeUsername(payload.username ?? status.config.username);
    const mode = payload.mode || status.config.mode || 'auto';
    const tikfinityHost = payload.tikfinityHost || status.config.tikfinityHost || '127.0.0.1';
    const tikfinityPort = Number(payload.tikfinityPort || status.config.tikfinityPort || 21213);

    saveConfig({ username, mode, tikfinityHost, tikfinityPort });
    console.log(`🔌 Host requested connect @${username} mode=${mode}`);
    startConnection();
  });

  socket.on('tiktok:disconnect', () => {
    stopConnection();
  });

  socket.on('tiktok:status', () => {
    broadcastStatus();
  });

  socket.on('disconnect', () => {
    // bridgeOk reflects whether *any* client is connected; recompute lightly
    const count = io.engine?.clientsCount ?? 0;
    status.bridgeOk = count > 0;
  });
});

// Initial auto-connect on boot
startConnection();

server.listen(BRIDGE_PORT, () => {
  console.log(`🚀 Trivia Game Bridge on http://localhost:${BRIDGE_PORT}`);
  console.log(`   TikFinity fallback: ws://${status.config.tikfinityHost}:${status.config.tikfinityPort}/`);
});
