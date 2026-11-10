'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Send,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Loader2,
  Radio,
  Columns2,
  FileText,
  LayoutDashboard,
} from 'lucide-react';
import {
  IncomingLessonResponse,
  LessonModule,
  TutorConfigPayload,
  EvaluateCheckpointResponse,
  QuickActionType,
  ChatHistoryTurn,
  EndpointKey,
  SpeechVoiceInput,
  buildEvaluateCheckpointPayload,
  buildTutorChatPayload,
  evaluateUnderstandingResponse,
  extractTextFromSseChunk,
  generateContextualTutorReply,
  getPersonaProsody,
  normalizeBaseUrl,
  rankEnglishVoicesForPersona,
  splitIntoSpeechSentences,
} from '@/lib/tutor-contracts';
import { ConceptSimulationDiagram } from './concept-simulation-diagram';
import { SourceMaterialViewer } from './source-material-viewer';

export interface TranscriptMessage {
  id: string;
  sender: 'tutor' | 'student';
  tag: string;
  text: string;
  timestamp: string;
}

interface InteractiveClassroomProps {
  sessionId: string;
  lesson: IncomingLessonResponse;
  tutorConfig: TutorConfigPayload;
  sourceFile: File | null;
  sourceFileUrl: string | null;
  sourceFileName: string;
  sourceContentType: string;
  sourcePageCount: number;
  rawSourceText: string;
  activeModuleIndex: number;
  masteredModuleIds: string[];
  mockBackendMode: boolean;
  backendBaseUrl: string;
  sseStreamingEnabled: boolean;
  autoSpeakTrigger: number;
  onToggleSseStreaming: (enabled: boolean) => void;
  onSelectModule: (index: number) => void;
  onMarkModuleMastered: (moduleId: string) => void;
  onBackToStudio: () => void;
  onLogApiTraffic: (
    endpoint: EndpointKey,
    url: string,
    status: number | 'pending' | 'mock' | 'error',
    requestPayload: unknown,
    responsePayload: unknown
  ) => void;
}

