// src/utils/Sounds.js

const DEFAULT_AUDIO_CONFIG = {
  sfxVolume: 0.6,
  musicVolume: 0.25, 
  sfxMuted: false,
  musicMuted: false,
  individualVolumes: {
    correct: 1.0, wrong: 1.0, drumroll: 1.0, win: 1.0, sabotage: 1.0, steal: 1.0,
    revive: 1.0, fever: 1.0, dragon: 1.0, reroll: 1.0, spin: 1.0, vip: 1.0,
    addTime: 1.0, timerWarning: 1.0, airhorn: 1.0, coins: 1.0, gong: 1.0
  }
};

const savedAudioConfig = localStorage.getItem("trivia_audio_settings");
let parsedAudio = null;
try {
  parsedAudio = savedAudioConfig ? JSON.parse(savedAudioConfig) : null;
} catch {
  parsedAudio = null;
  try { localStorage.removeItem("trivia_audio_settings"); } catch { /* ignore */ }
}
export const AudioConfig = parsedAudio && typeof parsedAudio === "object"
  ? {
      ...DEFAULT_AUDIO_CONFIG,
      ...parsedAudio,
      individualVolumes: {
        ...DEFAULT_AUDIO_CONFIG.individualVolumes,
        ...(parsedAudio.individualVolumes || {}),
      },
    }
  : { ...DEFAULT_AUDIO_CONFIG, individualVolumes: { ...DEFAULT_AUDIO_CONFIG.individualVolumes } };

let activeSfx = []; 
let currentMusic = null; 
let musicIndex = 0;
let duckingSources = new Set();
let musicFadeInterval = null; 
let userUnlockedAudio = false;

const lastPlayed = {}; 
const SPAM_THROTTLE_MS = 200; 

const QUESTION_MUSIC = [
  "/sounds/questionglobal.mp3"
];
const VOTING_MUSIC = "/sounds/votingbackground.mp3";

export const SOUNDS = {
  correct: "/sounds/correct%20answer.mp3",
  wrong: "/sounds/wronganswer.mp3",
  drumroll: "/sounds/snare_drum_roll.mp3",
  win: "/sounds/roundwin.mp3", sabotage: "/sounds/sabotageblur.mp3",
  steal: "/sounds/stealingpoints.mp3", revive: "/sounds/reviveandaddhaerts.mp3",
  fever: "/sounds/2xfever.mp3", dragon: "/sounds/5050dragon.mp3",
  reroll: "/sounds/questionreroll.mp3", spin: "/sounds/spincatagories.mp3",
  vip: "/sounds/sponsorvip.mp3", addTime: "/sounds/addtime.mp3",
  timerWarning: "/sounds/endoftimertocut.mp3", airhorn: "/sounds/airhorn.mp3",       
  coins: "/sounds/coins.mp3", gong: "/sounds/gong.mp3",             
};

/** Call once after a real user gesture. Nothing plays before this. */
export const unlockAudio = () => {
  userUnlockedAudio = true;
};

export const isAudioUnlocked = () => userUnlockedAudio;

/** Hard stop — music + every SFX. Safe on idle / mount. */
export const stopAllAudio = () => {
  clearInterval(musicFadeInterval);
  musicFadeInterval = null;

  if (currentMusic) {
    try {
      currentMusic.onpause = null;
      currentMusic.onended = null;
      currentMusic.pause();
      currentMusic.src = "";
    } catch { /* ignore */ }
    currentMusic = null;
  }

  activeSfx.forEach((audioObj) => {
    try {
      audioObj.onpause = null;
      audioObj.onended = null;
      audioObj.pause();
      audioObj.currentTime = 0;
    } catch { /* ignore */ }
  });
  activeSfx = [];
  duckingSources.clear();
};

export const preloadAllAudio = () => {
  // Prefetch only — never call play()
  const allUrls = [...Object.values(SOUNDS), ...QUESTION_MUSIC, VOTING_MUSIC];
  allUrls.forEach((url) => {
    try {
      const a = new Audio();
      a.preload = "auto";
      a.src = url;
    } catch { /* ignore */ }
  });
};

const getTargetMusicVolume = () => {
  if (AudioConfig.musicMuted) return 0;
  return duckingSources.size > 0 ? AudioConfig.musicVolume * 0.15 : AudioConfig.musicVolume;
};

const applySmoothMusicVolume = () => {
  if (!currentMusic) return;
  clearInterval(musicFadeInterval);
  
  musicFadeInterval = setInterval(() => {
    if (!currentMusic) { clearInterval(musicFadeInterval); return; }
    
    const target = getTargetMusicVolume();
    const current = currentMusic.volume;
    const diff = target - current;
    
    if (Math.abs(diff) < 0.02) {
      currentMusic.volume = target;
      clearInterval(musicFadeInterval);
    } else {
      const nextVol = current + (diff > 0 ? 0.02 : -0.02);
      currentMusic.volume = Math.max(0, Math.min(1, nextVol)); 
    }
  }, 30);
};

