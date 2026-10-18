export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  isPopularAsiaPacific?: boolean;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  // Common Asia-Pacific Languages
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', isPopularAsiaPacific: true },
  { code: 'zh', name: 'Mandarin Chinese', nativeName: '中文 (普通话)', flag: '🇨🇳', isPopularAsiaPacific: true },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾', isPopularAsiaPacific: true },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', isPopularAsiaPacific: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', isPopularAsiaPacific: true },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', isPopularAsiaPacific: true },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', isPopularAsiaPacific: true },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', isPopularAsiaPacific: true },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', isPopularAsiaPacific: true },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', isPopularAsiaPacific: true },
  { code: 'fil', name: 'Filipino / Tagalog', nativeName: 'Tagalog', flag: '🇵🇭', isPopularAsiaPacific: true },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', isPopularAsiaPacific: true },

  // Other Global Languages
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
];

export const DEFAULT_TARGET_LANGUAGE = 'English';
