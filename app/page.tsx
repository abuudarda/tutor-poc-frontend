'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Play, Settings2, Check, RotateCcw, ArrowRight, FileText, Sliders, Mic } from 'lucide-react';
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

const DEFAULT_DEMO_YOUTUBE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const DEMO_YOUTUBE_STORAGE_KEY = 'socratica_demo_youtube_url';

function getYouTubeEmbedUrl(url: string): string {
  return convertYouTubeUrlToEmbed(url);
}

export default function MultimodalTutorApp() {
  // Active View: 'demo' (View 0) | 'studio' (View 1) | 'classroom' (View 2)
  const [activeView, setActiveView] = useState<'demo' | 'studio' | 'classroom'>('studio');

  // Configurable YouTube Demo Video State (persisted in localStorage)
  const [demoYoutubeUrl, setDemoYoutubeUrl] = useState<string>(DEFAULT_DEMO_YOUTUBE_URL);
  const [demoUrlInputDraft, setDemoUrlInputDraft] = useState<string>(DEFAULT_DEMO_YOUTUBE_URL);
  const [isDemoUrlEditorOpen, setIsDemoUrlEditorOpen] = useState<boolean>(false);
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

  // Developer Debug Drawer & Live API Traffic Log State
  const [isDebugDrawerOpen, setIsDebugDrawerOpen] = useState<boolean>(false);
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

  // Support ?autostart=1 query param to jump directly to View 2 (Interactive Classroom)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        setActiveView('classroom');
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
    // Immediately store the uploaded File and create a browser object URL via URL.createObjectURL(file)
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

      // Do NOT manually set Content-Type header so browser attaches multipart boundary automatically
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
      // Fallback to local text extraction if remote parse fails, while surfacing status clearly
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
        setActiveModuleIndex(0);
        setMasteredModuleIds([]);
        setIsGenerating(false);
        setGenerationStepText('');
        setActiveView('classroom');
        setAutoSpeakTrigger((prev) => prev + 1);
        return;
      }

      // Live API Mode: Multi-step progress indicator for nvidia/nemotron-3.5-bolt-e4b (15–45s thinking time)
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
          ? `${err.message} (Tip: You can inspect the payload in the Developer JSON Sandbox or switch to Mock Fallback if offline.)`
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
    setActiveModuleIndex(0);
    setMasteredModuleIds([]);
    setActiveView('classroom');
  };

  const activeEmbedUrl = useMemo(() => getYouTubeEmbedUrl(demoYoutubeUrl), [demoYoutubeUrl]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F2] dark:bg-[#111110] text-zinc-900 dark:text-stone-100">
      {/* Strict 3-Zone Architectural Top Bar (h-14 / 3.5rem) */}
      <header className="h-14 shrink-0 flex items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 border-b border-stone-300/80 dark:border-zinc-800 bg-[#FCFBF9] dark:bg-[#181816]">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('studio');
          }}
          className="text-base font-bold tracking-tight text-zinc-900 dark:text-stone-100 font-display whitespace-nowrap shrink-0"
        >
          Socratica Studio
        </a>

        {/* Zone 2: Concise single-line text navigation links (00 // Demo, 01 // Setup Studio, 02 // Classroom) */}
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
          /* VIEW 0: 00 // DEMO — SYSTEM WALKTHROUGH & VIDEO SHOWCASE */
          <section
            id="demo-showcase-view"
            aria-label="System Walkthrough and Demo Video"
            className="max-w-[1160px] mx-auto px-6 py-8 space-y-6"
          >
            {/* Masthead Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-stone-300/80 dark:border-zinc-800">
              <div className="space-y-1.5 max-w-2xl">
                <p className="uppercase tracking-wider text-[11px] font-mono text-[#D95D39] dark:text-[#E87A5A] font-semibold">
                  00 // SYSTEM WALKTHROUGH &amp; DEMO
                </p>
                <h1
                  className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-stone-100 font-display"
                  style={{ textWrap: 'balance' }}
                >
                  Socratica Studio — Multimodal Voice &amp; Concept Classroom
                </h1>
                <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  Watch the full architectural walkthrough demonstrating document parsing with NVIDIA
                  Nemotron Parse, adaptive lesson synthesis, and Socratic/Feynman voice checkpoints.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="toggle-demo-url-editor-btn"
                  type="button"
                  onClick={() => setIsDemoUrlEditorOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-stone-300/90 dark:border-zinc-800 bg-[#FCFBF9] dark:bg-[#181816] hover:bg-[#EFECE6] dark:hover:bg-[#222220] text-xs font-mono font-medium text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
                >
                  <Settings2 className="w-3.5 h-3.5 text-[#D95D39] dark:text-[#E87A5A]" />
                  <span>{isDemoUrlEditorOpen ? 'Hide Video URL Config' : 'Configure YouTube URL'}</span>
                </button>
              </div>
            </div>

            {/* Subtle Collapsible YouTube URL Configuration Bar (Persisted in localStorage) */}
            {isDemoUrlEditorOpen && (
              <form
                onSubmit={handleSaveDemoYoutubeUrl}
                className="rounded-md border border-stone-300/90 dark:border-zinc-800 bg-[#EFECE6]/70 dark:bg-[#222220] p-4 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="demo-youtube-url-input"
                    className="uppercase tracking-wider text-[11px] font-mono font-semibold text-zinc-900 dark:text-stone-100"
                  >
                    DEMO YOUTUBE SOURCE URL (WATCH, YOUTU.BE, OR EMBED LINK):
                  </label>
                  <span className="text-[11px] font-mono text-stone-500 dark:text-stone-400">
                    Resolved Embed: {activeEmbedUrl}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    id="demo-youtube-url-input"
                    type="text"
                    value={demoUrlInputDraft}
                    onChange={(e) => setDemoUrlInputDraft(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1 min-w-0 rounded-md border border-stone-300/90 dark:border-zinc-700 bg-[#FCFBF9] dark:bg-[#181816] px-3 py-2 text-xs font-mono text-zinc-900 dark:text-stone-100 focus:outline-none focus:border-[#D95D39]"
                  />

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      id="save-demo-youtube-url-btn"
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#D95D39] hover:bg-[#C04E2C] text-white text-xs font-mono font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{demoUrlSavedNotice ? 'Saved' : 'Apply URL'}</span>
                    </button>

                    <button
                      id="reset-demo-youtube-url-btn"
                      type="button"
                      onClick={handleResetDemoYoutubeUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-stone-300/90 dark:border-zinc-700 bg-[#FCFBF9] dark:bg-[#181816] hover:bg-[#F7F6F2] dark:hover:bg-[#111110] text-xs font-mono text-stone-600 dark:text-stone-300 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Default</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

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
            mockBackendMode={mockBackendMode}
            backendBaseUrl={backendBaseUrl}
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
            onToggleMockBackend={setMockBackendMode}
            onChangeBackendBaseUrl={setBackendBaseUrl}
            onGenerateLesson={handleGenerateLesson}
          />
        ) : (
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
            onToggleDebugDrawer={() => setIsDebugDrawerOpen((prev) => !prev)}
            onSelectModule={setActiveModuleIndex}
            onMarkModuleMastered={handleMarkModuleMastered}
            onBackToStudio={() => setActiveView('studio')}
            onLogApiTraffic={handleLogApiTraffic}
          />
        )}
      </main>

      {/* Developer Debug Drawer Modal (Toggled via Classroom Sidebar) */}
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

