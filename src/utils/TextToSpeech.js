// src/utils/TextToSpeech.js
import { VOICE_PERSONAS } from "./VoicePersonas";

export const speakQuestion = (text, personaId = "default", customRate = null) => {
  const persona = VOICE_PERSONAS.find(p => p.id === personaId) || VOICE_PERSONAS[0];
  const finalRate = customRate !== null ? customRate : persona.rate;

  stopSpeaking();

  if (!window.speechSynthesis) {
    console.warn("Text-to-Speech is not supported in this browser.");
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = persona.lang;
  utterance.rate = finalRate;
  utterance.pitch = persona.pitch;

  const voices = window.speechSynthesis.getVoices();
  let selectedVoice = voices.find(v => v.lang === persona.lang);
  if (!selectedVoice) selectedVoice = voices.find(v => v.lang.startsWith('ar'));
  if (selectedVoice) utterance.voice = selectedVoice;

  window.speechSynthesis.speak(utterance);
};

export const stopSpeaking = () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};