export function InteractiveClassroom({
  sessionId,
  lesson,
  tutorConfig,
  sourceFile,
  sourceFileUrl,
  sourceFileName,
  sourceContentType,
  sourcePageCount,
  rawSourceText,
  activeModuleIndex,
  masteredModuleIds,
  mockBackendMode,
  backendBaseUrl,
  sseStreamingEnabled,
  autoSpeakTrigger,
  onToggleSseStreaming,
  onSelectModule,
  onMarkModuleMastered,
  onBackToStudio,
  onLogApiTraffic,
}: InteractiveClassroomProps) {
  const activeModule: LessonModule =
    lesson.modules[activeModuleIndex] || lesson.modules[0];

  // Workspace View Mode: 'whiteboard' | 'split' (PDF + Board) | 'document' (Source Document)
  const [workspaceLayout, setWorkspaceLayout] = useState<
    'whiteboard' | 'split' | 'document'
  >('whiteboard');

  // Voice & TTS State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.25 | 1.5>(1);
  const [activeKeyPointIndex, setActiveKeyPointIndex] = useState<number | null>(null);
  const [browserVoices, setBrowserVoices] = useState<SpeechVoiceInput[]>([]);
  const [userSelectedVoiceURI, setUserSelectedVoiceURI] = useState<string>('');

  // Microphone / SpeechRecognition State
  const [isListening, setIsListening] = useState(false);
  const [activeMicTarget, setActiveMicTarget] = useState<'chat' | 'checkpoint' | null>(null);
  const [micStatusNote, setMicStatusNote] = useState<string | null>(null);

  // Understanding Checkpoint State per Module
  const [checkpointAnswers, setCheckpointAnswers] = useState<Record<string, string>>({});
  const [checkpointEvaluations, setCheckpointEvaluations] = useState<
    Record<string, EvaluateCheckpointResponse>
  >({});
  const [isEvaluatingCheckpoint, setIsEvaluatingCheckpoint] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Synchronized Chat & Transcript Stream State
  const [transcript, setTranscript] = useState<TranscriptMessage[]>(() => [
    {
      id: 'welcome-intro',
      sender: 'tutor',
      tag: 'Welcome Intro',
      text: lesson.welcome_spoken_intro,
      timestamp: 'Just now',
    },
    {
      id: `narration-${lesson.modules[0]?.module_id || 'mod_1'}`,
      sender: 'tutor',
      tag: 'Module 1 Narration',
      text: lesson.modules[0]?.spoken_narration || '',
      timestamp: 'Just now',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTutorReplying, setIsTutorReplying] = useState(false);
  const [suggestedFollowUps, setSuggestedFollowUps] = useState<string[]>([]);

  // Refs for timers and Web Speech
  const keyPointTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackSpeechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechSessionIdRef = useRef<number>(0);
  const nativeVoicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const recognitionRef = useRef<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const msgSeqRef = useRef<number>(1);

  const currentAnswer = checkpointAnswers[activeModule.module_id] || '';
  const currentEvaluation = checkpointEvaluations[activeModule.module_id] || null;
  const isCurrentMastered = masteredModuleIds.includes(activeModule.module_id);
  const cleanBase = normalizeBaseUrl(backendBaseUrl);

  // Ranked English voices according to strict neural priority hierarchy & persona affinity
  const rankedVoices = rankEnglishVoicesForPersona(browserVoices, tutorConfig.persona);
  const activeVoiceOption =
    rankedVoices.find((v) => v.voiceURI === userSelectedVoiceURI) || rankedVoices[0];

  const stopSpeechInternal = () => {
    speechSessionIdRef.current += 1;
    if (keyPointTimerRef.current) {
      clearInterval(keyPointTimerRef.current);
      keyPointTimerRef.current = null;
    }
    if (fallbackSpeechTimerRef.current) {
      clearTimeout(fallbackSpeechTimerRef.current);
      fallbackSpeechTimerRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const speakTextAloud = (
    textToSpeak: string,
    options?: {
      cycleKeyPoints?: boolean;
      fixedPointIndex?: number | null;
      overrideVoiceURI?: string;
    }
  ) => {
    stopSpeechInternal();
    const currentSessionId = speechSessionIdRef.current;

    const pointCount = activeModule.key_points.length;
    if (options?.fixedPointIndex !== undefined) {
      setActiveKeyPointIndex(options.fixedPointIndex);
    } else if (options?.cycleKeyPoints && pointCount > 0) {
      setActiveKeyPointIndex(0);
      let idx = 0;
      keyPointTimerRef.current = setInterval(() => {
        idx = (idx + 1) % pointCount;
        setActiveKeyPointIndex(idx);
      }, Math.max(1800, Math.round(3200 / playbackSpeed)));
    }

    setIsSpeaking(true);
    setIsPaused(false);

    // Split into individual sentences to prevent Chrome's ~15-second cloud TTS cutoff bug
    const sentences = splitIntoSpeechSentences(textToSpeak);
    const words = textToSpeak.trim().split(/\s+/).length;
    const estDurationMs = Math.min(
      28000,
      Math.max(2800, Math.round((words / (2.5 * playbackSpeed)) * 1000))
    );

    fallbackSpeechTimerRef.current = setTimeout(() => {
      if (speechSessionIdRef.current !== currentSessionId) return;
      if (keyPointTimerRef.current) {
        clearInterval(keyPointTimerRef.current);
        keyPointTimerRef.current = null;
      }
      setIsSpeaking(false);
      setIsPaused(false);
    }, estDurationMs);

    if (
      !isMuted &&
      sentences.length > 0 &&
      typeof window !== 'undefined' &&
      'speechSynthesis' in window
    ) {
      try {
        window.speechSynthesis.cancel();

        const targetVoiceURI =
          options?.overrideVoiceURI || activeVoiceOption?.voiceURI || '';
        const liveSystemVoices =
          nativeVoicesRef.current.length > 0
            ? nativeVoicesRef.current
            : window.speechSynthesis.getVoices();

        const matchedNativeVoice =
          liveSystemVoices.find(
            (v) => v.voiceURI === targetVoiceURI || v.name === targetVoiceURI
          ) ||
          liveSystemVoices.find((v) =>
            rankedVoices[0]
              ? v.voiceURI === rankedVoices[0].voiceURI ||
                v.name === rankedVoices[0].name
              : false
          );

        const prosody = getPersonaProsody(tutorConfig.persona);
        const effectiveRate = Math.min(2.0, playbackSpeed * prosody.rate);
        const effectivePitch = prosody.pitch;

        // Sequential sentence queue so long explanations never hit Chrome's 15s cutoff
        const speakSentenceAtIndex = (idx: number) => {
          if (speechSessionIdRef.current !== currentSessionId) return;
          if (idx >= sentences.length) {
            if (keyPointTimerRef.current) {
              clearInterval(keyPointTimerRef.current);
              keyPointTimerRef.current = null;
            }
            if (fallbackSpeechTimerRef.current) {
              clearTimeout(fallbackSpeechTimerRef.current);
              fallbackSpeechTimerRef.current = null;
            }
            setIsSpeaking(false);
            setIsPaused(false);
            return;
          }

          const utterance = new SpeechSynthesisUtterance(sentences[idx]);
          if (matchedNativeVoice) {
            utterance.voice = matchedNativeVoice;
            utterance.lang = matchedNativeVoice.lang;
          } else if (activeVoiceOption?.lang) {
            utterance.lang = activeVoiceOption.lang;
          }
          utterance.rate = effectiveRate;
          utterance.pitch = effectivePitch;

          utterance.onend = () => {
            if (speechSessionIdRef.current !== currentSessionId) return;
            speakSentenceAtIndex(idx + 1);
          };

          utterance.onerror = () => {
            if (speechSessionIdRef.current !== currentSessionId) return;
            speakSentenceAtIndex(idx + 1);
          };

          window.speechSynthesis.speak(utterance);
        };

        speakSentenceAtIndex(0);
      } catch {
        // Fallback timer handles visual completion
      }
    }
  };

  // Load voices from window.speechSynthesis.getVoices() and subscribe to onvoiceschanged
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const rawVoices = window.speechSynthesis.getVoices() || [];
      nativeVoicesRef.current = rawVoices;
      if (rawVoices.length > 0) {
        setBrowserVoices(
          rawVoices.map((v) => ({
            voiceURI: v.voiceURI || v.name,
            name: v.name,
            lang: v.lang,
            localService: v.localService,
          }))
        );
      }
    };

    const initTimer = window.setTimeout(loadVoices, 0);
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.clearTimeout(initTimer);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      speechSessionIdRef.current += 1;
      if (keyPointTimerRef.current) clearInterval(keyPointTimerRef.current);
      if (fallbackSpeechTimerRef.current) clearTimeout(fallbackSpeechTimerRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // When transitioning from View 1 -> View 2 after lesson generation, speak welcome_spoken_intro + module 1 narration
  useEffect(() => {
    if (autoSpeakTrigger <= 0) return;
    const combinedIntro = `${lesson.welcome_spoken_intro} ${
      lesson.modules[0]?.spoken_narration || ''
    }`;
    const timer = window.setTimeout(() => {
      speakTextAloud(combinedIntro, { cycleKeyPoints: true });
    }, 50);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSpeakTrigger]);

  // Scroll chat stream smoothly when transcript updates
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [transcript.length]);

  const handleTogglePlayPause = () => {
    if (isSpeaking && !isPaused) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.pause();
      }
      if (keyPointTimerRef.current) {
        clearInterval(keyPointTimerRef.current);
        keyPointTimerRef.current = null;
      }
      if (fallbackSpeechTimerRef.current) {
        clearTimeout(fallbackSpeechTimerRef.current);
        fallbackSpeechTimerRef.current = null;
      }
      setIsPaused(true);
      setIsSpeaking(false);
      return;
    }

    if (isPaused) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.resume();
      }
      setIsPaused(false);
      setIsSpeaking(true);
      fallbackSpeechTimerRef.current = setTimeout(() => {
        setIsSpeaking(false);
      }, 4500);
      return;
    }

    handleReplayExplanation();
  };

  const handleReplayExplanation = () => {
    const narration = activeModule.spoken_narration;
    appendTranscript('tutor', `Module ${activeModuleIndex + 1} Narration`, narration);
    speakTextAloud(narration, { cycleKeyPoints: true });
  };

  const handleCycleSpeed = () => {
    const nextSpeed: 1 | 1.25 | 1.5 =
      playbackSpeed === 1 ? 1.25 : playbackSpeed === 1.25 ? 1.5 : 1;
    setPlaybackSpeed(nextSpeed);
  };

  const appendTranscript = (
    sender: 'tutor' | 'student',
    tag: string,
    text: string
  ): string => {
    msgSeqRef.current += 1;
    const id = `msg-${msgSeqRef.current}`;
    setTranscript((prev) => [
      ...prev,
      {
        id,
        sender,
        tag,
        text,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ]);
    return id;
  };

  const updateTranscriptById = (id: string, newText: string) => {
    setTranscript((prev) =>
      prev.map((m) => (m.id === id ? { ...m, text: newText } : m))
    );
  };

  const handleSwitchModule = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= lesson.modules.length) return;
    stopSpeechInternal();
    setShowHint(false);
    setActiveKeyPointIndex(0);
    onSelectModule(newIndex);
    const targetMod = lesson.modules[newIndex];
    if (targetMod) {
      appendTranscript(
        'tutor',
        `Module ${newIndex + 1}: ${targetMod.title}`,
        targetMod.spoken_narration
      );
      speakTextAloud(targetMod.spoken_narration, { cycleKeyPoints: true });
    }
  };

  // Endpoint C: POST ${baseUrl}/api/v1/evaluate-checkpoint
  const handleSubmitCheckpoint = async (overrideAnswer?: string) => {
    const answerText = (overrideAnswer ?? currentAnswer).trim();
    if (!answerText || isEvaluatingCheckpoint) return;

    if (overrideAnswer !== undefined) {
      setCheckpointAnswers((prev) => ({
        ...prev,
        [activeModule.module_id]: overrideAnswer,
      }));
    }

    appendTranscript('student', 'Concept Check Answer', answerText);

    const requestPayload = buildEvaluateCheckpointPayload({
      sessionId,
      module: activeModule,
      userResponse: answerText,
      tutorConfig,
    });

    const targetUrl = `${cleanBase}/api/v1/evaluate-checkpoint`;
    setIsEvaluatingCheckpoint(true);

    try {
      let evalData: EvaluateCheckpointResponse;

      if (mockBackendMode) {
        evalData = evaluateUnderstandingResponse(
          answerText,
          activeModule.understanding_check
        );
        onLogApiTraffic(
          'evaluate-checkpoint',
          'mock://api/v1/evaluate-checkpoint',
          'mock',
          requestPayload,
          evalData
        );
      } else {
        onLogApiTraffic(
          'evaluate-checkpoint',
          targetUrl,
          'pending',
          requestPayload,
          { status: 'Evaluating learner explanation...' }
        );

        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errText.slice(0, 160)}`);
        }

        const raw = (await response.json()) as EvaluateCheckpointResponse;
        evalData = {
          passed: Boolean(raw.passed),
          mastery_score:
            typeof raw.mastery_score === 'number' ? raw.mastery_score : raw.passed ? 100 : 40,
          concepts_matched: Array.isArray(raw.concepts_matched) ? raw.concepts_matched : [],
          concepts_missed: Array.isArray(raw.concepts_missed) ? raw.concepts_missed : [],
          spoken_feedback:
            raw.spoken_feedback ||
            raw.written_summary ||
            'Evaluation complete.',
          written_summary:
            raw.written_summary ||
            raw.spoken_feedback ||
            'Evaluation complete.',
          follow_up_hint: raw.follow_up_hint || '',
        };

        onLogApiTraffic(
          'evaluate-checkpoint',
          targetUrl,
          response.status,
          requestPayload,
          evalData
        );
      }

      setCheckpointEvaluations((prev) => ({
        ...prev,
        [activeModule.module_id]: evalData,
      }));

      if (evalData.passed) {
        onMarkModuleMastered(activeModule.module_id);
      }

      appendTranscript(
        'tutor',
        'Checkpoint Evaluation',
        `${evalData.written_summary}${
          evalData.spoken_feedback && evalData.spoken_feedback !== evalData.written_summary
            ? `\n\n"${evalData.spoken_feedback}"`
            : ''
        }`
      );
      speakTextAloud(evalData.spoken_feedback, { fixedPointIndex: null });
    } catch (err) {
      // Graceful fallback to local evaluation if live endpoint fails or is unreachable
      const fallbackEval = evaluateUnderstandingResponse(
        answerText,
        activeModule.understanding_check
      );
      onLogApiTraffic(
        'evaluate-checkpoint',
        targetUrl,
        'error',
        requestPayload,
        {
          error: err instanceof Error ? err.message : 'Network error',
          fallback_used: fallbackEval,
        }
      );

      setCheckpointEvaluations((prev) => ({
        ...prev,
        [activeModule.module_id]: fallbackEval,
      }));

      if (fallbackEval.passed) {
        onMarkModuleMastered(activeModule.module_id);
      }

      appendTranscript('tutor', 'Checkpoint Evaluation (Fallback)', fallbackEval.spoken_feedback);
      speakTextAloud(fallbackEval.spoken_feedback, { fixedPointIndex: null });
    } finally {
      setIsEvaluatingCheckpoint(false);
    }
  };

  // Endpoint D & E: POST ${baseUrl}/api/v1/tutor-chat?stream=false OR POST ${baseUrl}/api/v1/tutor-chat/stream
  const handleSendChatMessage = async (
    overridePrompt?: string,
    quickAction: QuickActionType = 'freeform'
  ) => {
    const promptText = (overridePrompt ?? chatInput).trim();
    if (!promptText || isTutorReplying) return;
    if (!overridePrompt) setChatInput('');

    // Build chat_history strictly using "user" or "assistant" roles from existing transcript
    const chatHistory: ChatHistoryTurn[] = transcript.slice(-8).map((item) => ({
      role: item.sender === 'student' ? 'user' : 'assistant',
      content: item.text,
    }));

    appendTranscript('student', quickAction === 'freeform' ? 'Live Question' : `Quick Action (${quickAction})`, promptText);

    const requestPayload = buildTutorChatPayload({
      sessionId,
      module: activeModule,
      tutorConfig,
      quickAction,
      userMessage: promptText,
      chatHistory,
    });

    setIsTutorReplying(true);

    try {
      if (mockBackendMode) {
        const mockReply = generateContextualTutorReply(
          promptText,
          activeModule,
          tutorConfig,
          quickAction
        );
        onLogApiTraffic(
          'tutor-chat',
          'mock://api/v1/tutor-chat?stream=false',
          'mock',
          requestPayload,
          mockReply
        );

        appendTranscript('tutor', 'Tutor Response', mockReply.written_markdown);
        setSuggestedFollowUps(mockReply.suggested_follow_ups || []);
        speakTextAloud(mockReply.spoken_reply, {
          fixedPointIndex:
            typeof mockReply.highlight_key_point_index === 'number'
              ? mockReply.highlight_key_point_index
              : null,
        });
        return;
      }

      // Endpoint E: SSE Streaming Mode when sseStreamingEnabled === true
      if (sseStreamingEnabled) {
        const streamUrl = `${cleanBase}/api/v1/tutor-chat/stream`;
        onLogApiTraffic('tutor-chat', streamUrl, 'pending', requestPayload, {
          stream: 'Connecting to SSE stream...',
        });

        const response = await fetch(streamUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
        });

        if (!response.ok || !response.body) {
          throw new Error(`SSE Stream HTTP ${response.status}`);
        }

        const msgId = appendTranscript('tutor', 'Live SSE Stream', '...');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = '';
        let finalStructured: Partial<{
          spoken_reply: string;
          highlight_key_point_index: number | null;
          suggested_follow_ups: string[];
        }> = {};

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunkStr = decoder.decode(value, { stream: true });
          const parsedChunk = extractTextFromSseChunk(chunkStr);
          if (parsedChunk.tokens) {
            accumulatedText += parsedChunk.tokens;
            updateTranscriptById(msgId, accumulatedText);
          }
          if (parsedChunk.structuredPayload) {
            finalStructured = { ...finalStructured, ...parsedChunk.structuredPayload };
          }
        }

        const finalSpoken =
          finalStructured.spoken_reply || accumulatedText.replace(/[*#_`]/g, '');
        if (Array.isArray(finalStructured.suggested_follow_ups)) {
          setSuggestedFollowUps(finalStructured.suggested_follow_ups);
        }
        onLogApiTraffic('tutor-chat', streamUrl, 200, requestPayload, {
          streamed_text: accumulatedText,
          ...finalStructured,
        });

        speakTextAloud(finalSpoken, {
          fixedPointIndex:
            typeof finalStructured.highlight_key_point_index === 'number'
              ? finalStructured.highlight_key_point_index
              : null,
        });
        return;
      }

      // Endpoint D: Standard JSON Mode (POST ${baseUrl}/api/v1/tutor-chat?stream=false)
      const jsonUrl = `${cleanBase}/api/v1/tutor-chat?stream=false`;
      onLogApiTraffic('tutor-chat', jsonUrl, 'pending', requestPayload, {
        status: 'Awaiting tutor reply...',
      });

      const response = await fetch(jsonUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText.slice(0, 160)}`);
      }

      const data = await response.json();
      const spokenReply =
        typeof data.spoken_reply === 'string' && data.spoken_reply
          ? data.spoken_reply
          : typeof data.written_markdown === 'string'
          ? data.written_markdown.replace(/[*#_`]/g, '')
          : 'Here is a breakdown of the concept.';
      const writtenMarkdown =
        typeof data.written_markdown === 'string' && data.written_markdown
          ? data.written_markdown
          : spokenReply;
      const highlightIdx =
        typeof data.highlight_key_point_index === 'number' &&
        data.highlight_key_point_index >= 0 &&
        data.highlight_key_point_index < activeModule.key_points.length
          ? data.highlight_key_point_index
          : null;
      const followUps = Array.isArray(data.suggested_follow_ups)
        ? data.suggested_follow_ups
        : [];

      onLogApiTraffic('tutor-chat', jsonUrl, response.status, requestPayload, data);

      appendTranscript('tutor', 'Tutor Response', writtenMarkdown);
      setSuggestedFollowUps(followUps);
      speakTextAloud(spokenReply, { fixedPointIndex: highlightIdx });
    } catch (err) {
      // Fallback to local contextual reply so the student experience never breaks
      const fallbackReply = generateContextualTutorReply(
        promptText,
        activeModule,
        tutorConfig,
        quickAction
      );
      onLogApiTraffic(
        'tutor-chat',
        `${cleanBase}/api/v1/tutor-chat`,
        'error',
        requestPayload,
        {
          error: err instanceof Error ? err.message : 'Network error',
          fallback_used: fallbackReply,
        }
      );

      appendTranscript('tutor', 'Tutor Response (Fallback)', fallbackReply.written_markdown);
      setSuggestedFollowUps(fallbackReply.suggested_follow_ups);
      speakTextAloud(fallbackReply.spoken_reply, {
        fixedPointIndex: fallbackReply.highlight_key_point_index,
      });
    } finally {
      setIsTutorReplying(false);
    }
  };

  // Microphone / SpeechRecognition with graceful iframe simulation fallback
  const toggleMicrophone = (target: 'chat' | 'checkpoint') => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      setActiveMicTarget(null);
      return;
    }

    stopSpeechInternal();
    setIsListening(true);
    setActiveMicTarget(target);
    setMicStatusNote('Listening via microphone...');

    const SpeechRecognitionAPI =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    const triggerGracefulSimulatedVoice = (reason: string) => {
      setMicStatusNote(`${reason} — Simulating live voice transcription...`);
      const simulatedUtterance =
        target === 'checkpoint'
          ? `If the step size is set way too high, we ${
              activeModule.understanding_check.expected_concepts[0] || 'overshoot'
            } the valley and ${
              activeModule.understanding_check.expected_concepts[1] || 'diverge'
            } instead of reaching the minimum.`
          : `Can you give me a real-world example of ${activeModule.visual_analogy.target_concept}?`;

      setTimeout(() => {
        if (target === 'checkpoint') {
          setCheckpointAnswers((prev) => ({
            ...prev,
            [activeModule.module_id]: simulatedUtterance,
          }));
          void handleSubmitCheckpoint(simulatedUtterance);
        } else {
          setChatInput(simulatedUtterance);
          void handleSendChatMessage(simulatedUtterance, 'freeform');
        }
        setIsListening(false);
        setActiveMicTarget(null);
        setTimeout(() => setMicStatusNote(null), 3000);
      }, 1400);
    };

    if (!SpeechRecognitionAPI) {
      triggerGracefulSimulatedVoice('Browser SpeechRecognition unavailable');
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let capturedTranscript = '';

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          interim += event.results[i][0].transcript;
        }
        capturedTranscript = interim;
        if (target === 'checkpoint') {
          setCheckpointAnswers((prev) => ({
            ...prev,
            [activeModule.module_id]: interim,
          }));
        } else {
          setChatInput(interim);
        }
      };

      recognition.onerror = () => {
        triggerGracefulSimulatedVoice('Iframe mic permission restricted');
      };

      recognition.onend = () => {
        if (capturedTranscript.trim()) {
          setIsListening(false);
          setActiveMicTarget(null);
          setMicStatusNote(null);
          if (target === 'checkpoint') {
            void handleSubmitCheckpoint(capturedTranscript);
          } else {
            void handleSendChatMessage(capturedTranscript, 'freeform');
          }
        }
      };

      recognition.start();
    } catch {
      triggerGracefulSimulatedVoice('Microphone blocked in sandbox');
    }
  };

  const masteryPercentage = Math.round(
    (masteredModuleIds.length / Math.max(1, lesson.modules.length)) * 100
  );

  const quickActionItems: { label: string; action: QuickActionType }[] = [
    { label: 'Explain this simpler', action: 'explain_simpler' },
    { label: 'Give me a real-world example', action: 'real_world_example' },
    { label: 'Test me on this', action: 'test_me' },
  ];

  return (
    <section className="max-w-[1440px] mx-auto px-6 py-6">
      {/* Top Progress Stepper & Chapter Metadata Header */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              <button
                type="button"
                onClick={onBackToStudio}
                className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-sans font-medium cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Setup Studio
              </button>
              <span aria-hidden="true">·</span>
              <span>Lesson ID: {lesson.lesson_id}</span>
              <span aria-hidden="true">·</span>
              <span>Est. {lesson.estimated_duration_minutes} min</span>
              <span aria-hidden="true">·</span>
              <span>
                {masteredModuleIds.length} of {lesson.modules.length} Modules Mastered ({masteryPercentage}%)
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-display">
              {lesson.chapter_title}
            </h1>
          </div>

          {/* Mastery Progress Bar & Dynamic Module Counter Badge */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs font-mono font-semibold tabular-nums text-indigo-700 dark:text-indigo-300">
              Module {activeModuleIndex + 1} of {lesson.modules.length}
            </span>
            <div className="w-32 sm:w-40 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${masteryPercentage}%` }}
              />
            </div>
            <span className="text-xs font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {masteryPercentage}% Mastered
            </span>
          </div>
        </div>

        {/* Dynamic Horizontally Scrollable Module Stepper (Scales from 1 to 12+ Modules) */}
        <div
          className="flex items-stretch gap-3 pt-4 overflow-x-auto no-scrollbar pb-1"
          role="tablist"
          aria-label="Lesson Concept Modules"
        >
          {lesson.modules.map((mod, idx) => {
            const isActive = idx === activeModuleIndex;
            const isMastered = masteredModuleIds.includes(mod.module_id);
            const paddedNum = String(idx + 1).padStart(2, '0');
            return (
              <button
                key={mod.module_id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleSwitchModule(idx)}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer min-w-[220px] sm:min-w-[248px] flex-1 shrink-0 ${
                  isActive
                    ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/50 text-slate-900 dark:text-white ring-1 ring-indigo-600/20'
                    : isMastered
                    ? 'border-emerald-300/80 dark:border-emerald-800/70 bg-emerald-50/30 dark:bg-emerald-950/20 text-slate-800 dark:text-slate-200 hover:border-emerald-400'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tabular-nums ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : isMastered
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {paddedNum}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                      {mod.module_id}
                    </span>
                  </div>
                  <p className="text-xs font-semibold truncate">{mod.title}</p>
                </div>
                <div className="shrink-0">
                  {isMastered ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      Mastered
                    </span>
                  ) : isActive ? (
                    <span className="text-[11px] font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                      Active
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono text-slate-400">Pending</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Split-Screen Interactive Workspace: 70% Left/Center Workspace + 30% Right AI Tutor Comms */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT/CENTER PANEL: Dynamic Whiteboard & Built-In Source Document Viewer (70% width -> 8 of 12 cols on lg) */}
        <div className="lg:col-span-8 space-y-5">
          {/* 3-Way Workspace Layout Switcher Bar */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Classroom Workspace Mode:
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate hidden sm:inline">
                {sourceFileName || 'study_notes.txt'}
              </span>
            </div>

            <div
              className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700"
              role="tablist"
              aria-label="Classroom Workspace Layout Switcher"
            >
              <button
                type="button"
                role="tab"
                aria-selected={workspaceLayout === 'whiteboard'}
                onClick={() => setWorkspaceLayout('whiteboard')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  workspaceLayout === 'whiteboard'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Whiteboard</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={workspaceLayout === 'split'}
                onClick={() => setWorkspaceLayout('split')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  workspaceLayout === 'split'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span>Split View (PDF + Board)</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={workspaceLayout === 'document'}
                onClick={() => setWorkspaceLayout('document')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  workspaceLayout === 'document'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Source Document</span>
              </button>
            </div>
          </div>

          {workspaceLayout === 'document' ? (
            /* Full-Width Source Document Viewer Mode */
            <SourceMaterialViewer
              sourceFile={sourceFile}
              sourceFileUrl={sourceFileUrl}
              fileName={sourceFileName}
              contentType={sourceContentType}
              pageCount={sourcePageCount}
              rawSourceText={rawSourceText}
              onAskTutorAboutParagraph={(snippet) => {
                void handleSendChatMessage(
                  `Can you explain this passage from my study material: "${snippet.slice(0, 220)}..."`,
                  'freeform'
                );
              }}
            />
          ) : (
            /* Whiteboard or Side-by-Side Split View (PDF + Board) */
            <div
              className={
                workspaceLayout === 'split'
                  ? 'grid grid-cols-1 xl:grid-cols-2 gap-5 items-start'
                  : 'space-y-6'
              }
            >
              {workspaceLayout === 'split' && (
                <div className="xl:sticky xl:top-6">
                  <SourceMaterialViewer
                    sourceFile={sourceFile}
                    sourceFileUrl={sourceFileUrl}
                    fileName={sourceFileName}
                    contentType={sourceContentType}
                    pageCount={sourcePageCount}
                    rawSourceText={rawSourceText}
                    compact
                    onAskTutorAboutParagraph={(snippet) => {
                      void handleSendChatMessage(
                        `Can you explain this passage from my study material: "${snippet.slice(0, 220)}..."`,
                        'freeform'
                      );
                    }}
                  />
                </div>
              )}

              <div className="space-y-6">
                {/* Active Concept Canvas Card */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
                  {/* Module Title & Speak Narration Trigger */}
                  <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                        Module {String(activeModuleIndex + 1).padStart(2, '0')} of{' '}
                        {String(lesson.modules.length).padStart(2, '0')} · Active Concept Canvas
                      </p>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display mt-0.5">
                        {activeModule.title}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={handleReplayExplanation}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{isSpeaking ? 'Restart Voice Narration' : 'Narrate Concept Aloud'}</span>
                    </button>
                  </div>

            {/* 1. The Big Idea (TL;DR) Callout Box */}
            <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/60 dark:bg-indigo-950/30 p-5">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  The Big Idea (TL;DR)
                </span>
                <span className="text-[11px] font-mono text-indigo-600/80 dark:text-indigo-400/80">
                  core_concept
                </span>
              </div>
              <p className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                {activeModule.core_concept}
              </p>
            </div>

            {/* 2. The Mental Model / Analogy (Side-by-Side Comparison + Interactive Concept Sandbox) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-display">
                  The Mental Model & Everyday Analogy
                </h3>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  visual_analogy
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      Target Technical Concept
                    </span>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white font-display mt-1">
                      {activeModule.visual_analogy.target_concept}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">
                    Spoken Script: &ldquo;{activeModule.spoken_narration}&rdquo;
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-200/90 dark:border-emerald-800/70 bg-emerald-50/40 dark:bg-emerald-950/25 p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-mono text-emerald-700 dark:text-emerald-300">
                      Everyday Parallel (Intuition Anchor)
                    </span>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1.5 leading-relaxed">
                      {activeModule.visual_analogy.everyday_parallel}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/50 flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-300">
                    <span>Pedagogy: {tutorConfig.methodology}</span>
                    <span>Simplicity: {tutorConfig.simplicity_level}/5</span>
                  </div>
                </div>
              </div>

              {/* Interactive Concept Simulation Canvas */}
              <ConceptSimulationDiagram
                moduleId={activeModule.module_id}
                moduleIndex={activeModuleIndex}
                title={activeModule.title}
              />
            </div>

            {/* 3. Key Breakdown Cards (Dynamically Highlighted During Narration or Tutor Chat Reply) */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-display">
                  Key Breakdown & Visual Anchors
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {isSpeaking
                    ? 'Highlighting points dynamically with voice narration'
                    : 'Click any point card to hear the tutor focus on it'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {activeModule.key_points.map((point, idx) => {
                  const isHighlighted = activeKeyPointIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActiveKeyPointIndex(idx);
                        speakTextAloud(point, { fixedPointIndex: idx });
                      }}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-start justify-between gap-4 cursor-pointer ${
                        isHighlighted
                          ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/60 ring-1 ring-indigo-500/30'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-mono font-semibold shrink-0 ${
                            isHighlighted
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          0{idx + 1}
                        </span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                          {point}
                        </span>
                      </div>

                      <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 shrink-0">
                        {isHighlighted && isSpeaking ? 'Speaking...' : 'Speak'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. The "True Understanding" Gate (Interactive Checkpoint -> Endpoint C) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                  The &ldquo;True Understanding&rdquo; Gate — Interactive Checkpoint
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {isCurrentMastered ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Module Mastered
                  </span>
                ) : (
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    POST /api/v1/evaluate-checkpoint
                  </span>
                )}
              </div>
            </div>

            {/* Spoken Question Prompt */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  Concept Check Prompt:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    speakTextAloud(activeModule.understanding_check.question_spoken, {
                      fixedPointIndex: null,
                    })
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Read Prompt Aloud
                </button>
              </div>
              <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                &ldquo;{activeModule.understanding_check.question_spoken}&rdquo;
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                <div>
                  <span>Target concepts: </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {activeModule.understanding_check.expected_concepts.join(' · ')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHint((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline font-medium cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  {showHint ? 'Hide Hint' : 'Need a Hint?'}
                </button>
              </div>

              {showHint && (
                <p className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-amber-700 dark:text-amber-300">
                  Hint: {activeModule.understanding_check.hint}
                </p>
              )}
            </div>

            {/* Student Answer Input (Voice or Text) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="checkpoint-answer-input"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Your Explanation (In Your Own Words):
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const sample = `If the step size is way too high, our hiker will ${
                      activeModule.understanding_check.expected_concepts[0] || 'overshoot'
                    } the lowest valley and ${
                      activeModule.understanding_check.expected_concepts[1] || 'diverge'
                    } across the walls, missing the minimum.`;
                    setCheckpointAnswers((prev) => ({
                      ...prev,
                      [activeModule.module_id]: sample,
                    }));
                  }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                >
                  Fill Sample Explanation
                </button>
              </div>

              <textarea
                id="checkpoint-answer-input"
                rows={3}
                value={currentAnswer}
                onChange={(e) =>
                  setCheckpointAnswers((prev) => ({
                    ...prev,
                    [activeModule.module_id]: e.target.value,
                  }))
                }
                placeholder="Type your explanation here, or click 'Answer by Voice' to speak directly to your AI Tutor..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => toggleMicrophone('checkpoint')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isListening && activeMicTarget === 'checkpoint'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {isListening && activeMicTarget === 'checkpoint' ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      <span>Stop Recording Voice</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Answer by Voice (Mic)</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={!currentAnswer.trim() || isEvaluatingCheckpoint}
                    onClick={() => void handleSubmitCheckpoint()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {isEvaluatingCheckpoint ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Evaluating...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verify Understanding</span>
                      </>
                    )}
                  </button>

                  {activeModuleIndex < lesson.modules.length - 1 && (
                    <button
                      type="button"
                      disabled={!isCurrentMastered}
                      onClick={() => handleSwitchModule(activeModuleIndex + 1)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <span>Next Module</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Checkpoint Evaluation Feedback Banner (Endpoint C Schema) */}
            {currentEvaluation && (
              <div
                role="status"
                className={`p-4 rounded-xl border space-y-3 ${
                  currentEvaluation.passed
                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 text-slate-900 dark:text-slate-100'
                    : 'border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 text-slate-900 dark:text-slate-100'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    {currentEvaluation.passed
                      ? 'Mastery Confirmed — True Understanding Gate Passed'
                      : 'Keep Refining Your Explanation'}
                  </span>
                  <span className="text-xs font-mono tabular-nums font-semibold">
                    Mastery Score: {currentEvaluation.mastery_score}%
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                  {currentEvaluation.written_summary}
                </p>

                {currentEvaluation.spoken_feedback &&
                  currentEvaluation.spoken_feedback !== currentEvaluation.written_summary && (
                    <p className="text-xs italic text-slate-600 dark:text-slate-400">
                      Spoken Feedback: &ldquo;{currentEvaluation.spoken_feedback}&rdquo;
                    </p>
                  )}

                {/* Matched & Missed Concepts Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="text-xs">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300 block mb-1">
                      Concepts Matched ({currentEvaluation.concepts_matched.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentEvaluation.concepts_matched.length > 0 ? (
                        currentEvaluation.concepts_matched.map((c) => (
                          <span
                            key={c}
                            className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-mono text-[11px]"
                          >
                            ✓ {c}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500">None detected yet</span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs">
                    <span className="font-semibold text-amber-700 dark:text-amber-300 block mb-1">
                      Concepts Missed ({currentEvaluation.concepts_missed.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentEvaluation.concepts_missed.length > 0 ? (
                        currentEvaluation.concepts_missed.map((c) => (
                          <span
                            key={c}
                            className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-mono text-[11px]"
                          >
                            ○ {c}
                          </span>
                        ))
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
                          All target concepts covered!
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {currentEvaluation.follow_up_hint && (
                  <p className="text-xs text-amber-700 dark:text-amber-300 pt-1 border-t border-amber-200/60 dark:border-amber-800/60">
                    Follow-Up Hint: {currentEvaluation.follow_up_hint}
                  </p>
                )}
              </div>
            )}
          </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Multimodal AI Tutor & Live Comms (30% width -> 4 of 12 cols on lg) */}
        <aside className="lg:col-span-4 lg:sticky lg:top-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
          {/* 1. AI Voice Orb / Avatar Header & Playback Controls */}
          <div className="p-5 bg-slate-900 dark:bg-slate-950 text-white border-b border-slate-800 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Animated Audio Visualizer Orb */}
                <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 shrink-0">
                  <div
                    className={`w-7 h-7 rounded-full transition-transform duration-200 flex items-center justify-center ${
                      isListening
                        ? 'bg-rose-500 scale-110'
                        : isSpeaking
                        ? 'bg-indigo-500 scale-105'
                        : 'bg-slate-700 scale-100'
                    }`}
                  >
                    <div className="flex items-end gap-0.5 h-3.5">
                      {[0, 1, 2, 3].map((bar) => (
                        <span
                          key={bar}
                          className={`w-0.5 bg-white rounded-full transition-transform duration-150 ${
                            isSpeaking || isListening
                              ? bar % 2 === 0
                                ? 'h-3.5 scale-y-100'
                                : 'h-2.5 scale-y-95'
                              : 'h-1 scale-y-75'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-bold font-display text-white">
                    Multimodal AI Tutor
                  </h2>
                  <p className="text-xs font-mono text-indigo-300">
                    {isListening
                      ? 'Listening to your microphone...'
                      : isTutorReplying
                      ? 'Thinking & generating reply...'
                      : isSpeaking
                      ? 'Speaking explanation aloud...'
                      : isPaused
                      ? 'Voice paused'
                      : 'Ready for voice or text'}
                  </p>
                </div>
              </div>

              {/* Speed Toggle (1x, 1.25x, 1.5x) */}
              <button
                type="button"
                onClick={handleCycleSpeed}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono tabular-nums font-semibold text-indigo-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                aria-label={`Playback speed ${playbackSpeed}x. Click to cycle speed.`}
              >
                {playbackSpeed}x
              </button>
            </div>

            {/* Playback Controls Bar: Play/Pause, Replay, Mute/Unmute */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={handleTogglePlayPause}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {isSpeaking && !isPaused ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>{isPaused ? 'Resume' : 'Play Voice'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleReplayExplanation}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Replay</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const nextMute = !isMuted;
                  setIsMuted(nextMute);
                  if (nextMute) {
                    stopSpeechInternal();
                  }
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {isMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                    <span>Muted</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>TTS On</span>
                  </>
                )}
              </button>
            </div>

            {/* Live Neural Voice Picker Dropdown (Badging Natural & Google voices as HD) */}
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <label
                  htmlFor="tutor-voice-picker"
                  className="font-mono text-slate-300 flex items-center gap-1.5"
                >
                  <span>Neural Voice Engine</span>
                  {activeVoiceOption?.isHd && (
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-400/40 text-[10px] font-mono font-bold text-indigo-300">
                      HD
                    </span>
                  )}
                </label>
                <span className="font-mono text-slate-400 tabular-nums">
                  {getPersonaProsody(tutorConfig.persona).rate}x · Pitch{' '}
                  {getPersonaProsody(tutorConfig.persona).pitch}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  id="tutor-voice-picker"
                  aria-label="Select Tutor TTS Voice"
                  value={activeVoiceOption?.voiceURI || ''}
                  onChange={(e) => {
                    const nextURI = e.target.value;
                    setUserSelectedVoiceURI(nextURI);
                    const picked = rankedVoices.find((v) => v.voiceURI === nextURI);
                    const cleanLabel = picked
                      ? picked.name.replace(/\s*-\s*English.*$/i, '').trim()
                      : 'your selected neural voice';
                    speakTextAloud(
                      `Hi there! I'm now speaking with ${cleanLabel}. Let's explore ${activeModule.title} together.`,
                      { fixedPointIndex: null, overrideVoiceURI: nextURI }
                    );
                  }}
                  className="flex-1 min-w-0 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 px-2.5 py-1.5 text-xs text-slate-100 font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {rankedVoices.map((voice) => (
                    <option
                      key={voice.voiceURI}
                      value={voice.voiceURI}
                      className="bg-slate-900 text-slate-100"
                    >
                      {voice.displayLabel}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    const currentURI = activeVoiceOption?.voiceURI || '';
                    const cleanLabel = activeVoiceOption
                      ? activeVoiceOption.name.replace(/\s*-\s*English.*$/i, '').trim()
                      : 'your neural tutor voice';
                    speakTextAloud(
                      `Voice preview active for ${cleanLabel}. Ready to continue ${activeModule.title}.`,
                      { fixedPointIndex: null, overrideVoiceURI: currentURI }
                    );
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-mono font-semibold text-indigo-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  title="Preview selected voice aloud"
                >
                  Preview
                </button>
              </div>
            </div>

            {/* Endpoint E Toggle: Stream Tutor Replies (SSE) */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Radio className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Stream Tutor Replies (SSE)</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={sseStreamingEnabled}
                onClick={() => onToggleSseStreaming(!sseStreamingEnabled)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  sseStreamingEnabled
                    ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {sseStreamingEnabled ? 'SSE ON (/stream)' : 'JSON (?stream=false)'}
              </button>
            </div>

            {micStatusNote && (
              <p className="text-[11px] font-mono text-amber-300 bg-slate-800/90 px-2.5 py-1.5 rounded border border-slate-700">
                {micStatusNote}
              </p>
            )}
          </div>

          {/* 2. Synchronized Chat & Transcript Stream */}
          <div className="p-4 space-y-3 overflow-y-auto max-h-[380px] min-h-[280px] bg-slate-50/50 dark:bg-slate-950/40">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-200/70 dark:border-slate-800">
              <span>Synchronized Voice & Text Transcript</span>
              <span>{transcript.length} entries</span>
            </div>

            {transcript.map((item) => {
              const isTutor = item.sender === 'tutor';
              return (
                <div
                  key={item.id}
                  className={`flex flex-col ${isTutor ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {isTutor ? 'AI Tutor' : 'You'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{item.tag}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{item.timestamp}</span>
                  </div>

                  <div
                    className={`rounded-xl px-3.5 py-2.5 text-xs leading-relaxed max-w-[92%] whitespace-pre-wrap ${
                      isTutor
                        ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {item.text}
                  </div>
                </div>
              );
            })}
            <div ref={transcriptEndRef} />
          </div>

          {/* 3. Contextual Quick-Action Chips, Suggested Follow-Ups & Dual-Mode Input Bar */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-3">
            {/* Suggested Follow-Ups from Backend Response */}
            {suggestedFollowUps.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 block">
                  Suggested Follow-Ups:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedFollowUps.map((followUp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isTutorReplying}
                      onClick={() => void handleSendChatMessage(followUp, 'freeform')}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer truncate max-w-full"
                    >
                      {followUp}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Contextual Quick-Action Buttons */}
            <div className="flex flex-wrap gap-1.5">
              {quickActionItems.map((item) => (
                <button
                  key={item.action}
                  type="button"
                  disabled={isTutorReplying}
                  onClick={() => void handleSendChatMessage(item.label, item.action)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Dual-Mode Input Bar: Text Input + Push-to-Talk Microphone + Send */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendChatMessage(undefined, 'freeform');
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => toggleMicrophone('chat')}
                aria-label={
                  isListening && activeMicTarget === 'chat'
                    ? 'Stop voice input'
                    : 'Push to talk voice input'
                }
                className={`p-2.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                  isListening && activeMicTarget === 'chat'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              >
                {isListening && activeMicTarget === 'chat' ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>

              <label htmlFor="tutor-chat-input" className="sr-only">
                Ask the AI Tutor a question
              </label>
              <input
                id="tutor-chat-input"
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask a question or click mic to speak..."
                className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <button
                type="submit"
                disabled={!chatInput.trim() || isTutorReplying}
                aria-label="Send message to tutor"
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors cursor-pointer shrink-0"
              >
                {isTutorReplying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        </aside>
      </div>
    </section>
  );
}
