import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Dev server and app container must run on port 3000
const PORT = 3000;

// Generous body limit for image and audio data URLs
app.use(express.json({ limit: '35mb' }));

const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(apiKey),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Resilient wrapper around ai.models.generateContent that handles transient 503 spikes
 * and 429 quota limits across multiple model alternatives
 */
async function generateWithRetry(client: GoogleGenAI, requestPayload: any, preferredModel = 'gemini-3.5-flash-lite') {
  const modelsToTry = Array.from(
    new Set([
      preferredModel,
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-flash-lite-latest',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-3.8-flash',
    ])
  );
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const res = await client.models.generateContent({
        ...requestPayload,
        model,
      });
      return res;
    } catch (err: any) {
      lastError = err;
      const errorMsg = String(err?.message || '');
      const status = err?.status;

      const isRecoverable =
        status === 429 ||
        status === 503 ||
        status === 500 ||
        errorMsg.includes('429') ||
        errorMsg.includes('RESOURCE_EXHAUSTED') ||
        errorMsg.includes('quota') ||
        errorMsg.includes('rate-limit') ||
        errorMsg.includes('503') ||
        errorMsg.includes('high demand') ||
        errorMsg.includes('UNAVAILABLE') ||
        errorMsg.includes('500');

      if (isRecoverable) {
        console.warn(`Model ${model} rate-limited or unavailable (${status || 'error'}). Trying next fallback model...`);
        await new Promise((resolve) => setTimeout(resolve, 600));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

/**
 * 1. Image Translation API
 * Extracts text, detects language, finds bounding boxes, translates to target language
 */
app.post('/api/translate-image', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', targetLanguage = 'English' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Please provide an image to translate.' });
    }

    if (!ai) {
      return res.status(500).json({ error: 'Gemini API key is not configured.' });
    }

    let cleanBase64 = imageBase64;
    let effectiveMimeType = mimeType || 'image/jpeg';

    const commaIdx = imageBase64.indexOf(',');
    if (commaIdx !== -1) {
      const header = imageBase64.slice(0, commaIdx);
      const mimeMatch = header.match(/^data:(image\/[^;]+)/i);
      if (mimeMatch) effectiveMimeType = mimeMatch[1].toLowerCase().trim();
      cleanBase64 = imageBase64.slice(commaIdx + 1);
    } else {
      cleanBase64 = imageBase64;
    }

    cleanBase64 = cleanBase64.replace(/\s/g, '');

    const prompt = `You are an expert OCR, accessibility, and translation specialist.
Analyze this image carefully. It may contain a sign, menu, product label, notice, document, packaging, or public transport notice.
1. Determine if there is any visible text in the image.
2. Identify the predominant source language (and any other languages present).
3. Extract each distinct text block/phrase.
4. For each block, provide:
   - "original": the exact extracted text in the original language.
   - "translated": accurate, natural translation into ${targetLanguage}. Keep it easy to understand for elderly people and travellers.
   - "box2d": estimated bounding box of this text block as [ymin, xmin, ymax, xmax] on a 0 to 1000 normalized coordinate system (where 0,0 is top-left and 1000,1000 is bottom-right).
5. Provide "fullOriginalText" containing all extracted text in reading order.
6. Provide "fullTranslatedText" containing the complete translation in ${targetLanguage}.
7. Provide a brief, warm 1-2 sentence "summary" or "explanation" in plain ${targetLanguage} explaining what this sign or item actually means (e.g. "This is an exit sign directing people to the stairs" or "This is a restaurant menu listing spicy noodle dishes").
If no readable text is detected, set hasText to false, detectedLanguage to "Unknown", and empty arrays.`;

    const response = await generateWithRetry(ai, {
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: effectiveMimeType,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasText: { type: Type.BOOLEAN, description: 'True if readable text is found in image' },
            detectedLanguage: { type: Type.STRING, description: 'Name of the detected language, e.g. Spanish, Japanese' },
            detectedLanguageCode: { type: Type.STRING, description: 'ISO code e.g. es, ja, zh, fr' },
            targetLanguage: { type: Type.STRING, description: 'Target translation language' },
            fullOriginalText: { type: Type.STRING, description: 'All detected text concatenated' },
            fullTranslatedText: { type: Type.STRING, description: 'Full translated text' },
            summary: { type: Type.STRING, description: 'Simple plain-language explanation of what this sign/item means' },
            blocks: {
              type: Type.ARRAY,
              description: 'Individual text blocks with their positions and translations',
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  translated: { type: Type.STRING },
                  box2d: {
                    type: Type.ARRAY,
                    description: '[ymin, xmin, ymax, xmax] normalized 0-1000',
                    items: { type: Type.INTEGER },
                  },
                },
                required: ['original', 'translated', 'box2d'],
              },
            },
          },
          required: ['hasText', 'detectedLanguage', 'fullOriginalText', 'fullTranslatedText', 'summary', 'blocks'],
        },
      },
    }, 'gemini-3.5-flash-lite');

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error('No response received from vision model');
    }

    const parsed = JSON.parse(textOutput);
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/translate-image:', error);
    const errorMsg = String(error?.message || '');
    let userMsg = 'Something went wrong while analysing the image. Please try again with a clearer photo.';
    if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
      userMsg = 'Translation service is momentarily busy. Please wait a few seconds and try again.';
    } else if (errorMsg.includes('503') || errorMsg.includes('high demand') || errorMsg.includes('UNAVAILABLE')) {
      userMsg = 'Image translation service is temporarily busy. Please tap again in a moment.';
    }
    return res.status(500).json({
      error: userMsg,
      details: error?.message,
    });
  }
});

