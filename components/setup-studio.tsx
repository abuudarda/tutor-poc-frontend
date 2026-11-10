'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Sliders,
  Code2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  Copy,
  Server,
  BookOpen,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  EducationLevel,
  SimplicityLevel,
  TeachingMethodology,
  TutorPersona,
  OutgoingRequestPayload,
  FileMetadataSummary,
  EDUCATION_LEVEL_OPTIONS,
  SIMPLICITY_LABELS,
  METHODOLOGY_OPTIONS,
  FOCUS_AREA_OPTIONS,
  PERSONA_OPTIONS,
  PRESET_STUDY_MATERIALS,
  normalizeBaseUrl,
} from '@/lib/tutor-contracts';

interface SetupStudioProps {
  fileName: string;
  contentType: string;
  rawText: string;
  fileMeta: FileMetadataSummary;
  sourceFile: File | null;
  sourceFileUrl: string | null;
  educationLevel: EducationLevel;
  simplicityLevel: SimplicityLevel;
  methodology: TeachingMethodology;
  focusAreas: string[];
  persona: TutorPersona;
  outgoingPayload: OutgoingRequestPayload;
  mockBackendMode: boolean;
  backendBaseUrl: string;
  isParsingDocument: boolean;
  parseError: string | null;
  isGenerating: boolean;
  generationStepText: string;
  generationError: string | null;
  onSelectPreset: (presetId: string) => void;
  onUploadFileToBackend: (file: File) => Promise<void>;
  onUpdateMaterial: (
    fileName: string,
    contentType: string,
    rawText: string,
    byteSize?: number
  ) => void;
  onChangeEducationLevel: (val: EducationLevel) => void;
  onChangeSimplicityLevel: (val: SimplicityLevel) => void;
  onChangeMethodology: (val: TeachingMethodology) => void;
  onToggleFocusArea: (area: string) => void;
  onChangePersona: (val: TutorPersona) => void;
  onToggleMockBackend: (val: boolean) => void;
  onChangeBackendBaseUrl: (val: string) => void;
  onGenerateLesson: () => void;
}

