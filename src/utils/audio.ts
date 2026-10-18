/**
 * Audio and Speech synthesis utility for accessibility
 */

let activeAudio: HTMLAudioElement | null = null;

export async function speakText(text: string, languageName?: string): Promise<void> {
  stopSpeaking();

  if (!text) return;

  try {
    // 1. Try server-side Gemini TTS first
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language: languageName }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.audioData) {
        const audioUrl = `data:${data.mimeType || 'audio/wav'};base64,${data.audioData}`;
        const audio = new Audio(audioUrl);
        activeAudio = audio;
        await audio.play();
        return;
      }
    }
  } catch (err) {
    console.warn('Backend TTS failed, falling back to browser SpeechSynthesis:', err);
  }

  // 2. Fallback to native browser SpeechSynthesis (works offline / low latency)
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower, very articulate for elderly listeners
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

export function stopSpeaking(): void {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Converts a Blob to a base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string) || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