/**
 * 2. Speech Translation API
 * Transcribes audio, detects spoken language, and translates to target language
 */
app.post('/api/translate-speech', async (req: Request, res: Response) => {
  try {
    const {
      audioBase64,
      mimeType = 'audio/webm',
      targetLanguage = 'English',
      clientTranscript = '',
    } = req.body;

    if (!audioBase64 && !clientTranscript) {
      return res.status(400).json({ error: 'Please provide audio data or speech transcript to translate.' });
    }

    if (!ai) {
      return res.status(500).json({ error: 'Gemini API key is not configured.' });
    }

    // Clean audio base64 and extract base IANA mimeType without codecs parameters
    let cleanBase64 = '';
    let effectiveMimeType = (mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
    if (!effectiveMimeType.startsWith('audio/')) {
      effectiveMimeType = 'audio/webm';
    }

    if (audioBase64) {
      const commaIdx = audioBase64.indexOf(',');
      if (commaIdx !== -1) {
        const header = audioBase64.slice(0, commaIdx);
        const mimeMatch = header.match(/^data:(audio\/[^;]+)/i);
        if (mimeMatch) {
          effectiveMimeType = mimeMatch[1].toLowerCase().trim();
        }
        cleanBase64 = audioBase64.slice(commaIdx + 1);
      } else {
        cleanBase64 = audioBase64;
      }
      cleanBase64 = cleanBase64.replace(/\s/g, '');
    }

    // Build speech processing parts
    const parts: any[] = [];
    if (cleanBase64) {
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: effectiveMimeType,
        },
      });
    }

    const prompt = cleanBase64
      ? `Listen to this audio recording carefully.
1. Transcribe exactly what the person said. ${clientTranscript ? `(Note: speech recognition heard: "${clientTranscript}").` : ''}
2. Identify the spoken language (e.g. Mandarin Chinese, Spanish, English, Malay, Tamil, etc.).
3. Translate the transcribed message into ${targetLanguage} accurately and naturally.
4. If no speech is heard or it is only background noise, indicate hasSpeech as false.`
      : `A person spoke the following sentence: "${clientTranscript}".
1. Confirm the transcription in the original language.
2. Identify the spoken language (e.g. Mandarin Chinese, Spanish, French, Japanese, etc.).
3. Translate the message into ${targetLanguage} accurately and naturally.
4. Set hasSpeech to true.`;

    parts.push({ text: prompt });

    try {
      const response = await generateWithRetry(
        ai,
        {
          contents: { parts },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                hasSpeech: { type: Type.BOOLEAN },
                detectedLanguage: { type: Type.STRING },
                transcription: { type: Type.STRING, description: 'Exact transcription in the original spoken language' },
                translation: { type: Type.STRING, description: `Natural translation into ${targetLanguage}` },
                pronunciationGuide: { type: Type.STRING, description: 'Optional phonetic romanization or pinyin if helpful' },
              },
              required: ['hasSpeech', 'detectedLanguage', 'transcription', 'translation'],
            },
          },
        },
        'gemini-3.5-flash-lite'
      );

      const textOutput = response.text;
      if (!textOutput) {
        throw new Error('No response received from speech model');
      }

      const parsed = JSON.parse(textOutput);
      return res.json(parsed);
    } catch (primaryError: any) {
      console.warn('Direct audio translation encountered issue, attempting transcript fallback:', primaryError?.message);

      // If client provided a speech transcript, fallback to translating that text directly
      if (clientTranscript && clientTranscript.trim()) {
        const textFallbackPrompt = `A person spoke the following sentence: "${clientTranscript.trim()}".
1. Identify the spoken language.
2. Translate it accurately into ${targetLanguage}.
Respond in JSON format with fields: hasSpeech (true), detectedLanguage, transcription ("${clientTranscript.trim()}"), translation, pronunciationGuide.`;

        const fallbackResponse = await generateWithRetry(
          ai,
          {
            contents: textFallbackPrompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  hasSpeech: { type: Type.BOOLEAN },
                  detectedLanguage: { type: Type.STRING },
                  transcription: { type: Type.STRING },
                  translation: { type: Type.STRING },
                  pronunciationGuide: { type: Type.STRING },
                },
                required: ['hasSpeech', 'detectedLanguage', 'transcription', 'translation'],
              },
            },
          },
          'gemini-3.5-flash-lite'
        );

        if (fallbackResponse.text) {
          const fallbackParsed = JSON.parse(fallbackResponse.text);
          return res.json(fallbackParsed);
        }
      }

      throw primaryError;
    }
  } catch (error: any) {
    console.error('Error in /api/translate-speech:', error);
    return res.status(500).json({
      error: 'We could not process the speech. Please speak clearly into your microphone and try again.',
      details: error?.message,
    });
  }
});

