'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Sliders,
  Check,
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
  onGenerateLesson,
}: SetupStudioProps) {
  const [materialTab, setMaterialTab] = useState<'upload' | 'paste'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isTextValidForGeneration = rawText.trim().length >= 20;

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void onUploadFileToBackend(file);
    }
  };

  return (
    <section className="max-w-[1360px] mx-auto px-6 py-8">
      {/* Publication Masthead & Syllabus Quick-Loaders */}
      <div className="space-y-4 pb-6 border-b border-stone-300/80 dark:border-zinc-800">
        <div className="space-y-1.5 max-w-3xl">
          <p className="uppercase tracking-wider text-[11px] font-mono text-[#D95D39] dark:text-[#E87A5A] font-semibold">
            01 // PUBLICATION &amp; SYLLABUS DESK · THE SETUP STUDIO
          </p>
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-stone-100 font-display"
            style={{ textWrap: 'balance' }}
          >
            Transform Study Material into an Interactive Voice Classroom
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            Ingest lecture manuscripts or technical diagrams via NVIDIA Nemotron Parse, calibrate
            pedagogical pacing and methodology, and compile a structured voice classroom.
          </p>
        </div>

        {/* Sample Curriculum Quick-Switch */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <span className="uppercase tracking-wider text-[11px] font-mono text-stone-500 dark:text-stone-400">
            LOAD ARCHIVAL SAMPLE SYLLABUS:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {PRESET_STUDY_MATERIALS.map((preset, idx) => {
              const isSelected = fileName === preset.fileName;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset.id)}
                  className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-[#D95D39] border-[#D95D39] text-white font-semibold'
                      : 'bg-[#FCFBF9] dark:bg-[#181816] border-stone-300/80 dark:border-zinc-800 text-zinc-800 dark:text-stone-300 hover:bg-[#EFECE6] dark:hover:bg-[#222220]'
                  }`}
                >
                  <span className="opacity-70 mr-1.5">0{idx + 1}</span>
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two-Column Publication & Syllabus Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-x border-stone-300/80 dark:border-zinc-800 bg-[#FCFBF9] dark:bg-[#181816]">
        {/* Left Column (5 cols): Document Upload & Source Inspector */}
        <div className="lg:col-span-5 lg:border-r border-stone-300/80 dark:border-zinc-800 flex flex-col justify-between">
          <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4 pb-3 border-b border-stone-300/80 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-[#D95D39] dark:text-[#E87A5A]">
                    01
                  </span>
                  <BookOpen className="w-4 h-4 text-stone-600 dark:text-stone-400 shrink-0" />
                  <h2 className="uppercase tracking-wider text-[11px] font-mono font-semibold text-zinc-900 dark:text-stone-100">
                    DOCUMENT UPLOAD &amp; SOURCE INSPECTOR
                  </h2>
                </div>

                {/* Tab Switcher: Upload vs Paste Raw Text */}
                <div
                  className="flex items-center border border-stone-300/80 dark:border-zinc-700 rounded-md overflow-hidden bg-[#EFECE6] dark:bg-[#222220]"
                  role="tablist"
                  aria-label="Study material input method"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={materialTab === 'upload'}
                    onClick={() => setMaterialTab('upload')}
                    className={`px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      materialTab === 'upload'
                        ? 'bg-[#FCFBF9] dark:bg-[#181816] text-zinc-900 dark:text-stone-100 font-semibold'
                        : 'text-stone-600 dark:text-stone-400 hover:text-zinc-900 dark:hover:text-stone-100'
                    }`}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={materialTab === 'paste'}
                    onClick={() => setMaterialTab('paste')}
                    className={`px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider border-l border-stone-300/80 dark:border-zinc-700 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      materialTab === 'paste'
                        ? 'bg-[#FCFBF9] dark:bg-[#181816] text-zinc-900 dark:text-stone-100 font-semibold'
                        : 'text-stone-600 dark:text-stone-400 hover:text-zinc-900 dark:hover:text-stone-100'
                    }`}
                  >
                    Paste Raw Text
                  </button>
                </div>
              </div>

              {materialTab === 'upload' ? (
                <div className="space-y-4">
                  {/* Technical Blueprint Dropzone with dashed 1px stone border */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`rounded-md border border-dashed p-5 text-center transition-colors ${
                      isDragging
                        ? 'border-[#D95D39] bg-[#D95D39]/5'
                        : 'border-stone-400 dark:border-zinc-700 bg-[#F7F6F2] dark:bg-[#111110] hover:border-[#D95D39]'
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
                        <Loader2 className="w-5 h-5 text-[#D95D39] dark:text-[#E87A5A] animate-spin" />
                        <p className="text-xs font-mono font-semibold text-zinc-900 dark:text-stone-100">
                          PARSING DOCUMENT VIA NVIDIA NEMOTRON PARSE...
                        </p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-[#D95D39] dark:text-[#E87A5A] mx-auto mb-2" />
                        <p className="text-xs font-medium text-zinc-900 dark:text-stone-200">
                          Drop manuscript file here, or{' '}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[#D95D39] dark:text-[#E87A5A] underline underline-offset-2 font-semibold cursor-pointer"
                          >
                            browse local archive
                          </button>
                        </p>
                        <p className="text-[11px] font-mono text-stone-500 dark:text-stone-400 mt-1">
                          ACCEPTED: .PDF · .PNG · .JPG · .TXT · .MD · .DOCX
                        </p>
                      </>
                    )}
                  </div>

                  {parseError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 p-3 rounded-md border border-amber-500/40 bg-amber-950/10 text-xs text-amber-800 dark:text-amber-300 font-mono"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{parseError}</span>
                    </div>
                  )}

                  {/* Extracted Text Preview Snippet */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-stone-500 dark:text-stone-400 mb-1.5">
                      <label
                        htmlFor="extracted-preview-textarea"
                        className="uppercase tracking-wider"
                      >
                        EXTRACTED MANUSCRIPT TEXT (EDITABLE):
                      </label>
                      <button
                        type="button"
                        onClick={() => setMaterialTab('paste')}
                        className="text-[#D95D39] dark:text-[#E87A5A] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        EXPAND FULL EDITOR →
                      </button>
                    </div>
                    <textarea
                      id="extracted-preview-textarea"
                      rows={8}
                      value={rawText}
                      onChange={(e) => onUpdateMaterial(fileName, contentType, e.target.value)}
                      className="w-full rounded-md border border-stone-300/80 dark:border-zinc-800 bg-[#F7F6F2] dark:bg-[#111110] p-3 text-xs font-mono text-zinc-800 dark:text-stone-300 focus:outline-none focus:border-[#D95D39]"
                      placeholder="Extracted text from your file will appear here..."
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="custom-file-name"
                        className="block uppercase tracking-wider text-[11px] font-mono text-stone-500 dark:text-stone-400 mb-1"
                      >
                        SOURCE DOCUMENT NAME
                      </label>
                      <input
                        id="custom-file-name"
                        type="text"
                        value={fileName}
                        onChange={(e) => onUpdateMaterial(e.target.value, contentType, rawText)}
                        className="w-full rounded-md border border-stone-300/80 dark:border-zinc-800 bg-[#F7F6F2] dark:bg-[#111110] px-3 py-1.5 text-xs font-mono text-zinc-900 dark:text-stone-200 focus:outline-none focus:border-[#D95D39]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="custom-mime-type"
                        className="block uppercase tracking-wider text-[11px] font-mono text-stone-500 dark:text-stone-400 mb-1"
                      >
                        CONTENT MIME TYPE
                      </label>
                      <select
                        id="custom-mime-type"
                        value={contentType}
                        onChange={(e) => onUpdateMaterial(fileName, e.target.value, rawText)}
                        className="w-full rounded-md border border-stone-300/80 dark:border-zinc-800 bg-[#F7F6F2] dark:bg-[#111110] px-3 py-1.5 text-xs font-mono text-zinc-900 dark:text-stone-200 focus:outline-none focus:border-[#D95D39]"
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
                      className="block uppercase tracking-wider text-[11px] font-mono text-stone-500 dark:text-stone-400 mb-1"
                    >
                      RAW MANUSCRIPT / LECTURE TRANSCRIPT (MIN 20 CHARS)
                    </label>
                    <textarea
                      id="raw-study-text-input"
                      rows={10}
                      value={rawText}
                      onChange={(e) => onUpdateMaterial(fileName, contentType, e.target.value)}
                      placeholder="Paste your chapter text, formulas, or lecture notes here..."
                      className="w-full rounded-md border border-stone-300/80 dark:border-zinc-800 bg-[#F7F6F2] dark:bg-[#111110] p-3 text-xs font-mono text-zinc-900 dark:text-stone-200 focus:outline-none focus:border-[#D95D39]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* File Preview Metadata Bar */}
            <div className="pt-3 border-t border-stone-300/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 dark:text-stone-400">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-3.5 h-3.5 text-[#D95D39] dark:text-[#E87A5A] shrink-0" />
                <span className="font-mono font-semibold text-zinc-900 dark:text-stone-200 truncate">
                  {fileMeta.fileName}
                </span>
                {(sourceFile || sourceFileUrl) && (
                  <span className="px-1.5 py-0.5 rounded-none text-emerald-800 bg-emerald-950/10 border border-emerald-700/30 dark:text-emerald-400 text-[10px] font-mono uppercase tracking-wider shrink-0">
                    READER READY
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 font-mono tabular-nums text-[11px] text-stone-500 dark:text-stone-400">
                <span>
                  {fileMeta.pageCount} {fileMeta.pageCount === 1 ? 'PG' : 'PGS'}
                </span>
                <span aria-hidden="true">·</span>
                <span>{fileMeta.wordCount} WORDS</span>
                <span aria-hidden="true">·</span>
                <span>~{fileMeta.estimatedReadingMinutes} MIN</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Pedagogical Spec Sheet & Generate Interactive Lesson Action */}
        <div className="lg:col-span-7 divide-y divide-stone-300/80 dark:divide-zinc-800 flex flex-col justify-between">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-stone-300/80 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-[#D95D39] dark:text-[#E87A5A]">
                  02
                </span>
                <Sliders className="w-4 h-4 text-stone-600 dark:text-stone-400 shrink-0" />
                <h2 className="uppercase tracking-wider text-[11px] font-mono font-semibold text-zinc-900 dark:text-stone-100">
                  PEDAGOGICAL SPECIFICATION SHEET
                </h2>
              </div>
              <span className="text-[11px] font-mono text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                SCHEMA: TUTOR_CONFIG
              </span>
            </div>

            {/* Row 1: Education Level & Tutor Voice Persona Selects */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="education-level-select"
                  className="block uppercase tracking-wider text-[11px] font-mono text-stone-500 dark:text-stone-400 mb-1.5"
                >
                  02.A // TARGET ACADEMIC LEVEL
                </label>
                <select
                  id="education-level-select"
                  value={educationLevel}
                  onChange={(e) => onChangeEducationLevel(e.target.value as EducationLevel)}
                  className="w-full rounded-md border border-stone-300/80 dark:border-zinc-800 bg-[#F7F6F2] dark:bg-[#111110] px-3 py-2 text-xs font-medium text-zinc-900 dark:text-stone-100 focus:outline-none focus:border-[#D95D39]"
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
                  className="block uppercase tracking-wider text-[11px] font-mono text-stone-500 dark:text-stone-400 mb-1.5"
                >
                  02.B // TUTOR CADENCE &amp; PERSONA
                </label>
                <select
                  id="tutor-persona-select"
                  value={persona}
                  onChange={(e) => onChangePersona(e.target.value as TutorPersona)}
                  className="w-full rounded-md border border-stone-300/80 dark:border-zinc-800 bg-[#F7F6F2] dark:bg-[#111110] px-3 py-2 text-xs font-medium text-zinc-900 dark:text-stone-100 focus:outline-none focus:border-[#D95D39]"
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
            <div className="p-4 rounded-md bg-[#F7F6F2] dark:bg-[#111110] border border-stone-300/80 dark:border-zinc-800 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="simplicity-slider"
                  className="uppercase tracking-wider text-[11px] font-mono text-stone-600 dark:text-stone-400"
                >
                  02.C // EXPLANATION SIMPLICITY &amp; PACING (1–5)
                </label>
                <span className="text-xs font-mono font-semibold text-[#D95D39] dark:text-[#E87A5A] tabular-nums">
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
                className="w-full accent-[#D95D39] cursor-pointer"
              />

              <div className="flex justify-between text-[11px] font-mono text-stone-500 dark:text-stone-400">
                <span>1: ELI5 &amp; ANALOGIES</span>
                <span>3: BALANCED</span>
                <span>5: RIGOROUS DEPTH</span>
              </div>

              <p className="text-xs text-stone-600 dark:text-stone-400">
                {SIMPLICITY_LABELS[simplicityLevel].description}
              </p>
            </div>

            {/* Row 3: Teaching Methodology (Architectural Segmented Grid) */}
            <div className="space-y-2">
              <span className="block uppercase tracking-wider text-[11px] font-mono text-stone-500 dark:text-stone-400">
                02.D // TEACHING METHODOLOGY
              </span>
              <div
                className="grid grid-cols-1 sm:grid-cols-3 border border-stone-300/80 dark:border-zinc-800 rounded-md overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-stone-300/80 dark:divide-zinc-800"
                role="radiogroup"
                aria-label="Teaching Methodology"
              >
                {METHODOLOGY_OPTIONS.map((item, idx) => {
                  const active = methodology === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => onChangeMethodology(item.value)}
                      className={`text-left p-3.5 transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#EFECE6] dark:bg-[#222220] text-zinc-900 dark:text-stone-100 border-t-2 border-t-[#D95D39]'
                          : 'bg-[#FCFBF9] dark:bg-[#181816] text-stone-700 dark:text-stone-300 hover:bg-[#F7F6F2] dark:hover:bg-[#141413]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold font-display whitespace-nowrap shrink-0">
                          <span className="font-mono text-[11px] text-stone-500 mr-1">
                            0{idx + 1}.
                          </span>
                          {item.label}
                        </span>
                        {active && (
                          <Check className="w-3.5 h-3.5 text-[#D95D39] dark:text-[#E87A5A] shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-snug">
                        {item.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 4: Learning Focus (Multi-select Rectangular Spec Switches) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="uppercase tracking-wider text-[11px] font-mono text-stone-500 dark:text-stone-400">
                  02.E // LEARNING FOCUS AREAS (MULTI-SELECT)
                </span>
                <span className="text-[11px] font-mono tabular-nums text-stone-500 dark:text-stone-400">
                  {focusAreas.length} ACTIVE
                </span>
              </div>
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                role="group"
                aria-label="Learning Focus Areas"
              >
                {FOCUS_AREA_OPTIONS.map((area, idx) => {
                  const isSelected = focusAreas.includes(area.value);
                  return (
                    <button
                      key={area.value}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => onToggleFocusArea(area.value)}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md text-xs font-mono border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-900 dark:bg-stone-100 text-stone-100 dark:text-zinc-900 border-zinc-900 dark:border-stone-100 font-semibold'
                          : 'bg-[#F7F6F2] dark:bg-[#111110] text-stone-700 dark:text-stone-300 border-stone-300/80 dark:border-zinc-800 hover:border-stone-400 dark:hover:border-zinc-700'
                      }`}
                    >
                      <span>
                        0{idx + 1} · {area.label}
                      </span>
                      <Check
                        className={`w-3.5 h-3.5 transition-opacity ${
                          isSelected ? 'opacity-100 text-[#D95D39]' : 'opacity-0'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Primary Action Footer */}
          <div className="bg-[#EFECE6]/60 dark:bg-[#141413] p-6 space-y-3.5">
            {!isTextValidForGeneration && (
              <div
                role="alert"
                className="p-3 rounded-md border border-amber-600/40 bg-amber-950/10 text-xs font-mono text-amber-800 dark:text-amber-300"
              >
                Source text must be at least 20 characters before generating a lesson (currently{' '}
                {rawText.trim().length} chars).
              </div>
            )}

            {generationError && (
              <div
                role="alert"
                className="p-3.5 rounded-md border border-rose-600/40 bg-rose-950/10 text-xs font-mono text-rose-800 dark:text-rose-300"
              >
                {generationError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-zinc-900 dark:text-stone-100">
                  {isGenerating
                    ? 'NVIDIA Nemotron 3.5 Bolt (enable_thinking=True) is compiling your lesson...'
                    : 'Ready to compile interactive concept modules'}
                </p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 font-mono tabular-nums">
                  SESSION: {outgoingPayload.session_id.slice(0, 13)}... · MODULES: AUTO-SCALED
                </p>
              </div>

              <button
                id="generate-interactive-lesson-btn"
                type="button"
                disabled={isGenerating || isParsingDocument || !isTextValidForGeneration}
                onClick={onGenerateLesson}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-md text-xs font-mono font-semibold uppercase tracking-wider text-white bg-[#D95D39] hover:bg-[#C04E2C] border border-[#D95D39] disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{generationStepText || 'Generating Lesson...'}</span>
                  </>
                ) : (
                  <>
                    <span>Generate Interactive Lesson</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


