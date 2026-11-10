'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Play,
  Check,
  RotateCcw,
  ArrowRight,
  FileText,
  Sliders,
  Mic,
  Server,
  Code2,
  Copy,
  Terminal,
  Activity,
  Radio,
  AlertCircle,
  CheckCircle2,
  Video,
} from 'lucide-react';
import {
  EducationLevel,
  SimplicityLevel,
  TeachingMethodology,
  TutorPersona,
  IncomingLessonResponse,
  ParseDocumentResponse,
  EndpointKey,
  ApiTrafficLogEntry,
  DEFAULT_BACKEND_BASE_URL,
  DEFAULT_OUTGOING_REQUEST,
  DEFAULT_INCOMING_LESSON,
  PRESET_STUDY_MATERIALS,
  buildOutgoingPayload,
  buildSynthesizedPdfBytes,
  estimateFileMetadata,
  getYouTubeEmbedUrl as convertYouTubeUrlToEmbed,
  normalizeBaseUrl,
  synthesizeAdaptiveLessonFromPayload,
  validateIncomingLessonJson,
} from '@/lib/tutor-contracts';
import { SetupStudio } from '@/components/setup-studio';
import { InteractiveClassroom } from '@/components/interactive-classroom';
import { DeveloperDebugDrawer } from '@/components/developer-debug-drawer';

const DEFAULT_DEMO_YOUTUBE_URL = 'https://youtu.be/pQrWq7AJuJY';
const DEMO_YOUTUBE_STORAGE_KEY = 'socratica_demo_youtube_url';

const ENDPOINT_INSPECTOR_TABS: { key: EndpointKey; label: string; path: string }[] = [
  { key: 'parse-document', label: 'A. Parse Document', path: '/api/v1/parse-document' },
  { key: 'generate-lesson', label: 'B. Generate Lesson', path: '/api/v1/generate-lesson' },
  {
    key: 'evaluate-checkpoint',
    label: 'C. Evaluate Checkpoint',
    path: '/api/v1/evaluate-checkpoint',
  },
  { key: 'tutor-chat', label: 'D/E. Tutor Chat', path: '/api/v1/tutor-chat' },
];

function getYouTubeEmbedUrl(url: string): string {
  return convertYouTubeUrlToEmbed(url);
}

