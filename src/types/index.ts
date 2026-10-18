export interface TextBlock {
  original: string;
  translated: string;
  /** [ymin, xmin, ymax, xmax] on a 0 - 1000 scale */
  box2d: [number, number, number, number];
}

export interface ImageTranslationResult {
  hasText: boolean;
  detectedLanguage: string;
  detectedLanguageCode?: string;
  targetLanguage: string;
  fullOriginalText: string;
  fullTranslatedText: string;
  summary: string;
  blocks: TextBlock[];
  imageSrc?: string;
}

export interface SpeechTranslationResult {
  hasSpeech: boolean;
  detectedLanguage: string;
  transcription: string;
  translation: string;
  pronunciationGuide?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  translation?: string;
  timestamp: number;
  detectedLanguage?: string;
  helpfulTip?: string;
  suggestedReply?: string;
}

export type ActiveScreen = 'home' | 'camera' | 'image-result' | 'speech' | 'conversation';
