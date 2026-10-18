# Dynamic Text Overlay Sizing & Camera Orientation Implementation Plan

This plan outlines the enhancements to provide adaptive, density-aware typography for translated image overlays and orientation-aware camera controls with automatic rotation detection and manual override.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during Phase 1:
> - **Camera Orientation Switching**: Auto-detect device rotation (via `screen.orientation` and window aspect ratio) paired with a responsive quick manual toggle button directly in the camera viewfinder.
> - **Tight Bounding Box Typography**: Dynamic font scaling that calculates optimal font size based on bounding box area and text density, accompanied by a tap-to-expand card for complete reading comfort.
> - **Visual Overlay Aesthetic**: High-contrast navy blue badge (`#030712` / `bg-blue-950`) with crisp white borders, ensuring maximum legibility on both dark and bright photo backgrounds.

---

## 1. Overview & Core Concept

### What It Delivers
1. **Adaptive Font Scaling Engine**:
   - Detects the geometric dimensions of each text block's bounding box ($ymin, xmin, ymax, xmax$).
   - Calculates character count, word density, and available bounding area.
   - Dynamically scales font size (from micro-compact 8px up to bold 20px) and calculates line heights to fit within the box without overflow or awkward truncation.
   - Provides a tap-to-expand inspection card showing the original text, translated phrase, pronunciation guide, and read-aloud voice playback.

2. **Orientation-Aware Camera System**:
   - Supports both portrait (9:16 / 3:4) and landscape (16:9 / 4:3) capture modes.
   - Automatically synchronizes with device orientation changes while offering an accessible manual toggle button in the camera viewfinder.
   - Rotates viewfinder guides, capture triggers, and tooltips smoothly so users can capture wide signs, panoramic menus, and horizontal documents naturally.
   - Properly handles canvas image dimensions and aspect ratios when generating the capture frame for OCR analysis.

---

## 2. User Experience & Visual Design

### Key User Flows

```
[Camera Screen]
  ├── Viewfinder with orientation badge & manual toggle (Portrait ⟷ Landscape)
  ├── Guidance overlay adjusts framing guides for current orientation
  └── Snap Photo ──> Captures rotated/aspect-matched canvas snapshot

[Image Result Screen (Photo Overlay Mode)]
  ├── Render photo with bounded in-place translation badges
  ├── Each badge runs dynamic font scaling:
  │     ├── Long text in tight space (e.g., milk carton nutrition facts) -> scales down font cleanly
  │     ├── Short headings (e.g., "Exit", "Danger", "Menu") -> scales up to clear, bold display size
  │     └── Avoids awkward clipping with adaptive line clamping & balanced padding
  └── Tap on any badge:
        └── Smoothly highlights badge with golden amber ring and expands full inspection drawer at bottom
```

### Visual Identity & Styling
- **In-Place Overlay Badges**:
  - Background: Deep navy (`bg-blue-950/95` with subtle backdrop blur `backdrop-blur-xs`).
  - Border: 1.5px solid white border (`border-white/90`) with soft drop shadow (`shadow-md`).
  - Text: Crisp white (`text-white`) with high font weight (`font-extrabold`).
  - Selection State: Glowing amber ring (`ring-3 ring-amber-400 scale-105`) with elevated z-index.
- **Camera Controls**:
  - Translucent pill controls on top corners with clean iconography (`RotateCcw`, `Smartphone`).
  - Smooth 300ms CSS transforms on button icons when changing orientation between 0° and 90°.
  - Centered shutter button with haptic feedback vibration.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Canvas Math vs. DOM Scaling for Dynamic Text
- **Chosen Approach**: Hybrid DOM measurement and heuristic mathematical scaling. The component calculates a baseline font size based on bounding box width, height, and character count:
  $$\text{Target Font Size} = \text{clamp}\left(8\text{px}, \sqrt{\frac{\text{Width} \times \text{Height}}{\text{Length} \times 1.2}}, 18\text{px}\right)$$
- **Why**: Pure CSS cannot dynamically determine line-wrapping without layout thrashing. Mathematical estimation delivers instant, flicker-free rendering on initial load, while an inline ref validates overflow.
- **Alternatives Considered**: SVG `<text>` length-adjust was rejected due to font distortion (stretching/compressing letters unnaturally).

### Decision 2: In-App Camera Orientation vs. Locking to Native Device
- **Chosen Approach**: Auto-detection via `screen.orientation` and `window.matchMedia('(orientation: landscape)')`, supplemented by an in-viewfinder manual toggle button (`Portrait` / `Landscape`).
- **Why**: Web apps inside embedded iframes or standalone browser tabs may have locked orientation in system settings. Providing an in-UI toggle guarantees users can capture horizontal signs without wrestling with device auto-rotate locks.

---

## 4. Technical Architecture & Data Strategy

### Component Interaction Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        CameraView                            │
│  - Tracks orientation state ('portrait' | 'landscape')       │
│  - Listens to window resize & screen.orientation changes     │
│  - Manual toggle button rotates viewfinder UI & aspect ratio │
│  - takePhoto() paints matching canvas orientation            │
└──────────────────────────────┬───────────────────────────────┘
                               │ Base64 JPEG
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                    API: /api/translate-image                 │
│  - Detects text bounding boxes [ymin, xmin, ymax, xmax]      │
│  - Returns structured blocks with original & translated text │
└──────────────────────────────┬───────────────────────────────┘
                               │ ImageTranslationResult
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                       ImageOverlay                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                AdaptiveTextBlockOverlay                 │ │
│  │  - Computes optimal font-size & line-height             │ │
│  │  - Renders navy high-contrast container                 │ │
│  │  - Handles selection state & tap-to-inspect trigger     │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │               Selected Block Detail Card                │ │
│  │  - Full text, detected language, TTS audio trigger      │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### State & Event Flow
1. **CameraView State**:
   - `orientation`: `'portrait' | 'landscape'`
   - `streamWidth` / `streamHeight`: Resolution detected from video track settings.
   - `onToggleOrientation`: Rotates UI layout classes, updates camera constraint preferences (swapping ideal width/height if needed), and adjusts shutter button position.
2. **AdaptiveTextBlockOverlay State & Props**:
   - Computes `boxWidthPx` and `boxHeightPx` relative to container width/height.
   - Computes font size:
     - Short strings ($\le 12$ chars) in wide boxes: 14px–18px.
     - Medium strings ($13-40$ chars): 11px–14px.
     - Dense strings ($> 40$ chars) or narrow boxes: 8px–10px with tight line height.
   - Text alignment: Center aligned for short headers; left aligned with hyphenation for multi-line descriptive text.
   - Click toggles `selectedBlock` to open the bottom drawer card with speech pronunciation and enlarged text view.
