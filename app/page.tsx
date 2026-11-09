'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  EducationLevel,
  SimplicityLevel,
  TeachingMethodology,
  FocusArea,
  TutorPersona,
  IncomingLessonResponse,
  DEFAULT_OUTGOING_REQUEST,
  DEFAULT_INCOMING_LESSON,
  PRESET_STUDY_MATERIALS,
  buildOutgoingPayload,
  estimateFileMetadata,
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
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>(
    DEFAULT_OUTGOING_REQUEST.tutor_config.focus_areas
  );
  const [persona, setPersona] = useState<TutorPersona>(
    DEFAULT_OUTGOING_REQUEST.tutor_config.persona
  );

  // Backend Mode & Generation State
  const [mockBackendMode, setMockBackendMode] = useState<boolean>(true);
  const [customBackendUrl, setCustomBackendUrl] = useState<string>(
    '/api/v1/generate-lesson'
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStepText, setGenerationStepText] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Classroom & Incoming Lesson State
  const [incomingLesson, setIncomingLesson] = useState<IncomingLessonResponse>(
    DEFAULT_INCOMING_LESSON
  );
  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0);
  const [masteredModuleIds, setMasteredModuleIds] = useState<string[]>([]);

  // Developer Debug Drawer State
  const [isDebugDrawerOpen, setIsDebugDrawerOpen] = useState<boolean>(false);

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
    () => estimateFileMetadata(fileName, contentType, rawText, explicitByteSize),
    [fileName, contentType, rawText, explicitByteSize]
  );

  const handleSelectPreset = (presetId: string) => {
    const found = PRESET_STUDY_MATERIALS.find((p) => p.id === presetId);
    if (!found) return;
    setFileName(found.fileName);
    setContentType(found.contentType);
    setRawText(found.rawText);
    setExplicitByteSize(undefined);
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
  };

  const handleToggleFocusArea = (area: FocusArea) => {
    setFocusAreas((prev) => {
      if (prev.includes(area)) {
        return prev.length > 1 ? prev.filter((a) => a !== area) : prev;
      }
      return [...prev, area];
    });
  };

  const handleGenerateLesson = async () => {
    setGenerationError(null);
    setIsGenerating(true);

    try {
      if (mockBackendMode) {
        setGenerationStepText('1/3 Extracting source text & concepts...');
        await new Promise((r) => setTimeout(r, 180));
        setGenerationStepText('2/3 Synthesizing spoken scripts & analogies...');
        await new Promise((r) => setTimeout(r, 180));
        setGenerationStepText('3/3 Building Feynman understanding gates...');
        await new Promise((r) => setTimeout(r, 180));

        const synthesized = synthesizeAdaptiveLessonFromPayload(outgoingPayload);
        setIncomingLesson(synthesized);
        setActiveModuleIndex(0);
        setMasteredModuleIds([]);
        setIsGenerating(false);
        setGenerationStepText('');
        setActiveView('classroom');
        return;
      }

      // Live / Custom Backend Mode (POST to customBackendUrl)
      setGenerationStepText(`POST ${customBackendUrl}...`);
      const response = await fetch(customBackendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outgoingPayload),
      });

      if (!response.ok) {
        throw new Error(`Backend returned HTTP ${response.status}`);
      }

      const rawJson = await response.text();
      const validated = validateIncomingLessonJson(rawJson);
      if (!validated.valid) {
        throw new Error(`Invalid IncomingLessonResponse contract: ${validated.error}`);
      }

      setIncomingLesson(validated.data);
      setActiveModuleIndex(0);
      setMasteredModuleIds([]);
      setIsGenerating(false);
      setGenerationStepText('');
      setActiveView('classroom');
    } catch (err) {
      setIsGenerating(false);
      setGenerationStepText('');
      setGenerationError(
        err instanceof Error
          ? err.message
          : 'Failed to generate lesson from backend endpoint.'
      );
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
            explicitByteSize={explicitByteSize}
            fileMeta={fileMeta}
            educationLevel={educationLevel}
            simplicityLevel={simplicityLevel}
            methodology={methodology}
            focusAreas={focusAreas}
            persona={persona}
            outgoingPayload={outgoingPayload}
            mockBackendMode={mockBackendMode}
            customBackendUrl={customBackendUrl}
            isGenerating={isGenerating}
            generationStepText={generationStepText}
            generationError={generationError}
            onSelectPreset={handleSelectPreset}
            onUpdateMaterial={handleUpdateMaterial}
            onChangeEducationLevel={setEducationLevel}
            onChangeSimplicityLevel={setSimplicityLevel}
            onChangeMethodology={setMethodology}
            onToggleFocusArea={handleToggleFocusArea}
            onChangePersona={setPersona}
            onToggleMockBackend={setMockBackendMode}
            onChangeCustomBackendUrl={setCustomBackendUrl}
            onGenerateLesson={handleGenerateLesson}
          />
        ) : (
          <InteractiveClassroom
            lesson={incomingLesson}
            tutorConfig={outgoingPayload.tutor_config}
            activeModuleIndex={activeModuleIndex}
            masteredModuleIds={masteredModuleIds}
            onSelectModule={setActiveModuleIndex}
            onMarkModuleMastered={handleMarkModuleMastered}
            onBackToStudio={() => setActiveView('studio')}
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
        onApplyCustomLesson={handleApplyCustomLessonFromDrawer}
      />
    </div>
  );
}
