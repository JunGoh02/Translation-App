import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Send,
  Mic,
  Square,
  Volume2,
  RefreshCw,
  Globe,
  MessageSquare,
  Sparkles,
  Bot,
  User,
} from 'lucide-react';
import { ChatMessage } from '../types';
import { LanguageSelectorModal } from './LanguageSelectorModal';
import { speakText, blobToBase64 } from '../utils/audio';

interface ConversationScreenProps {
  onBackHome: () => void;
  defaultPracticeLang?: string;
  defaultResponseLang?: string;
}

export const ConversationScreen: React.FC<ConversationScreenProps> = ({
  onBackHome,
  defaultPracticeLang = 'Mandarin Chinese',
  defaultResponseLang = 'English',
}) => {
  const [practiceLang, setPracticeLang] = useState(defaultPracticeLang);
  const [responseLang, setResponseLang] = useState(defaultResponseLang);

  const [activeModal, setActiveModal] = useState<'practice' | 'response' | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content:
        practiceLang === 'Mandarin Chinese'
          ? '你好！今天过得怎么样？你想聊些什么？'
          : `Hello! I am your friendly language partner. Let's practise ${practiceLang} together!`,
      translation:
        practiceLang === 'Mandarin Chinese'
          ? 'Hello! How is your day going? What would you like to talk about?'
          : undefined,
      timestamp: Date.now(),
      suggestedReply:
        practiceLang === 'Mandarin Chinese' ? '我很好，谢谢！你呢？' : 'I am doing well, thank you!',
    },
  ]);

  const [inputDraft, setInputDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Clean up recording on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputDraft.trim();
    if (!text || isSending) return;

    setInputDraft('');
    setErrorMessage(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsSending(true);

    try {
      const res = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: newHistory.map((m) => ({ role: m.role, content: m.content })),
          userMessage: text,
          practiceLanguage: practiceLang,
          responseLanguage: responseLang,
        }),
      });

      if (!res.ok) {
        throw new Error('Could not get response from language assistant.');
      }

      const data = await res.json();

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.assistantReply,
        translation: data.replyTranslation,
        detectedLanguage: data.detectedLanguage,
        helpfulTip: data.helpfulTip,
        suggestedReply: data.suggestedReply,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, botMsg]);

      // Automatically speak reply
      speakText(data.assistantReply, practiceLang);
    } catch (err: any) {
      console.error('Conversation error:', err);
      setErrorMessage('Something went wrong. Please try sending your message again.');
    } finally {
      setIsSending(false);
    }
  };

  const startVoiceRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (blob.size < 1000) {
          setErrorMessage('No voice detected. Please try speaking again.');
          return;
        }

        const base64Audio = await blobToBase64(blob);
        setIsSending(true);

        try {
          const res = await fetch('/api/conversation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              history: messages.map((m) => ({ role: m.role, content: m.content })),
              audioBase64: base64Audio,
              audioMimeType: 'audio/webm',
              practiceLanguage: practiceLang,
              responseLanguage: responseLang,
            }),
          });

          if (!res.ok) throw new Error('Speech processing failed');
          const data = await res.json();

          const userTranscription = data.userTranscription || 'Voice message';
          const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: userTranscription,
            detectedLanguage: data.detectedLanguage,
            timestamp: Date.now(),
          };

          const botMsg: ChatMessage = {
            id: `bot-${Date.now()}`,
            role: 'assistant',
            content: data.assistantReply,
            translation: data.replyTranslation,
            detectedLanguage: data.detectedLanguage,
            helpfulTip: data.helpfulTip,
            suggestedReply: data.suggestedReply,
            timestamp: Date.now(),
          };

          setMessages((prev) => [...prev, userMsg, botMsg]);
          speakText(data.assistantReply, practiceLang);
        } catch (err: any) {
          setErrorMessage('Could not understand voice. Please try typing or speak again.');
        } finally {
          setIsSending(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      setErrorMessage('Microphone access is needed to speak. Please enable microphone permissions.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      setIsRecording(false);
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 shadow-xs flex items-center justify-between">
        <button
          onClick={onBackHome}
          className="flex items-center gap-1.5 py-2 px-3 rounded-xl hover:bg-slate-100 text-slate-800 font-bold text-base transition-colors"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          <span>Home</span>
        </button>

        <h1 className="text-lg font-black text-blue-950 tracking-tight">Language Partner</h1>

        <button
          onClick={() => {
            setMessages([
              {
                id: `reset-${Date.now()}`,
                role: 'assistant',
                content: `Let's start a fresh practice in ${practiceLang}! What would you like to talk about?`,
                timestamp: Date.now(),
              },
            ]);
          }}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100"
          title="Reset conversation"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </header>

      {/* Prominent Language Bar settings for elderly learners */}
      <section className="bg-blue-950 text-white px-4 py-3 shadow-sm flex flex-wrap items-center justify-between gap-3 text-sm font-semibold">
        <div className="flex items-center gap-2">
          <span className="text-blue-200">Practising:</span>
          <button
            onClick={() => setActiveModal('practice')}
            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white font-bold flex items-center gap-1"
          >
            <span>{practiceLang}</span>
            <Globe className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-blue-200">Replies in:</span>
          <button
            onClick={() => setActiveModal('response')}
            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white font-bold flex items-center gap-1"
          >
            <span>{responseLang}</span>
            <Globe className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-900 font-bold text-sm text-center">
          {errorMessage}
        </div>
      )}

      {/* Chat Messages List */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-5 max-w-xl w-full mx-auto space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1.5`}
            >
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 px-1">
                {isUser ? (
                  <>
                    <span>You</span>
                    <User className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <Bot className="w-3.5 h-3.5 text-blue-950" />
                    <span className="text-blue-950">AI Language Partner</span>
                  </>
                )}
              </div>

              <div
                className={`max-w-[85%] rounded-3xl p-4 sm:p-5 shadow-sm text-lg leading-relaxed ${
                  isUser
                    ? 'bg-blue-950 text-white rounded-br-xs font-bold'
                    : 'bg-white text-slate-900 border-2 border-slate-200 rounded-bl-xs font-medium'
                }`}
              >
                <p>{msg.content}</p>

                {/* Subtitle translation for assistant messages */}
                {!isUser && msg.translation && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-sm text-slate-600 font-normal">
                    <span className="font-bold text-slate-800">Meaning: </span>
                    {msg.translation}
                  </div>
                )}

                {/* Helpful tip */}
                {!isUser && msg.helpfulTip && (
                  <div className="mt-2 text-xs font-bold text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{msg.helpfulTip}</span>
                  </div>
                )}

                {/* Speaker button */}
                {!isUser && (
                  <div className="mt-3 flex items-center justify-end">
                    <button
                      onClick={() => speakText(msg.content, practiceLang)}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-blue-950 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors"
                      aria-label="Listen to pronunciation"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Listen</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Suggested reply chip */}
              {!isUser && msg.suggestedReply && (
                <button
                  onClick={() => handleSendMessage(msg.suggestedReply)}
                  className="mt-1 ml-2 text-xs font-bold text-blue-950 bg-blue-100 hover:bg-blue-200 border border-blue-300 py-1.5 px-3 rounded-full text-left flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Tap to say: &ldquo;{msg.suggestedReply}&rdquo;</span>
                </button>
              )}
            </div>
          );
        })}

        {isSending && (
          <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl w-fit text-slate-600 text-sm font-bold shadow-xs animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-950" />
            <span>AI partner is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Bottom Input Area */}
      <footer className="sticky bottom-0 bg-white border-t border-slate-200 p-3 sm:p-4 shadow-lg">
        <div className="max-w-xl mx-auto flex items-center gap-2.5">
          {/* Push-to-talk Mic Button */}
          {isRecording ? (
            <button
              onClick={stopVoiceRecording}
              className="w-14 h-14 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md animate-pulse active:scale-95"
              aria-label="Stop recording voice"
            >
              <Square className="w-6 h-6 fill-white" />
            </button>
          ) : (
            <button
              onClick={startVoiceRecording}
              disabled={isSending}
              className="w-14 h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-blue-100 text-blue-950 flex items-center justify-center shrink-0 border border-slate-300 active:scale-95 transition-all"
              aria-label="Speak your message"
            >
              <Mic className="w-7 h-7" />
            </button>
          )}

          {/* Large text input field */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputDraft}
              onChange={(e) => setInputDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={isRecording ? 'Listening to your voice...' : `Type in ${practiceLang} or ${responseLang}...`}
              disabled={isSending || isRecording}
              className="w-full py-3.5 px-4 bg-slate-100 rounded-2xl text-lg text-slate-900 border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-950 focus:bg-white placeholder-slate-500 font-medium"
            />
          </div>

          {/* Send Button */}
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputDraft.trim() || isSending}
            className="w-14 h-14 rounded-2xl bg-blue-950 hover:bg-blue-900 disabled:opacity-40 text-white flex items-center justify-center shrink-0 shadow-md active:scale-95 transition-all"
            aria-label="Send message"
          >
            <Send className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>
      </footer>

      {/* Language Modals */}
      <LanguageSelectorModal
        isOpen={activeModal === 'practice'}
        onClose={() => setActiveModal(null)}
        selectedLanguage={practiceLang}
        onSelectLanguage={(l) => setPracticeLang(l)}
        title="I want to practise:"
      />

      <LanguageSelectorModal
        isOpen={activeModal === 'response'}
        onClose={() => setActiveModal(null)}
        selectedLanguage={responseLang}
        onSelectLanguage={(l) => setResponseLang(l)}
        title="AI should reply in:"
      />
    </div>
  );
};