const handleSfxEnd = (audio) => {
  duckingSources.delete(audio);
  
  const index = activeSfx.indexOf(audio);
  if (index > -1) {
    activeSfx.splice(index, 1);
  }
  
  applySmoothMusicVolume(); 
};

export const updateAudioSettings = (settings) => {
  Object.assign(AudioConfig, settings);
  localStorage.setItem("trivia_audio_settings", JSON.stringify(AudioConfig));
  
  if (currentMusic) currentMusic.volume = getTargetMusicVolume();
  
  activeSfx = activeSfx.filter(audio => !audio.ended);
  activeSfx.forEach(audio => {
    const key = audio.datasetKey; 
    const indVol = key && AudioConfig.individualVolumes[key] !== undefined ? AudioConfig.individualVolumes[key] : 1.0;
    audio.volume = AudioConfig.sfxMuted ? 0 : (AudioConfig.sfxVolume * indVol);
  });
};

export const playSound = (url) => {
  if (!userUnlockedAudio) return;
  if (!url || AudioConfig.sfxMuted) return;

  const now = Date.now();
  if (lastPlayed[url] && now - lastPlayed[url] < SPAM_THROTTLE_MS) return; 
  lastPlayed[url] = now;

  const key = Object.keys(SOUNDS).find(k => SOUNDS[k] === url);
  const indVol = key && AudioConfig.individualVolumes[key] !== undefined ? AudioConfig.individualVolumes[key] : 1.0;

  const audio = new Audio(url);
  audio.datasetKey = key; 
  audio.volume = AudioConfig.sfxVolume * indVol; 
  
  activeSfx.push(audio);
  duckingSources.add(audio);
  applySmoothMusicVolume(); 

  audio.onended = () => handleSfxEnd(audio);
  audio.onpause = () => handleSfxEnd(audio);

  audio.play().catch(() => {
    handleSfxEnd(audio); 
  });
};

export const playEpicWinSound = () => { playSound(SOUNDS.win); };

export const playQuestionMusic = () => {
  if (!userUnlockedAudio || AudioConfig.musicMuted) return;
  if (currentMusic && currentMusic.src.includes("questionglobal") && !currentMusic.paused) return;

  if (currentMusic) { currentMusic.pause(); currentMusic.src = ""; }
  currentMusic = new Audio(QUESTION_MUSIC[musicIndex]);
  currentMusic.loop = true; 
  currentMusic.volume = getTargetMusicVolume();
  currentMusic.play().catch(() => {});
  musicIndex = (musicIndex + 1) % QUESTION_MUSIC.length;
};

export const playVotingMusic = () => {
  if (!userUnlockedAudio || AudioConfig.musicMuted) return;
  if (currentMusic && currentMusic.src.includes("votingbackground") && !currentMusic.paused) return;

  if (currentMusic) { currentMusic.pause(); currentMusic.src = ""; }
  currentMusic = new Audio(VOTING_MUSIC);
  currentMusic.loop = true;
  currentMusic.volume = getTargetMusicVolume();
  currentMusic.play().catch(() => {});
};

export const stopMusic = () => {
  clearInterval(musicFadeInterval);
  musicFadeInterval = null;
  if (currentMusic) {
    try {
      currentMusic.onpause = null;
      currentMusic.pause();
      currentMusic.src = "";
    } catch { /* ignore */ }
    currentMusic = null;
  }
};

export const stopSound = (url) => {
  const soundsToStop = activeSfx.filter(audio => audio.src.endsWith(url) || SOUNDS[audio.datasetKey] === url);
  
  soundsToStop.forEach(audioObj => {
    audioObj.onpause = null;
    audioObj.pause(); 
    audioObj.currentTime = 0; 
    handleSfxEnd(audioObj);
  });
};

export function crossfadeToNewMusic(newMusicUrl, duration = 1.0) {
  if (!userUnlockedAudio) return;
  if (!currentMusic) {
    // Do NOT fall back to voting music on idle — only play the requested URL
    if (!newMusicUrl) return;
    currentMusic = new Audio(newMusicUrl);
    currentMusic.loop = true;
    currentMusic.volume = getTargetMusicVolume();
    currentMusic.play().catch(() => {});
    return;
  }
  const oldMusic = currentMusic;
  const fadeOut = setInterval(() => {
    if (oldMusic.volume <= 0.05) {
      oldMusic.pause();
      oldMusic.src = "";
      clearInterval(fadeOut);
      if (newMusicUrl) {
        currentMusic = new Audio(newMusicUrl);
        currentMusic.loop = true;
        currentMusic.volume = getTargetMusicVolume();
        currentMusic.play().catch(() => {});
      } else {
        currentMusic = null;
      }
    } else {
      oldMusic.volume -= 0.05;
    }
  }, duration * 20);
}
