import { useCallback, useEffect, useState } from 'react';
import { useGame } from '../GameContext';

/** Síntesis de voz alemana con la Web Speech API del navegador (sin servicios externos). */
export function useSpeech() {
  const { state } = useGame();
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (!supported) return;
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      setVoice(voices.find((v) => v.lang === 'de-DE') ?? voices.find((v) => v.lang.startsWith('de')) ?? null);
    };
    pick();
    window.speechSynthesis.addEventListener('voiceschanged', pick);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', pick);
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE';
      if (voice) u.voice = voice;
      u.rate = state.settings.ttsRate;
      window.speechSynthesis.speak(u);
    },
    [supported, voice, state.settings.ttsRate],
  );

  return { speak, enabled: supported && state.settings.tts, supported };
}