export default function MultimodalTutorApp() {
  // Active View: 'demo' (00 // Demo - Default Landing Page) | 'studio' (01 // Setup Studio) | 'classroom' (02 // Classroom) | 'developer' (03 // Developer Options)
  const [activeView, setActiveView] = useState<'demo' | 'studio' | 'classroom' | 'developer'>(
    'demo'
  );

  // Configurable YouTube Demo Video State (persisted in localStorage, managed in 03 // Developer Options)
  const [demoYoutubeUrl, setDemoYoutubeUrl] = useState<string>(DEFAULT_DEMO_YOUTUBE_URL);
  const [demoUrlInputDraft, setDemoUrlInputDraft] = useState<string>(DEFAULT_DEMO_YOUTUBE_URL);
  const [demoUrlSavedNotice, setDemoUrlSavedNotice] = useState<boolean>(false);

  // Dark / Light Academic Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Setup Studio State (initialized from DEFAULT_OUTGOING_REQUEST)
  const [sessionId] = useState<string>(DEFAULT_OUTGOING_REQUEST.session_id);
  const [fileName, setFileName] = useState<string>(
    DEFAULT_OUTGOING_REQUEST.source_material.file_name
  );
  const [contentType, setContentType] = useState<string>(
    DEFAULT_OUTGOING_REQUEST.source_material.content_type
  );
  const [rawText, setRawText] = useState<string>(
    DEFAULT_OUTGOING_REQUEST.source_material.raw_text_extracted
  );
  const [explicitByteSize, setExplicitByteSize] = useState<number | undefined>(undefined);
  const [explicitPageCount, setExplicitPageCount] = useState<number | undefined>(undefined);
  const [explicitWordCount, setExplicitWordCount] = useState<number | undefined>(undefined);
  const [explicitReadingMinutes, setExplicitReadingMinutes] = useState<number | undefined>(
    undefined
  );

  // Preserved Uploaded File & Browser Object URL for View 2 Classroom Viewer
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceFileUrl, setSourceFileUrl] = useState<string | null>(null);
  const activeObjectUrlRef = useRef<string | null>(null);

  const replaceSourceFileAndBlobUrl = useCallback((nextFile: File | null) => {
    if (activeObjectUrlRef.current) {
      URL.revokeObjectURL(activeObjectUrlRef.current);
      activeObjectUrlRef.current = null;
    }
    setSourceFile(nextFile);
    if (nextFile && typeof window !== 'undefined' && typeof URL.createObjectURL === 'function') {
      const nextUrl = URL.createObjectURL(nextFile);
      activeObjectUrlRef.current = nextUrl;
      setSourceFileUrl(nextUrl);
    } else {
      setSourceFileUrl(null);
    }
  }, []);

  // Load persisted Demo YouTube URL from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = window.setTimeout(() => {
      try {
        const savedUrl = window.localStorage.getItem(DEMO_YOUTUBE_STORAGE_KEY);
        if (savedUrl && savedUrl.trim().length > 0) {
          setDemoYoutubeUrl(savedUrl.trim());
          setDemoUrlInputDraft(savedUrl.trim());
        }
      } catch {
        // ignore storage errors
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleSaveDemoYoutubeUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = demoUrlInputDraft.trim() || DEFAULT_DEMO_YOUTUBE_URL;
    setDemoYoutubeUrl(cleaned);
    setDemoUrlInputDraft(cleaned);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(DEMO_YOUTUBE_STORAGE_KEY, cleaned);
      }
    } catch {
      // ignore storage errors
    }
    setDemoUrlSavedNotice(true);
    window.setTimeout(() => setDemoUrlSavedNotice(false), 1800);
  };

  const handleResetDemoYoutubeUrl = () => {
    setDemoYoutubeUrl(DEFAULT_DEMO_YOUTUBE_URL);
    setDemoUrlInputDraft(DEFAULT_DEMO_YOUTUBE_URL);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(DEMO_YOUTUBE_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  };

  // Initialize a synthesized PDF Blob URL for the default PDF preset so View 2 PDF Viewer works out of the box, and revoke on unmount
  useEffect(() => {
    if (typeof window === 'undefined' || typeof URL.createObjectURL !== 'function') return;
    const initTimer = window.setTimeout(() => {
      if (!activeObjectUrlRef.current) {
        const pdfBytes = buildSynthesizedPdfBytes(
          DEFAULT_INCOMING_LESSON.chapter_title,
          DEFAULT_OUTGOING_REQUEST.source_material.raw_text_extracted
        );
        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        activeObjectUrlRef.current = url;
        setSourceFileUrl(url);
      }
    }, 0);

    return () => {
      window.clearTimeout(initTimer);
      if (activeObjectUrlRef.current) {
        URL.revokeObjectURL(activeObjectUrlRef.current);
        activeObjectUrlRef.current = null;
      }
    };
  }, []);

  // Pedagogical Configuration State
  const [educationLevel, setEducationLevel] = useState<EducationLevel>(
    DEFAULT_OUTGOING_REQUEST.tutor_config.education_level
  );
  const [simplicityLevel, setSimplicityLevel] = useState<SimplicityLevel>(
    DEFAULT_OUTGOING_REQUEST.tutor_config.simplicity_level
  );
  const [methodology, setMethodology] = useState<TeachingMethodology>(
    DEFAULT_OUTGOING_REQUEST.tutor_config.methodology
  );
  const [focusAreas, setFocusAreas] = useState<string[]>(
    DEFAULT_OUTGOING_REQUEST.tutor_config.focus_areas
  );
  const [persona, setPersona] = useState<TutorPersona>(
    DEFAULT_OUTGOING_REQUEST.tutor_config.persona
  );

  // Backend Execution Mode: Default to Live API Mode (mockBackendMode = false) with https://tutor-poc-backend.vercel.app
  const [mockBackendMode, setMockBackendMode] = useState<boolean>(false);
  const [backendBaseUrl, setBackendBaseUrl] = useState<string>(DEFAULT_BACKEND_BASE_URL);
  const [sseStreamingEnabled, setSseStreamingEnabled] = useState<boolean>(false);

  // Document Parsing & Lesson Generation Loading States
  const [isParsingDocument, setIsParsingDocument] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStepText, setGenerationStepText] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Classroom & Incoming Lesson State
  const [incomingLesson, setIncomingLesson] = useState<IncomingLessonResponse>(
    DEFAULT_INCOMING_LESSON
  );
  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0);
  const [masteredModuleIds, setMasteredModuleIds] = useState<string[]>([]);
  const [autoSpeakTrigger, setAutoSpeakTrigger] = useState<number>(0);

  // Developer Options Page & Sandbox State (Lifted into app/page.tsx)
  const [isDebugDrawerOpen, setIsDebugDrawerOpen] = useState<boolean>(false);
  const [copiedOutgoingJson, setCopiedOutgoingJson] = useState<boolean>(false);
  const [incomingLessonJsonDraft, setIncomingLessonJsonDraft] = useState<string>(() =>
    JSON.stringify(DEFAULT_INCOMING_LESSON, null, 2)
  );
  const [incomingJsonValidationError, setIncomingJsonValidationError] = useState<string | null>(
    null
  );
  const [incomingJsonAppliedNotice, setIncomingJsonAppliedNotice] = useState<boolean>(false);
  const [selectedTrafficEndpoint, setSelectedTrafficEndpoint] =
    useState<EndpointKey>('generate-lesson');

  const [apiTrafficLogs, setApiTrafficLogs] = useState<
    Record<EndpointKey, ApiTrafficLogEntry | null>
  >({
    'parse-document': null,
    'generate-lesson': null,
    'evaluate-checkpoint': null,
    'tutor-chat': null,
  });

  const handleLogApiTraffic = useCallback(
    (
      endpoint: EndpointKey,
      url: string,
      status: number | 'pending' | 'mock' | 'error',
      requestPayload: unknown,
      responsePayload: unknown
    ) => {
      setApiTrafficLogs((prev) => ({
        ...prev,
        [endpoint]: {
          endpoint,
          method: 'POST',
          url,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          status,
          requestPayload,
          responsePayload,
        },
      }));
    },
    []
  );

  // Support ?autostart=1 or ?view=... query params
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1' || params.get('view') === 'classroom') {
        setActiveView('classroom');
      } else if (params.get('view') === 'studio') {
        setActiveView('studio');
      } else if (params.get('view') === 'developer') {
        setActiveView('developer');
      } else if (params.get('view') === 'demo') {
        setActiveView('demo');
      }
    };
    const timer = window.setTimeout(syncFromUrl, 0);
    window.addEventListener('popstate', syncFromUrl);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('popstate', syncFromUrl);
    };
  }, []);

  // Sync dark mode class on <html>
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (isDarkMode) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [isDarkMode]);

  // Ensure viewport scrolls cleanly to top when switching views
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [activeView]);

  // Derived Outgoing Payload & File Metadata
  const outgoingPayload = useMemo(
    () =>
      buildOutgoingPayload({
        sessionId,
        fileName,
        contentType,
        rawText,
        educationLevel,
        simplicityLevel,
        methodology,
        focusAreas,
        persona,
      }),
    [
      sessionId,
      fileName,
      contentType,
      rawText,
      educationLevel,
      simplicityLevel,
      methodology,
      focusAreas,
      persona,
    ]
  );

  const fileMeta = useMemo(
    () =>
      estimateFileMetadata(fileName, contentType, rawText, {
        explicitByteSize,
        explicitPageCount,
        explicitWordCount,
        explicitReadingMinutes,
      }),
    [
      fileName,
      contentType,
      rawText,
      explicitByteSize,
      explicitPageCount,
      explicitWordCount,
      explicitReadingMinutes,
    ]
  );

  const handleSelectPreset = (presetId: string) => {
    const found = PRESET_STUDY_MATERIALS.find((p) => p.id === presetId);
    if (!found) return;
    setFileName(found.fileName);
    setContentType(found.contentType);
    setRawText(found.rawText);
    setExplicitByteSize(undefined);
    setExplicitPageCount(undefined);
    setExplicitWordCount(undefined);
    setExplicitReadingMinutes(undefined);
    setParseError(null);
    setIncomingLesson(found.lesson);
    setIncomingLessonJsonDraft(JSON.stringify(found.lesson, null, 2));
    setActiveModuleIndex(0);
    setMasteredModuleIds([]);

    // If preset is a PDF, create a valid PDF Blob URL so the embedded PDF viewer in View 2 renders it natively
    if (found.contentType === 'application/pdf' && typeof window !== 'undefined') {
      const pdfBytes = buildSynthesizedPdfBytes(found.lesson.chapter_title, found.rawText);
      const synthFile = new File([pdfBytes.buffer as ArrayBuffer], found.fileName, {
        type: 'application/pdf',
      });
      replaceSourceFileAndBlobUrl(synthFile);
    } else {
      replaceSourceFileAndBlobUrl(null);
    }
  };

  const handleUpdateMaterial = (
    newFileName: string,
    newContentType: string,
    newRawText: string,
    byteSize?: number
  ) => {
    setFileName(newFileName);
    setContentType(newContentType);
    setRawText(newRawText);
    setExplicitByteSize(byteSize);
    setExplicitPageCount(undefined);
    setExplicitWordCount(undefined);
    setExplicitReadingMinutes(undefined);
  };

  // Endpoint A: POST ${baseUrl}/api/v1/parse-document with multipart/form-data
  const handleUploadFileToBackend = async (file: File) => {
    replaceSourceFileAndBlobUrl(file);
    setParseError(null);
    setIsParsingDocument(true);

    const cleanBase = normalizeBaseUrl(backendBaseUrl);
    const parseUrl = `${cleanBase}/api/v1/parse-document`;
    const formMetaSummary = {
      multipart_field: 'file',
      file_name: file.name,
      file_size_bytes: file.size,
      file_type: file.type || 'application/octet-stream',
    };

    try {
      if (mockBackendMode) {
        await new Promise((r) => setTimeout(r, 450));
        const text = await file.text();
        const meta = estimateFileMetadata(file.name, file.type || 'text/plain', text, {
          explicitByteSize: file.size,
        });
        const mockResp: ParseDocumentResponse = {
          file_name: meta.fileName,
          content_type: meta.contentType,
          page_count: meta.pageCount,
          word_count: meta.wordCount,
          estimated_reading_time_minutes: meta.estimatedReadingMinutes,
          raw_text_extracted:
            text.trim().length >= 20
              ? text
              : `Extracted study material from ${file.name}: core domain principles, mathematical relationships, and practical mechanisms.`,
        };

        handleLogApiTraffic(
          'parse-document',
          'mock://api/v1/parse-document',
          'mock',
          formMetaSummary,
          mockResp
        );

        setFileName(mockResp.file_name);
        setContentType(mockResp.content_type);
        setRawText(mockResp.raw_text_extracted);
        setExplicitByteSize(file.size);
        setExplicitPageCount(mockResp.page_count);
        setExplicitWordCount(mockResp.word_count);
        setExplicitReadingMinutes(mockResp.estimated_reading_time_minutes);
        return;
      }

      handleLogApiTraffic('parse-document', parseUrl, 'pending', formMetaSummary, {
        status: 'Parsing document via NVIDIA Nemotron Parse...',
      });

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(parseUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText.slice(0, 180)}`);
      }

      const data = (await response.json()) as ParseDocumentResponse;
      handleLogApiTraffic('parse-document', parseUrl, response.status, formMetaSummary, data);

      setFileName(data.file_name || file.name);
      setContentType(data.content_type || file.type || 'application/pdf');
      setRawText(data.raw_text_extracted || '');
      setExplicitByteSize(file.size);
      setExplicitPageCount(
        typeof data.page_count === 'number' && data.page_count >= 1
          ? data.page_count
          : 1
      );
      setExplicitWordCount(
        typeof data.word_count === 'number' && data.word_count >= 0
          ? data.word_count
          : undefined
      );
      setExplicitReadingMinutes(
        typeof data.estimated_reading_time_minutes === 'number' &&
          data.estimated_reading_time_minutes >= 1
          ? data.estimated_reading_time_minutes
          : undefined
      );
    } catch (err) {
      const localText = await file.text().catch(() => '');
      const cleanLocal =
        localText.trim().length >= 20
          ? localText
          : `Study material uploaded from ${file.name} (${file.size} bytes). Ready for interactive concept synthesis.`;

      handleLogApiTraffic('parse-document', parseUrl, 'error', formMetaSummary, {
        error: err instanceof Error ? err.message : 'Failed to reach /api/v1/parse-document',
        fallback_extracted_chars: cleanLocal.length,
      });

      setFileName(file.name);
      setContentType(file.type || 'text/plain');
      setRawText(cleanLocal);
      setExplicitByteSize(file.size);
      setParseError(
        `Backend parse notice (${
          err instanceof Error ? err.message : 'Network error'
        }) — loaded local file text fallback so you can continue.`
      );
    } finally {
      setIsParsingDocument(false);
    }
  };

  const handleToggleFocusArea = (area: string) => {
    setFocusAreas((prev) => {
      if (prev.includes(area)) {
        return prev.length > 1 ? prev.filter((a) => a !== area) : prev;
      }
      return [...prev, area];
    });
  };

  // Endpoint B: POST ${baseUrl}/api/v1/generate-lesson
  const handleGenerateLesson = async () => {
    setGenerationError(null);

    if (outgoingPayload.source_material.raw_text_extracted.trim().length < 20) {
      setGenerationError(
        'Please provide at least 20 characters of extracted or pasted study material before generating a lesson.'
      );
      return;
    }

    setIsGenerating(true);
    const cleanBase = normalizeBaseUrl(backendBaseUrl);
    const generateUrl = `${cleanBase}/api/v1/generate-lesson`;

    let progressInterval: ReturnType<typeof setInterval> | null = null;

    try {
      if (mockBackendMode) {
        setGenerationStepText('1/3 Extracting source text & concepts...');
        await new Promise((r) => setTimeout(r, 180));
        setGenerationStepText('2/3 Synthesizing spoken scripts & analogies...');
        await new Promise((r) => setTimeout(r, 180));
        setGenerationStepText('3/3 Building Feynman understanding gates...');
        await new Promise((r) => setTimeout(r, 180));

        const synthesized = synthesizeAdaptiveLessonFromPayload(outgoingPayload);
        handleLogApiTraffic(
          'generate-lesson',
          'mock://api/v1/generate-lesson',
          'mock',
          outgoingPayload,
          synthesized
        );

        setIncomingLesson(synthesized);
        setIncomingLessonJsonDraft(JSON.stringify(synthesized, null, 2));
        setActiveModuleIndex(0);
        setMasteredModuleIds([]);
        setIsGenerating(false);
        setGenerationStepText('');
        setActiveView('classroom');
        setAutoSpeakTrigger((prev) => prev + 1);
        return;
      }

      const stages = [
        'Step 1/4: Sending study material to Nemotron 3.5 Bolt...',
        'Step 2/4: Deep reasoning (enable_thinking=True) on core concepts...',
        'Step 3/4: Crafting spoken narration & everyday mental models...',
        'Step 4/4: Finalizing Feynman checkpoints & JSON schema...',
      ];
      let stageIdx = 0;
      setGenerationStepText(stages[0]);
      progressInterval = setInterval(() => {
        stageIdx = Math.min(stages.length - 1, stageIdx + 1);
        setGenerationStepText(stages[stageIdx]);
      }, 4500);

      handleLogApiTraffic('generate-lesson', generateUrl, 'pending', outgoingPayload, {
        status: 'Awaiting nvidia/nemotron-3.5-bolt-e4b response...',
      });

      const response = await fetch(generateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outgoingPayload),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(
          `Backend returned HTTP ${response.status}: ${errBody.slice(0, 200)}`
        );
      }

      const rawJson = await response.text();
      const validated = validateIncomingLessonJson(rawJson);
      if (!validated.valid) {
        throw new Error(`Invalid IncomingLessonResponse contract: ${validated.error}`);
      }

      handleLogApiTraffic(
        'generate-lesson',
        generateUrl,
        response.status,
        outgoingPayload,
        validated.data
      );

      setIncomingLesson(validated.data);
      setIncomingLessonJsonDraft(JSON.stringify(validated.data, null, 2));
      setActiveModuleIndex(0);
      setMasteredModuleIds([]);
      setIsGenerating(false);
      setGenerationStepText('');
      setActiveView('classroom');
      setAutoSpeakTrigger((prev) => prev + 1);
    } catch (err) {
      handleLogApiTraffic('generate-lesson', generateUrl, 'error', outgoingPayload, {
        error: err instanceof Error ? err.message : 'Failed to generate lesson',
      });
      setIsGenerating(false);
      setGenerationStepText('');
      setGenerationError(
        err instanceof Error
          ? `${err.message} (Tip: You can inspect the payload or switch to Mock Backend Mode in 03 // Developer Options.)`
          : 'Failed to generate lesson from backend endpoint.'
      );
    } finally {
      if (progressInterval) clearInterval(progressInterval);
    }
  };

  const handleMarkModuleMastered = (moduleId: string) => {
    setMasteredModuleIds((prev) =>
      prev.includes(moduleId) ? prev : [...prev, moduleId]
    );
  };

  const handleApplyCustomLessonFromDrawer = (customLesson: IncomingLessonResponse) => {
    setIncomingLesson(customLesson);
    setIncomingLessonJsonDraft(JSON.stringify(customLesson, null, 2));
    setActiveModuleIndex(0);
    setMasteredModuleIds([]);
    setActiveView('classroom');
  };

  const handleCopyOutgoingPayloadJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(outgoingPayload, null, 2));
      setCopiedOutgoingJson(true);
      window.setTimeout(() => setCopiedOutgoingJson(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleApplyIncomingJsonOnDeveloperPage = () => {
    const result = validateIncomingLessonJson(incomingLessonJsonDraft);
    if (!result.valid) {
      setIncomingJsonValidationError(result.error);
      setIncomingJsonAppliedNotice(false);
      return;
    }
    setIncomingJsonValidationError(null);
    setIncomingLesson(result.data);
    setActiveModuleIndex(0);
    setMasteredModuleIds([]);
    setIncomingJsonAppliedNotice(true);
    window.setTimeout(() => setIncomingJsonAppliedNotice(false), 2200);
  };

  const handleResetIncomingJsonOnDeveloperPage = () => {
    const defaultStr = JSON.stringify(DEFAULT_INCOMING_LESSON, null, 2);
    setIncomingLessonJsonDraft(defaultStr);
    setIncomingJsonValidationError(null);
  };

  const activeEmbedUrl = useMemo(() => getYouTubeEmbedUrl(demoYoutubeUrl), [demoYoutubeUrl]);
  const cleanBackendBase = normalizeBaseUrl(backendBaseUrl);
  const currentTrafficEntry = apiTrafficLogs[selectedTrafficEndpoint];

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F2] dark:bg-[#111110] text-zinc-900 dark:text-stone-100">
      {/* Strict 3-Zone Architectural Top Bar (h-14 / 3.5rem) */}
      <header className="h-14 shrink-0 flex items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 border-b border-stone-300/80 dark:border-zinc-800 bg-[#FCFBF9] dark:bg-[#181816]">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('demo');
          }}
          className="text-base font-bold tracking-tight text-zinc-900 dark:text-stone-100 font-display whitespace-nowrap shrink-0"
        >
          Socratica Studio
        </a>

        {/* Zone 2: 4-Tab Navigation Bar (00 // Demo, 01 // Setup Studio, 02 // Classroom, 03 // Developer Options) */}
        <nav
          aria-label="Primary Workspace Navigation"
          className="flex items-center gap-4 sm:gap-6 text-xs font-mono uppercase tracking-wider text-stone-600 dark:text-stone-400 overflow-x-auto no-scrollbar"
        >
          <a
            id="nav-tab-demo"
            href="#demo-showcase"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('demo');
            }}
            className={`hover:text-zinc-900 dark:hover:text-stone-100 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'demo'
                ? 'text-[#D95D39] dark:text-[#E87A5A] font-semibold underline decoration-2 underline-offset-8'
                : ''
            }`}
          >
            00 // Demo
          </a>
          <a
            id="nav-tab-studio"
            href="#setup-studio"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('studio');
            }}
            className={`hover:text-zinc-900 dark:hover:text-stone-100 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'studio'
                ? 'text-[#D95D39] dark:text-[#E87A5A] font-semibold underline decoration-2 underline-offset-8'
                : ''
            }`}
          >
            01 // Setup Studio
          </a>
          <a
            id="nav-tab-classroom"
            href="#interactive-classroom"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('classroom');
            }}
            className={`hover:text-zinc-900 dark:hover:text-stone-100 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'classroom'
                ? 'text-[#D95D39] dark:text-[#E87A5A] font-semibold underline decoration-2 underline-offset-8'
                : ''
            }`}
          >
            02 // Classroom
          </a>
          <a
            id="nav-tab-developer"
            href="#developer-options"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('developer');
            }}
            className={`hover:text-zinc-900 dark:hover:text-stone-100 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'developer'
                ? 'text-[#D95D39] dark:text-[#E87A5A] font-semibold underline decoration-2 underline-offset-8'
                : ''
            }`}
          >
            03 // Developer Options
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          {activeView === 'demo' ? (
            <button
              id="nav-launch-studio-from-header"
              type="button"
              onClick={() => setActiveView('studio')}
              className="px-3.5 py-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-white bg-[#D95D39] hover:bg-[#C04E2C] border border-[#D95D39] rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Setup Studio →
            </button>
          ) : activeView === 'studio' ? (
            <button
              id="nav-interactive-classroom"
              type="button"
              onClick={() => setActiveView('classroom')}
              className="px-3.5 py-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-white bg-[#D95D39] hover:bg-[#C04E2C] border border-[#D95D39] rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Open Classroom →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveView('studio')}
              className="px-3.5 py-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-zinc-900 dark:text-stone-100 bg-[#EFECE6] dark:bg-[#222220] hover:bg-stone-300/70 dark:hover:bg-zinc-700 border border-stone-300/80 dark:border-zinc-700 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              ← Configure Lesson
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Container */}
      <main className={activeView === 'classroom' ? 'flex-1 overflow-hidden' : 'flex-1 pb-16'}>
        {activeView === 'demo' ? (
          /* VIEW 0: 00 // DEMO — CLEAN USER-FACING SYSTEM WALKTHROUGH & VIDEO SHOWCASE */
          <section
            id="demo-showcase-view"
            aria-label="System Walkthrough and Demo Video"
            className="max-w-[1160px] mx-auto px-6 py-8 space-y-6"
          >
            {/* Masthead Header */}
            <div className="space-y-1.5 pb-5 border-b border-stone-300/80 dark:border-zinc-800">
              <p className="uppercase tracking-wider text-[11px] font-mono text-[#D95D39] dark:text-[#E87A5A] font-semibold">
                00 // SYSTEM WALKTHROUGH &amp; DEMO
              </p>
              <h1
                className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-stone-100 font-display"
                style={{ textWrap: 'balance' }}
              >
                Socratica Studio — Multimodal Voice &amp; Concept Classroom
              </h1>
              <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed max-w-3xl">
                Watch the full architectural walkthrough demonstrating document parsing with NVIDIA
                Nemotron Parse, adaptive lesson synthesis, and Socratic/Feynman voice checkpoints.
              </p>
            </div>

            {/* Sharp Architectural 16:9 YouTube Frame */}
            <div className="border border-stone-300 dark:border-zinc-800 bg-[#FCFBF9] dark:bg-[#181816] p-2 sm:p-4 space-y-3">
              {/* Crisp Monospace Header Bar inside Frame */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 border-b border-stone-300/80 dark:border-zinc-800 bg-[#EFECE6]/60 dark:bg-[#222220]">
                <div className="flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-[#D95D39] dark:text-[#E87A5A] shrink-0" />
                  <span className="uppercase tracking-wider text-[11px] font-mono font-bold text-zinc-900 dark:text-stone-100">
                    00 // SYSTEM WALKTHROUGH &amp; DEMO
                  </span>
                </div>
                <span className="text-[11px] font-mono text-stone-500 dark:text-stone-400">
                  16:9 HD · YOUTUBE EMBED STREAM
                </span>
              </div>

              {/* 16:9 Responsive YouTube Iframe */}
              <div className="relative w-full aspect-video bg-[#111110] border border-stone-300/80 dark:border-zinc-800 overflow-hidden">
                <iframe
                  id="demo-youtube-iframe"
                  src={activeEmbedUrl}
                  title="Socratica Studio System Walkthrough and Demo"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>

            {/* 3-Column Architectural Spec Strip & Primary Launch CTA */}
            <div className="border border-stone-300 dark:border-zinc-800 bg-[#FCFBF9] dark:bg-[#181816] divide-y divide-stone-300/80 dark:divide-zinc-800">
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-stone-300/80 dark:divide-zinc-800">
                {/* Column 01 */}
                <div className="p-5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="uppercase tracking-wider text-[11px] font-mono font-bold text-[#D95D39] dark:text-[#E87A5A]">
                      01. UPLOAD &amp; PARSE
                    </span>
                    <FileText className="w-4 h-4 text-stone-500 dark:text-stone-400 shrink-0" />
                  </div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-stone-100 font-display">
                    Manuscript &amp; Diagram Ingestion
                  </h2>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                    Upload PDFs, lecture slides, or raw markdown in the Setup Studio. NVIDIA Nemotron
                    Parse extracts structured text while preserving the original source document for
                    side-by-side inspection.
                  </p>
                </div>

                {/* Column 02 */}
                <div className="p-5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="uppercase tracking-wider text-[11px] font-mono font-bold text-[#D95D39] dark:text-[#E87A5A]">
                      02. DYNAMIC SYNTHESIS
                    </span>
                    <Sliders className="w-4 h-4 text-stone-500 dark:text-stone-400 shrink-0" />
                  </div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-stone-100 font-display">
                    Pedagogical Calibration
                  </h2>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                    Configure target academic level, explanation simplicity (1–5), and Socratic or
                    Feynman methodology. The backend compiles dynamic concept modules with everyday
                    mental models.
                  </p>
                </div>

                {/* Column 03 */}
                <div className="p-5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="uppercase tracking-wider text-[11px] font-mono font-bold text-[#D95D39] dark:text-[#E87A5A]">
                      03. MULTIMODAL MASTERY
                    </span>
                    <Mic className="w-4 h-4 text-stone-500 dark:text-stone-400 shrink-0" />
                  </div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-stone-100 font-display">
                    Interactive Voice &amp; Understanding Gates
                  </h2>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                    Listen to natural neural TTS narration synced with visual breakdowns, test
                    parameters in the Loss Landscape sandbox, and explain concepts aloud to pass the
                    True Understanding Gate.
                  </p>
                </div>
              </div>

              {/* Bottom CTA Bar */}
              <div className="px-5 py-4 bg-[#EFECE6]/70 dark:bg-[#222220] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-zinc-900 dark:text-stone-100 font-display">
                    Ready to configure your own study session?
                  </p>
                  <p className="text-[11px] font-mono text-stone-500 dark:text-stone-400">
                    PROCEED TO STEP 01 // PUBLICATION &amp; SYLLABUS DESK
                  </p>
                </div>

                <button
                  id="launch-setup-studio-btn"
                  type="button"
                  onClick={() => setActiveView('studio')}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-[#D95D39] hover:bg-[#C04E2C] text-white text-xs font-mono font-bold uppercase tracking-wider border border-[#D95D39] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Launch 01 // Setup Studio →</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        ) : activeView === 'studio' ? (
          /* VIEW 1: 01 // SETUP STUDIO — CLEAN USER-FACING UPLOAD & PEDAGOGICAL SPEC DESK */
          <SetupStudio
            fileName={fileName}
            contentType={contentType}
            rawText={rawText}
            fileMeta={fileMeta}
            sourceFile={sourceFile}
            sourceFileUrl={sourceFileUrl}
            educationLevel={educationLevel}
            simplicityLevel={simplicityLevel}
            methodology={methodology}
            focusAreas={focusAreas}
            persona={persona}
            outgoingPayload={outgoingPayload}
            isParsingDocument={isParsingDocument}
            parseError={parseError}
            isGenerating={isGenerating}
            generationStepText={generationStepText}
            generationError={generationError}
            onSelectPreset={handleSelectPreset}
            onUploadFileToBackend={handleUploadFileToBackend}
            onUpdateMaterial={handleUpdateMaterial}
            onChangeEducationLevel={setEducationLevel}
            onChangeSimplicityLevel={setSimplicityLevel}
            onChangeMethodology={setMethodology}
            onToggleFocusArea={handleToggleFocusArea}
            onChangePersona={setPersona}
            onGenerateLesson={handleGenerateLesson}
          />
        ) : activeView === 'classroom' ? (
          /* VIEW 2: 02 // CLASSROOM — 3-PANE INTERACTIVE VOICE & CONCEPT WORKSPACE */
          <InteractiveClassroom
            sessionId={sessionId}
            lesson={incomingLesson}
            tutorConfig={outgoingPayload.tutor_config}
            sourceFile={sourceFile}
            sourceFileUrl={sourceFileUrl}
            sourceFileName={fileName}
            sourceContentType={contentType}
            sourcePageCount={fileMeta.pageCount}
            rawSourceText={rawText}
            activeModuleIndex={activeModuleIndex}
            masteredModuleIds={masteredModuleIds}
            mockBackendMode={mockBackendMode}
            backendBaseUrl={backendBaseUrl}
            sseStreamingEnabled={sseStreamingEnabled}
            isDarkMode={isDarkMode}
            isDebugDrawerOpen={isDebugDrawerOpen}
            autoSpeakTrigger={autoSpeakTrigger}
            onToggleSseStreaming={setSseStreamingEnabled}
            onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
            onToggleDebugDrawer={() => setActiveView('developer')}
            onSelectModule={setActiveModuleIndex}
            onMarkModuleMastered={handleMarkModuleMastered}
            onBackToStudio={() => setActiveView('studio')}
            onLogApiTraffic={handleLogApiTraffic}
          />
        ) : (
          /* VIEW 3: 03 // DEVELOPER OPTIONS — UNIFIED TELEMETRY, ENDPOINT & JSON SANDBOX WORKSPACE */
          <section
            id="developer-options-view"
            aria-label="Developer Options and Telemetry Workspace"
            className="max-w-[1360px] mx-auto px-6 py-8 space-y-6"
          >
            {/* Masthead Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-stone-300/80 dark:border-zinc-800">
              <div className="space-y-1.5 max-w-3xl">
                <p className="uppercase tracking-wider text-[11px] font-mono text-[#D95D39] dark:text-[#E87A5A] font-semibold">
                  03 // DEVELOPER OPTIONS · TELEMETRY &amp; CONTRACT SANDBOX
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-stone-100 font-display">
                  System Configuration, JSON Contracts &amp; Live FastAPI Telemetry
                </h1>
                <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  Configure the demo showcase video URL, switch between the live FastAPI backend and
                  deterministic mock mode, inspect outgoing request schemas, and test custom lesson
                  JSON payloads.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveView('classroom')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#D95D39] hover:bg-[#C04E2C] text-white text-xs font-mono font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <span>Go to 02 // Classroom →</span>
                </button>
              </div>
            </div>

            {/* Top 2-Column Architectural Grid: Panel 01 (Demo Media) + Panel 02 (Backend Endpoint) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 border border-stone-300 dark:border-zinc-800 bg-[#FCFBF9] dark:bg-[#181816] divide-y lg:divide-y-0 lg:divide-x divide-stone-300 dark:divide-zinc-800">
              {/* PANEL 01 — DEMO MEDIA // YOUTUBE URL CONFIGURATION */}
              <div id="dev-panel-youtube-config" className="p-6 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-300/80 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#D95D39] dark:text-[#E87A5A]">
                        01
                      </span>
                      <Video className="w-4 h-4 text-stone-600 dark:text-stone-400 shrink-0" />
                      <h2 className="uppercase tracking-wider text-[11px] font-mono font-semibold text-zinc-900 dark:text-stone-100">
                        DEMO MEDIA // YOUTUBE URL CONFIGURATION
                      </h2>
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 bg-[#EFECE6] dark:bg-[#222220] border border-stone-300/80 dark:border-zinc-700 text-stone-600 dark:text-stone-400">
                      LOCALSTORAGE PERSISTED
                    </span>
                  </div>

                  <form onSubmit={handleSaveDemoYoutubeUrl} className="space-y-3">
                    <div>
                      <label
                        htmlFor="dev-demo-youtube-url-input"
                        className="block uppercase tracking-wider text-[11px] font-mono text-stone-600 dark:text-stone-400 mb-1.5"
                      >
                        YOUTUBE SOURCE LINK (WATCH, YOUTU.BE, EMBED, OR VIDEO ID)
                      </label>
                      <input
                        id="dev-demo-youtube-url-input"
                        type="text"
                        value={demoUrlInputDraft}
                        onChange={(e) => setDemoUrlInputDraft(e.target.value)}
                        placeholder="https://youtu.be/pQrWq7AJuJY"
                        className="w-full rounded-md border border-stone-300/90 dark:border-zinc-700 bg-[#F7F6F2] dark:bg-[#111110] px-3 py-2 text-xs font-mono text-zinc-900 dark:text-stone-100 focus:outline-none focus:border-[#D95D39]"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          id="save-demo-youtube-url-btn"
                          type="submit"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#D95D39] hover:bg-[#C04E2C] text-white text-xs font-mono font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{demoUrlSavedNotice ? 'Saved to 00 // Demo' : 'Save Video URL'}</span>
                        </button>

                        <button
                          id="reset-demo-youtube-url-btn"
                          type="button"
                          onClick={handleResetDemoYoutubeUrl}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-stone-300/90 dark:border-zinc-700 bg-[#EFECE6] dark:bg-[#222220] hover:bg-stone-300/60 dark:hover:bg-zinc-700 text-xs font-mono text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Default</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveView('demo')}
                        className="text-xs font-mono font-semibold text-[#D95D39] dark:text-[#E87A5A] hover:underline cursor-pointer"
                      >
                        View on 00 // Demo →
                      </button>
                    </div>
                  </form>
                </div>

                <div className="pt-3 border-t border-stone-300/60 dark:border-zinc-800 text-[11px] font-mono text-stone-500 dark:text-stone-400 truncate">
                  RESOLVED EMBED: <code className="text-zinc-800 dark:text-stone-200">{activeEmbedUrl}</code>
                </div>
              </div>

              {/* PANEL 02 — STUDIO TELEMETRY // BACKEND ENDPOINT */}
              <div id="dev-panel-backend-endpoint" className="p-6 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-300/80 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#D95D39] dark:text-[#E87A5A]">
                        02
                      </span>
                      <Server className="w-4 h-4 text-stone-600 dark:text-stone-400 shrink-0" />
                      <h2 className="uppercase tracking-wider text-[11px] font-mono font-semibold text-zinc-900 dark:text-stone-100">
                        STUDIO TELEMETRY // BACKEND ENDPOINT
                      </h2>
                    </div>

                    {/* Execution Mode Selector */}
                    <div
                      className="flex items-center border border-stone-300/80 dark:border-zinc-700 rounded-md overflow-hidden bg-[#EFECE6] dark:bg-[#222220]"
                      role="group"
                      aria-label="Backend mode selection"
                    >
                      <button
                        id="dev-mode-live-btn"
                        type="button"
                        onClick={() => setMockBackendMode(false)}
                        className={`px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          !mockBackendMode
                            ? 'bg-[#D95D39] text-white font-semibold'
                            : 'text-stone-600 dark:text-stone-400 hover:text-zinc-900 dark:hover:text-stone-100'
                        }`}
                      >
                        Live FastAPI Backend
                      </button>
                      <button
                        id="dev-mode-mock-btn"
                        type="button"
                        onClick={() => setMockBackendMode(true)}
                        className={`px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider border-l border-stone-300/80 dark:border-zinc-700 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          mockBackendMode
                            ? 'bg-[#D95D39] text-white font-semibold'
                            : 'text-stone-600 dark:text-stone-400 hover:text-zinc-900 dark:hover:text-stone-100'
                        }`}
                      >
                        Mock Backend Mode
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <label
                        htmlFor="backend-base-url-input"
                        className="uppercase tracking-wider text-stone-600 dark:text-stone-400"
                      >
                        FASTAPI BASE URL
                      </label>
                      <span
                        className={`font-semibold ${
                          mockBackendMode
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-emerald-800 dark:text-emerald-400'
                        }`}
                      >
                        {mockBackendMode ? '● LOCAL DETERMINISTIC MOCK' : '● ONLINE CONTRACT'}
                      </span>
                    </div>
                    <input
                      id="backend-base-url-input"
                      type="text"
                      value={backendBaseUrl}
                      onChange={(e) => setBackendBaseUrl(e.target.value)}
                      placeholder="https://tutor-poc-backend.vercel.app"
                      className="w-full rounded-md border border-stone-300/90 dark:border-zinc-700 bg-[#F7F6F2] dark:bg-[#111110] px-3 py-2 text-xs font-mono text-zinc-900 dark:text-stone-100 focus:outline-none focus:border-[#D95D39]"
                    />
                  </div>
                </div>

                <p className="pt-3 border-t border-stone-300/60 dark:border-zinc-800 text-[11px] font-mono text-stone-500 dark:text-stone-400 leading-relaxed">
                  ROUTES: <code>/api/v1/parse-document</code> · <code>/api/v1/generate-lesson</code>{' '}
                  · <code>/api/v1/evaluate-checkpoint</code> · <code>/api/v1/tutor-chat</code>
                </p>
              </div>
            </div>

            {/* PANEL 03 — PREVIEW OUTGOING PAYLOAD (POST https://tutor-poc-backend.vercel.app/api/v1/generate-lesson) */}
            <div
              id="dev-panel-outgoing-payload"
              className="border border-stone-300 dark:border-zinc-800 bg-[#FCFBF9] dark:bg-[#181816]"
            >
              <div className="px-6 py-3.5 border-b border-stone-300/80 dark:border-zinc-800 bg-[#EFECE6]/70 dark:bg-[#222220] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#D95D39] dark:text-[#E87A5A]">
                    03
                  </span>
                  <Code2 className="w-4 h-4 text-[#D95D39] dark:text-[#E87A5A] shrink-0" />
                  <h2 className="uppercase tracking-wider text-[11px] font-mono font-semibold text-zinc-900 dark:text-stone-100">
                    PREVIEW OUTGOING PAYLOAD (POST {cleanBackendBase || DEFAULT_BACKEND_BASE_URL}
                    /api/v1/generate-lesson)
                  </h2>
                </div>

                <button
                  id="dev-copy-outgoing-json-btn"
                  type="button"
                  onClick={handleCopyOutgoingPayloadJson}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold text-zinc-800 dark:text-stone-200 hover:text-zinc-950 dark:hover:text-white border border-stone-300/90 dark:border-zinc-700 bg-[#FCFBF9] dark:bg-[#181816] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copiedOutgoingJson ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                      <span>Copy JSON (Copied)</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-5 bg-[#111110] text-stone-200 overflow-x-auto max-h-80">
                <pre className="text-xs font-mono leading-relaxed">
                  {JSON.stringify(outgoingPayload, null, 2)}
                </pre>
              </div>
            </div>

            {/* PANEL 04 — INCOMING LESSON JSON SANDBOX & TELEMETRY LOGS */}
            <div
              id="dev-panel-incoming-sandbox"
              className="border border-stone-300 dark:border-zinc-800 bg-[#FCFBF9] dark:bg-[#181816] divide-y divide-stone-300/80 dark:divide-zinc-800"
            >
              {/* Panel 04 Header */}
              <div className="px-6 py-3.5 bg-[#EFECE6]/70 dark:bg-[#222220] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#D95D39] dark:text-[#E87A5A]">
                    04
                  </span>
                  <Terminal className="w-4 h-4 text-[#D95D39] dark:text-[#E87A5A] shrink-0" />
                  <h2 className="uppercase tracking-wider text-[11px] font-mono font-semibold text-zinc-900 dark:text-stone-100">
                    INCOMING LESSON JSON SANDBOX &amp; TELEMETRY LOGS
                  </h2>
                </div>

                {/* SSE Streaming Toggle */}
                <div className="flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-[#D95D39] dark:text-[#E87A5A]" />
                  <span className="text-xs font-mono text-stone-600 dark:text-stone-300">
                    Stream Tutor Replies (SSE):
                  </span>
                  <button
                    type="button"
                    onClick={() => setSseStreamingEnabled((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                      sseStreamingEnabled
                        ? 'text-emerald-800 bg-emerald-950/10 border-emerald-700/30 dark:text-emerald-400'
                        : 'bg-[#FCFBF9] dark:bg-[#181816] border-stone-300/90 dark:border-zinc-700 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    {sseStreamingEnabled ? 'ON (/tutor-chat/stream)' : 'OFF (?stream=false)'}
                  </button>
                </div>
              </div>

              {/* 2-Column Split inside Panel 04: Left = Editable Incoming Lesson JSON Sandbox, Right = Live Endpoint Traffic Inspector */}
              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-stone-300/80 dark:divide-zinc-800">
                {/* Left Column: Editable Incoming Lesson Response JSON Sandbox */}
                <div className="p-6 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <label
                          htmlFor="dev-incoming-json-textarea"
                          className="block uppercase tracking-wider text-[11px] font-mono font-semibold text-zinc-900 dark:text-stone-100"
                        >
                          04.A // EDITABLE INCOMING LESSON RESPONSE JSON
                        </label>
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          Paste or edit a backend <code>IncomingLessonResponse</code> payload and
                          apply it directly to the Interactive Classroom.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleResetIncomingJsonOnDeveloperPage}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-stone-300/90 dark:border-zinc-700 bg-[#EFECE6] dark:bg-[#222220] text-xs font-mono text-stone-700 dark:text-stone-300 hover:bg-stone-300/60 transition-colors cursor-pointer shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Default JSON</span>
                      </button>
                    </div>

                    <textarea
                      id="dev-incoming-json-textarea"
                      rows={14}
                      value={incomingLessonJsonDraft}
                      onChange={(e) => {
                        setIncomingLessonJsonDraft(e.target.value);
                        setIncomingJsonValidationError(null);
                      }}
                      spellCheck={false}
                      className="w-full rounded-md border border-stone-300/90 dark:border-zinc-800 bg-[#111110] p-4 text-xs font-mono text-emerald-300 leading-relaxed focus:outline-none focus:border-[#D95D39]"
                    />

                    {incomingJsonValidationError && (
                      <div
                        role="alert"
                        className="flex items-start gap-2 p-3 rounded-md border border-rose-600/40 bg-rose-950/10 text-xs text-rose-800 dark:text-rose-300 font-mono"
                      >
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Schema Error: {incomingJsonValidationError}</span>
                      </div>
                    )}

                    {incomingJsonAppliedNotice && (
                      <div
                        role="status"
                        className="flex items-center gap-2 p-3 rounded-md border border-emerald-700/30 bg-emerald-950/10 text-xs text-emerald-800 dark:text-emerald-400 font-mono"
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>
                          Incoming Lesson JSON validated and applied to 02 // Classroom!
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
                    <button
                      id="dev-apply-incoming-json-btn"
                      type="button"
                      onClick={handleApplyIncomingJsonOnDeveloperPage}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-mono font-semibold uppercase tracking-wider text-white bg-[#D95D39] hover:bg-[#C04E2C] transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Apply Custom Lesson JSON</span>
                    </button>
                  </div>
                </div>

                {/* Right Column: Live API Request/Response Traffic Inspector */}
                <div className="p-6 space-y-4">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="uppercase tracking-wider text-[11px] font-mono font-semibold text-zinc-900 dark:text-stone-100 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-[#D95D39] dark:text-[#E87A5A]" />
                        <span>04.B // LIVE API REQUEST / RESPONSE INSPECTOR</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {ENDPOINT_INSPECTOR_TABS.map((ep) => {
                        const entry = apiTrafficLogs[ep.key];
                        const active = selectedTrafficEndpoint === ep.key;
                        return (
                          <button
                            key={ep.key}
                            type="button"
                            onClick={() => setSelectedTrafficEndpoint(ep.key)}
                            className={`px-2.5 py-1.5 rounded-md text-xs font-mono border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                              active
                                ? 'bg-[#D95D39] border-[#D95D39] text-white font-semibold'
                                : 'bg-[#F7F6F2] dark:bg-[#111110] border-stone-300/80 dark:border-zinc-800 text-stone-600 dark:text-stone-400 hover:text-zinc-900 dark:hover:text-stone-100'
                            }`}
                          >
                            <span>{ep.label}</span>
                            {entry && (
                              <span className="ml-1.5 text-[10px] opacity-90">
                                [{entry.status}]
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {currentTrafficEntry ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono bg-[#F7F6F2] dark:bg-[#111110] px-3.5 py-2 rounded-md border border-stone-300/80 dark:border-zinc-800">
                        <span className="text-[#D95D39] dark:text-[#E87A5A] font-semibold">
                          {currentTrafficEntry.method} {currentTrafficEntry.url}
                        </span>
                        <span className="text-stone-500 dark:text-stone-400">
                          Status: {currentTrafficEntry.status} · {currentTrafficEntry.timestamp}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <h3 className="text-[11px] font-mono font-semibold text-stone-600 dark:text-stone-400 mb-1 uppercase tracking-wider">
                            LATEST REQUEST PAYLOAD
                          </h3>
                          <div className="rounded-md border border-stone-300/80 dark:border-zinc-800 bg-[#111110] p-3.5 overflow-auto max-h-44">
                            <pre className="text-xs font-mono text-stone-200 leading-relaxed">
                              {JSON.stringify(currentTrafficEntry.requestPayload, null, 2)}
                            </pre>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-[11px] font-mono font-semibold text-stone-600 dark:text-stone-400 mb-1 uppercase tracking-wider">
                            LATEST RESPONSE PAYLOAD
                          </h3>
                          <div className="rounded-md border border-stone-300/80 dark:border-zinc-800 bg-[#111110] p-3.5 overflow-auto max-h-44">
                            <pre className="text-xs font-mono text-emerald-300 leading-relaxed">
                              {JSON.stringify(currentTrafficEntry.responsePayload, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border border-stone-300/80 dark:border-zinc-800 bg-[#F7F6F2] dark:bg-[#111110] p-8 text-center space-y-2">
                      <p className="text-xs font-mono font-semibold text-zinc-800 dark:text-stone-200">
                        No live traffic recorded yet for{' '}
                        <code className="text-[#D95D39] dark:text-[#E87A5A]">
                          {selectedTrafficEndpoint}
                        </code>
                        .
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Trigger the corresponding action in 01 // Setup Studio or 02 // Classroom to
                        inspect its live JSON request and response payloads here.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Developer Debug Drawer Modal (Optional Modal Fallback) */}
      <DeveloperDebugDrawer
        key={incomingLesson.lesson_id}
        isOpen={isDebugDrawerOpen}
        onOpen={() => setIsDebugDrawerOpen(true)}
        onClose={() => setIsDebugDrawerOpen(false)}
        outgoingPayload={outgoingPayload}
        incomingLesson={incomingLesson}
        apiTrafficLogs={apiTrafficLogs}
        sseStreamingEnabled={sseStreamingEnabled}
        onToggleSseStreaming={setSseStreamingEnabled}
        onApplyCustomLesson={handleApplyCustomLessonFromDrawer}
      />
    </div>
  );
}