export function SetupStudio({
  fileName,
  contentType,
  rawText,
  fileMeta,
  sourceFile,
  sourceFileUrl,
  educationLevel,
  simplicityLevel,
  methodology,
  focusAreas,
  persona,
  outgoingPayload,
  mockBackendMode,
  backendBaseUrl,
  isParsingDocument,
  parseError,
  isGenerating,
  generationStepText,
  generationError,
  onSelectPreset,
  onUploadFileToBackend,
  onUpdateMaterial,
  onChangeEducationLevel,
  onChangeSimplicityLevel,
  onChangeMethodology,
  onToggleFocusArea,
  onChangePersona,
  onToggleMockBackend,
  onChangeBackendBaseUrl,
  onGenerateLesson,
}: SetupStudioProps) {
  const [materialTab, setMaterialTab] = useState<'upload' | 'paste'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [isJsonPreviewOpen, setIsJsonPreviewOpen] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const cleanBase = normalizeBaseUrl(backendBaseUrl);
  const isTextValidForGeneration = rawText.trim().length >= 20;

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void onUploadFileToBackend(file);
    }
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(outgoingPayload, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 1800);
    } catch {
      // ignore clipboard restriction
    }
  };

  return (
    <section className="max-w-[1280px] mx-auto px-6 py-6">
      {/* Studio Intro Header & Curriculum Quick-Loaders */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1.5 max-w-2xl">
          <p className="text-xs font-medium tracking-wide text-indigo-600 dark:text-indigo-400">
            01. Pedagogical Session Configuration · The Setup Studio
          </p>
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-display"
            style={{ textWrap: 'balance' }}
          >
            Transform Study Material into an Interactive Voice Classroom
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Upload lecture documents or images via NVIDIA Nemotron Parse, calibrate the teaching
            methodology and explanation depth, and launch your live AI Tutor session.
          </p>
        </div>

        {/* Sample Curriculum Quick-Switch */}
        <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Load Sample Study Material:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {PRESET_STUDY_MATERIALS.map((preset) => {
              const isSelected = fileName === preset.fileName;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Two-Column Setup Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 items-start">
        {/* Left Column (5 cols): 1. Material Upload Zone & Backend Contract Mode */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-white font-display">
                  1. Study Material Upload Zone
                </h2>
              </div>

              {/* Tab Switcher: Upload vs Paste Raw Text */}
              <div
                className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-lg"
                role="tablist"
                aria-label="Study material input method"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={materialTab === 'upload'}
                  onClick={() => setMaterialTab('upload')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    materialTab === 'upload'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={materialTab === 'paste'}
                  onClick={() => setMaterialTab('paste')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    materialTab === 'paste'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Paste Raw Text
                </button>
              </div>
            </div>

            {materialTab === 'upload' ? (
              <div className="pt-4 space-y-4">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-950/40 hover:border-indigo-400 dark:hover:border-indigo-600'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    id="study-file-input"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.txt,.md,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void onUploadFileToBackend(file);
                    }}
                    className="sr-only"
                  />

                  {isParsingDocument ? (
                    <div className="py-2 flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
                      <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                        Parsing document via NVIDIA Nemotron Parse...
                      </p>
                      <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        POST {cleanBase || 'local'}/api/v1/parse-document
                      </p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mx-auto mb-1.5" />
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        Drag & drop your study file here, or{' '}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2 font-semibold hover:text-indigo-500 cursor-pointer"
                        >
                          browse files
                        </button>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Supports .pdf, .png, .jpg, .jpeg, .txt, .md, or .docx via Nemotron Parse
                      </p>
                    </>
                  )}
                </div>

                {parseError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-800 dark:text-amber-300"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{parseError}</span>
                  </div>
                )}

                {/* Extracted Text Preview Snippet */}
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <label htmlFor="extracted-preview-textarea" className="font-medium">
                      Extracted Source Text Preview (Editable):
                    </label>
                    <button
                      type="button"
                      onClick={() => setMaterialTab('paste')}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Expand editor
                    </button>
                  </div>
                  <textarea
                    id="extracted-preview-textarea"
                    rows={3}
                    value={rawText}
                    onChange={(e) => onUpdateMaterial(fileName, contentType, e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Extracted text from your file will appear here..."
                  />
                </div>
              </div>
            ) : (
              <div className="pt-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="custom-file-name"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Source Document Name
                    </label>
                    <input
                      id="custom-file-name"
                      type="text"
                      value={fileName}
                      onChange={(e) => onUpdateMaterial(e.target.value, contentType, rawText)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="custom-mime-type"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Content MIME Type
                    </label>
                    <select
                      id="custom-mime-type"
                      value={contentType}
                      onChange={(e) => onUpdateMaterial(fileName, e.target.value, rawText)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="application/pdf">application/pdf</option>
                      <option value="text/markdown">text/markdown</option>
                      <option value="text/plain">text/plain</option>
                      <option value="image/png">image/png</option>
                      <option value="image/jpeg">image/jpeg</option>
                      <option value="application/vnd.openxmlformats-officedocument.wordprocessingml.document">
                        application/docx
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="raw-study-text-input"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Paste Raw Study Material / Lecture Transcript (Min 20 characters)
                  </label>
                  <textarea
                    id="raw-study-text-input"
                    rows={7}
                    value={rawText}
                    onChange={(e) => onUpdateMaterial(fileName, contentType, e.target.value)}
                    placeholder="Paste your chapter text, formulas, or lecture notes here..."
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* File Preview Metadata Bar (Unboxed clean metadata with typographic separators) */}
            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="font-mono font-medium text-slate-900 dark:text-slate-200 truncate">
                  {fileMeta.fileName}
                </span>
                {(sourceFile || sourceFileUrl) && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono shrink-0">
                    Classroom Viewer Ready
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                <span>
                  {fileMeta.pageCount} {fileMeta.pageCount === 1 ? 'page' : 'pages'}
                </span>
                <span aria-hidden="true">·</span>
                <span>{fileMeta.wordCount} words</span>
                <span aria-hidden="true">·</span>
                <span>~{fileMeta.estimatedReadingMinutes} min read</span>
              </div>
            </div>
          </div>

          {/* Backend Execution Mode & Live FastAPI Base URL */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-display">
                  Backend Execution Mode
                </h3>
              </div>

              {/* Segmented Toggle: Live API Mode (default) vs Mock Backend Mode */}
              <div
                className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
                role="group"
                aria-label="Backend mode selection"
              >
                <button
                  type="button"
                  onClick={() => onToggleMockBackend(false)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    !mockBackendMode
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Live API Mode
                </button>
                <button
                  type="button"
                  onClick={() => onToggleMockBackend(true)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    mockBackendMode
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Mock Fallback
                </button>
              </div>
            </div>

            {!mockBackendMode ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label
                    htmlFor="backend-base-url-input"
                    className="font-medium text-slate-700 dark:text-slate-300"
                  >
                    FastAPI Backend Base URL
                  </label>
                  <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                    ● Connected Contract
                  </span>
                </div>
                <input
                  id="backend-base-url-input"
                  type="text"
                  value={backendBaseUrl}
                  onChange={(e) => onChangeBackendBaseUrl(e.target.value)}
                  placeholder="https://tutor-poc-backend.vercel.app"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Calls <code className="font-mono">/api/v1/parse-document</code>,{' '}
                  <code className="font-mono">/api/v1/generate-lesson</code>,{' '}
                  <code className="font-mono">/api/v1/evaluate-checkpoint</code>, and{' '}
                  <code className="font-mono">/api/v1/tutor-chat</code> on the configured host.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Simulates all 5 FastAPI endpoints locally in-browser with deterministic responses so
                you can test offline or compare against live backend payloads.
              </p>
            )}
          </div>
        </div>

        {/* Right Column (7 cols): 2. Pedagogical Configuration Controls & 3. Payload Inspector */}
        <div className="lg:col-span-7 space-y-5">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
            <div className="flex items-center justify-between gap-4 pb-3.5 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-white font-display">
                  2. Pedagogical Configuration Controls
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                tutor_config schema
              </span>
            </div>

            {/* Row 1: Education Level & Tutor Voice Persona Selects */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="education-level-select"
                  className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
                >
                  Education Level
                </label>
                <select
                  id="education-level-select"
                  value={educationLevel}
                  onChange={(e) => onChangeEducationLevel(e.target.value as EducationLevel)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {EDUCATION_LEVEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.value})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="tutor-persona-select"
                  className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
                >
                  Tutor Voice & Persona
                </label>
                <select
                  id="tutor-persona-select"
                  value={persona}
                  onChange={(e) => onChangePersona(e.target.value as TutorPersona)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {PERSONA_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Explanation Simplicity / Pacing Slider (1-5) */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="simplicity-slider"
                  className="text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  Explanation Simplicity / Pacing (1–5)
                </label>
                <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {SIMPLICITY_LABELS[simplicityLevel].short}
                </span>
              </div>

              <input
                id="simplicity-slider"
                type="range"
                min={1}
                max={5}
                step={1}
                value={simplicityLevel}
                onChange={(e) =>
                  onChangeSimplicityLevel(parseInt(e.target.value, 10) as SimplicityLevel)
                }
                className="w-full accent-indigo-600 cursor-pointer"
              />

              <div className="flex justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                <span>1: ELI5 & Heavy Analogies</span>
                <span>3: Balanced</span>
                <span>5: Rigorous Academic Depth</span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400">
                {SIMPLICITY_LABELS[simplicityLevel].description}
              </p>
            </div>

            {/* Row 3: Teaching Methodology (Segmented Control) */}
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                Teaching Methodology
              </span>
              <div
                className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
                role="radiogroup"
                aria-label="Teaching Methodology"
              >
                {METHODOLOGY_OPTIONS.map((item) => {
                  const active = methodology === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => onChangeMethodology(item.value)}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        active
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/50 text-slate-900 dark:text-white ring-1 ring-indigo-600/30'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold whitespace-nowrap shrink-0">
                          {item.label}
                        </span>
                        {active && (
                          <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        {item.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 4: Learning Focus (Multi-select Interactive Controls) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Learning Focus Areas (Multi-Select · Required by FastAPI Schema)
                </span>
                <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {focusAreas.length} selected
                </span>
              </div>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Learning Focus Areas"
              >
                {FOCUS_AREA_OPTIONS.map((area) => {
                  const isSelected = focusAreas.includes(area.value);
                  return (
                    <button
                      key={area.value}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => onToggleFocusArea(area.value)}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <Check
                        className={`w-3.5 h-3.5 transition-opacity ${
                          isSelected ? 'opacity-100' : 'opacity-0 w-0 -mr-2'
                        }`}
                      />
                      {area.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Payload Inspector & Action Card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            {/* Collapsible "Preview Outgoing JSON" Drawer Trigger */}
            <div className="px-5 py-3.5 bg-slate-50/70 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <button
                type="button"
                aria-expanded={isJsonPreviewOpen}
                onClick={() => setIsJsonPreviewOpen((prev) => !prev)}
                className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              >
                <Code2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>
                  Preview Outgoing JSON (POST {cleanBase || ''}/api/v1/generate-lesson)
                </span>
                {isJsonPreviewOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyJson}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {copiedJson ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Payload
                  </>
                )}
              </button>
            </div>

            {isJsonPreviewOpen && (
              <div className="p-4 bg-slate-950 text-slate-100 border-b border-slate-800 overflow-x-auto max-h-72">
                <pre className="text-xs font-mono leading-relaxed">
                  {JSON.stringify(outgoingPayload, null, 2)}
                </pre>
              </div>
            )}

            {/* Primary CTA & Multi-Step Loading State */}
            <div className="p-5 space-y-3.5">
              {!isTextValidForGeneration && (
                <div
                  role="alert"
                  className="p-3 rounded-lg border border-amber-200 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-800 dark:text-amber-300"
                >
                  Source text must be at least 20 characters before calling{' '}
                  <code className="font-mono">/api/v1/generate-lesson</code> (currently{' '}
                  {rawText.trim().length} chars).
                </div>
              )}

              {generationError && (
                <div
                  role="alert"
                  className="p-3.5 rounded-lg border border-rose-200 dark:border-rose-800/80 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300"
                >
                  {generationError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {isGenerating
                      ? 'NVIDIA Nemotron 3.5 Bolt (enable_thinking=True) is structuring your lesson...'
                      : 'Ready to compile interactive concept modules'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    Session: {outgoingPayload.session_id.slice(0, 13)}... · Target:{' '}
                    {mockBackendMode ? 'Mock Engine' : cleanBase || 'Local API'}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isGenerating || isParsingDocument || !isTextValidForGeneration}
                  onClick={onGenerateLesson}
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-sm cursor-pointer whitespace-nowrap shrink-0"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{generationStepText || 'Synthesizing Lesson...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Interactive Lesson</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
