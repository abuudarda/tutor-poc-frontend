'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  estimateFileMetadata,
  normalizeBaseUrl,
  synthesizeAdaptiveLessonFromPayload,
  validateIncomingLessonJson,
} from '@/lib/tutor-contracts';
import { SetupStudio } from '@/components/setup-studio';
import { InteractiveClassroom } from '@/components/interactive-classroom';
import { DeveloperDebugDrawer } from '@/components/developer-debug-drawer';

export default function MultimodalTutorApp() {
  // Active View: 'studio' (View 1) | 'classroom' (View 2)
  const [activeView, setActiveView] = useState<'studio' | 'classroom'>('studio');

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

  // Ensure viewport scrolls cleanly to top when switching between Setup Studio and Interactive Classroom
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('studio');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-white font-display whitespace-nowrap shrink-0"
        >
          Socratica Studio
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav
          aria-label="Primary Workspace Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          <a
            href="#setup-studio"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('studio');
            }}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'studio'
                ? 'text-indigo-600 dark:text-indigo-400 underline underline-offset-8'
                : ''
            }`}
          >
            Setup Studio
          </a>
          <a
            href="#interactive-classroom"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('classroom');
            }}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'classroom'
                ? 'text-indigo-600 dark:text-indigo-400 underline underline-offset-8'
                : ''
            }`}
          >
            Classroom
          </a>
          <a
            href="#json-contracts"
            onClick={(e) => {
              e.preventDefault();
              setIsDebugDrawerOpen(true);
            }}
            className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            JSON Sandbox
          </a>
          <a
            href="#theme-toggle"
            onClick={(e) => {
              e.preventDefault();
              setIsDarkMode((prev) => !prev);
            }}
            className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            {isDarkMode ? 'Light Theme' : 'Dark Theme'}
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          {activeView === 'studio' ? (
            <button
              type="button"
              onClick={() => setActiveView('classroom')}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Open Classroom
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveView('studio')}
              className="px-4 py-2 text-xs font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Configure Lesson
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Container */}
      <main className="flex-1 pb-20">
        {activeView === 'studio' ? (
          <SetupStudio
            fileName={fileName}
            contentType={contentType}
            rawText={rawText}
            fileMeta={fileMeta}
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
            activeModuleIndex={activeModuleIndex}
            masteredModuleIds={masteredModuleIds}
            mockBackendMode={mockBackendMode}
            backendBaseUrl={backendBaseUrl}
            sseStreamingEnabled={sseStreamingEnabled}
            autoSpeakTrigger={autoSpeakTrigger}
            onToggleSseStreaming={setSseStreamingEnabled}
            onSelectModule={setActiveModuleIndex}
            onMarkModuleMastered={handleMarkModuleMastered}
            onBackToStudio={() => setActiveView('studio')}
            onLogApiTraffic={handleLogApiTraffic}
          />
        )}
      </main>

      {/* Floating Bottom-Left Developer Debug Drawer */}
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