/**
 * 3. Conversational AI Practice API
 * Conversational language tutor that responds naturally, understands multi-turn dialogue,
 * and respects practice vs response language settings.
 */
app.post('/api/conversation', async (req: Request, res: Response) => {
  try {
    const {
      history = [],
      userMessage = '',
      audioBase64,
      audioMimeType = 'audio/webm',
      practiceLanguage = 'Mandarin Chinese',
      responseLanguage = 'English',
    } = req.body;

    if (!userMessage && !audioBase64) {
      return res.status(400).json({ error: 'Please provide either a message or audio recording.' });
    }

    if (!ai) {
      return res.status(500).json({ error: 'Gemini API key is not configured.' });
    }

    // Build chat contents
    const systemInstruction = `You are a warm, patient, and encouraging language practice partner named "SayHello Assistant".
The user wants to practise conversing.
Current settings:
- Practice Language: ${practiceLanguage}
- Preferred response / explanation language: ${responseLanguage}

Guidelines:
1. Speak in friendly, natural, accessible conversational sentences. Avoid complex idioms or academic jargon.
2. If the user spoke or typed in ${practiceLanguage}, reply naturally in ${responseLanguage} (or a natural bilingual mix of ${practiceLanguage} with clear ${responseLanguage} meaning) so they understand and can reply.
3. If they made a notable language mistake, gently show how to say it naturally without making them feel bad.
4. Keep replies relatively concise (2-4 sentences) so elderly learners are not overwhelmed.
5. Provide a helpful suggested next phrase or question they can say to keep the conversation going.`;

    const parts: any[] = [];

    if (audioBase64) {
      let cleanBase64 = '';
      let effectiveMime = (audioMimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
      if (!effectiveMime.startsWith('audio/')) effectiveMime = 'audio/webm';

      const commaIdx = audioBase64.indexOf(',');
      if (commaIdx !== -1) {
        const header = audioBase64.slice(0, commaIdx);
        const mimeMatch = header.match(/^data:(audio\/[^;]+)/i);
        if (mimeMatch) effectiveMime = mimeMatch[1].toLowerCase().trim();
        cleanBase64 = audioBase64.slice(commaIdx + 1);
      } else {
        cleanBase64 = audioBase64;
      }
      cleanBase64 = cleanBase64.replace(/\s/g, '');

      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: effectiveMime,
        },
      });
      parts.push({
        text: `The user spoke into the microphone. Transcribe their words accurately, detect their language, and formulate your conversational response.`,
      });
    } else {
      parts.push({
        text: userMessage,
      });
    }

    // Include recent history (up to last 6 turns)
    const formattedContents: any[] = [];
    const recentHistory = Array.isArray(history) ? history.slice(-6) : [];

    for (const msg of recentHistory) {
      formattedContents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    }

    formattedContents.push({
      role: 'user',
      parts,
    });

    const response = await generateWithRetry(ai, {
      contents: formattedContents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            userTranscription: {
              type: Type.STRING,
              description: 'If user provided audio, their transcription; otherwise original message',
            },
            detectedLanguage: {
              type: Type.STRING,
              description: 'Language detected from the user message',
            },
            assistantReply: {
              type: Type.STRING,
              description: 'Warm, natural conversational response',
            },
            replyTranslation: {
              type: Type.STRING,
              description: `English/Native translation of the reply for complete clarity`,
            },
            helpfulTip: {
              type: Type.STRING,
              description: 'Brief, encouraging tip or vocabulary note (optional)',
            },
            suggestedReply: {
              type: Type.STRING,
              description: 'A simple sentence the user could say next to continue',
            },
          },
          required: ['assistantReply', 'detectedLanguage'],
        },
      },
    }, 'gemini-3.5-flash-lite');

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error('No response received from conversational model');
    }

    const parsed = JSON.parse(textOutput);
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/conversation:', error);
    return res.status(500).json({
      error: 'Conversation error. Please try again.',
      details: error?.message,
    });
  }
});

/**
 * 4. Text-to-Speech (TTS) API
 * Generates clear spoken audio for any translation or conversational turn
 */
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for speech synthesis.' });
    }

    if (!ai) {
      return res.status(500).json({ error: 'Gemini API key is not configured.' });
    }

    // Use gemini-3.8-flash-lite-tts for high efficiency audio generation
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.slice(0, 500), // Cap length for responsiveness
              speechMetadata: {
                style: 'Clear, gentle, articulate pronunciation for language learners and elderly listeners',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error('No audio data received from TTS model');
    }

    return res.json({
      audioData: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (error: any) {
    console.warn('TTS model call failed or not supported in this region, returning fallback notice:', error?.message);
    // Return structured response indicating client can fallback to browser SpeechSynthesis
    return res.status(200).json({
      useBrowserTts: true,
      message: 'Browser SpeechSynthesis fallback recommended',
    });
  }
});

// Setup Vite in Dev or serve static in Prod
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.all('/api/*', (_req: Request, res: Response) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'), (err) => {
        if (err && !res.headersSent) {
          res.status(500).send('Error loading application');
        }
      });
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`“What Does This Say?” server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
