export interface SampleImage {
  id: string;
  title: string;
  language: string;
  previewText: string;
  dataUrl: string;
}

// Generate high quality, clean SVG data URIs representing real foreign signs and notices
function createSignSvg(bg: string, textColor: string, mainText: string, subText: string, iconText: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg}"/>
        <stop offset="100%" stop-color="#051937"/>
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#g)" rx="24"/>
    <rect x="20" y="20" width="760" height="560" fill="none" stroke="${textColor}" stroke-width="8" stroke-dasharray="16 8" rx="20"/>
    <text x="400" y="160" font-family="system-ui, sans-serif" font-size="64" font-weight="900" fill="${textColor}" text-anchor="middle">${iconText}</text>
    <text x="400" y="290" font-family="system-ui, sans-serif" font-size="52" font-weight="bold" fill="${textColor}" text-anchor="middle">${mainText}</text>
    <text x="400" y="380" font-family="system-ui, sans-serif" font-size="34" font-weight="500" fill="#f8fafc" text-anchor="middle">${subText}</text>
    <rect x="180" y="440" width="440" height="70" rx="16" fill="${textColor}"/>
    <text x="400" y="488" font-family="system-ui, sans-serif" font-size="28" font-weight="bold" fill="#0f172a" text-anchor="middle">INFO / AVISO</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_IMAGES: SampleImage[] = [
  {
    id: 'spanish-exit',
    title: 'Spanish Emergency Exit',
    language: 'Spanish',
    previewText: 'SALIDA DE EMERGENCIA',
    dataUrl: createSignSvg('#064e3b', '#34d399', 'SALIDA DE EMERGENCIA', 'EMPUJE LA BARRA PARA ABRIR', '🚪 🏃'),
  },
  {
    id: 'japanese-menu',
    title: 'Japanese Restaurant Menu',
    language: 'Japanese',
    previewText: '本日の特製ラーメン (Special Ramen)',
    dataUrl: createSignSvg('#7f1d1d', '#fef08a', '本日の特製味噌ラーメン', '餃子セット • 半チャーハン付', '🍜 🥢'),
  },
  {
    id: 'french-station',
    title: 'French Station Notice',
    language: 'French',
    previewText: 'ATTENTION AU DÉPART',
    dataUrl: createSignSvg('#1e3a8a', '#93c5fd', 'ATTENTION AU DÉPART DU TRAIN', 'VOIE 4 • COMPORTEZ VOTRE BILLET', '🚆 ⚠️'),
  },
  {
    id: 'chinese-warning',
    title: 'Chinese Safety Notice',
    language: 'Mandarin Chinese',
    previewText: '小心地滑 请勿靠近',
    dataUrl: createSignSvg('#78350f', '#fde047', '小心地滑 • 请勿靠近', '正在清洁施工 • 请走旁边通道', '⚠️ 🚶'),
  },
];
