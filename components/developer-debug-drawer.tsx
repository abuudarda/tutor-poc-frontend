'use client';

import React, { useState } from 'react';
import {
  Terminal,
  X,
  Check,
  Copy,
  RotateCcw,
  Play,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  OutgoingRequestPayload,
  IncomingLessonResponse,
  DEFAULT_INCOMING_LESSON,
  validateIncomingLessonJson,
} from '@/lib/tutor-contracts';

interface DeveloperDebugDrawerProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  outgoingPayload: OutgoingRequestPayload;
  incomingLesson: IncomingLessonResponse;
  onApplyCustomLesson: (customLesson: IncomingLessonResponse) => void;
}

export function DeveloperDebugDrawer({
  isOpen,
  onOpen,
  onClose,
  outgoingPayload,
  incomingLesson,
  onApplyCustomLesson,
}: DeveloperDebugDrawerProps) {
  const [incomingDraft, setIncomingDraft] = useState<string>(() =>
    JSON.stringify(incomingLesson, null, 2)
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [copiedOutgoing, setCopiedOutgoing] = useState(false);

  const handleApplyJson = () => {
    const result = validateIncomingLessonJson(incomingDraft);
    if (!result.valid) {
      setValidationError(result.error);
      setAppliedSuccess(false);
      return;
    }
    setValidationError(null);
    onApplyCustomLesson(result.data);
    setAppliedSuccess(true);
    setTimeout(() => {
      setAppliedSuccess(false);
    }, 2000);
  };

  const handleResetDefault = () => {
    const defaultStr = JSON.stringify(DEFAULT_INCOMING_LESSON, null, 2);
    setIncomingDraft(defaultStr);
    setValidationError(null);
  };

  const handleCopyOutgoing = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(outgoingPayload, null, 2));
      setCopiedOutgoing(true);
      setTimeout(() => setCopiedOutgoing(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <>
      {/* Floating Bottom-Left Trigger Button (offset cleanly from dev corner badge) */}
      <div className="fixed bottom-4 left-16 z-40">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-slate-100 border border-slate-700 shadow-lg hover:bg-slate-800 dark:hover:bg-slate-700 text-xs font-mono font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
          aria-label="Open Developer Debug Drawer"
        >
          <Terminal className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Developer JSON Sandbox</span>
        </button>
      </div>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80"
          role="dialog"
          aria-modal="true"
          aria-labelledby="debug-modal-title"
        >
          <div className="w-full max-w-6xl max-h-[90vh] rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-4 h-4 text-indigo-400 shrink-0" />
                <h2
                  id="debug-modal-title"
                  className="text-sm sm:text-base font-bold font-display text-white"
                >
                  Developer Contract Inspector & Incoming Lesson Sandbox
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close Developer Debug Drawer"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Split Content Body */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
              {/* Left Column: Outgoing Request JSON (Frontend -> Backend) */}
              <div className="flex flex-col space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold text-indigo-300 font-mono">
                      1. Outgoing Request JSON (Frontend → Backend)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Live payload synchronized with Setup Studio form controls
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyOutgoing}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {copiedOutgoing ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Request</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex-1 rounded-xl border border-slate-800 bg-slate-950 p-4 overflow-auto max-h-[420px]">
                  <pre className="text-xs font-mono text-slate-200 leading-relaxed">
                    {JSON.stringify(outgoingPayload, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Right Column: Editable Incoming Response JSON (Backend -> Frontend) */}
              <div className="flex flex-col space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label
                      htmlFor="incoming-json-sandbox-textarea"
                      className="block text-xs font-semibold text-emerald-300 font-mono"
                    >
                      2. Incoming Response JSON (Backend → Frontend · Editable)
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Paste custom backend JSON here and click Apply to render in the classroom
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetDefault}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-slate-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Default JSON</span>
                  </button>
                </div>

                <textarea
                  id="incoming-json-sandbox-textarea"
                  rows={16}
                  value={incomingDraft}
                  onChange={(e) => {
                    setIncomingDraft(e.target.value);
                    setValidationError(null);
                  }}
                  spellCheck={false}
                  className="w-full flex-1 rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-emerald-200 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 max-h-[420px]"
                />

                {validationError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 p-3 rounded-lg border border-rose-800 bg-rose-950/60 text-xs text-rose-200 font-mono"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>Schema Error: {validationError}</span>
                  </div>
                )}

                {appliedSuccess && (
                  <div
                    role="status"
                    className="flex items-center gap-2 p-3 rounded-lg border border-emerald-800 bg-emerald-950/60 text-xs text-emerald-200 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Incoming Lesson JSON validated and rendered in the Interactive Classroom!
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs font-mono text-slate-400">
                Strict schema validation checks: lesson_id, chapter_title, modules[], spoken_narration, visual_analogy, key_points[], understanding_check
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleApplyJson}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Apply Custom Lesson JSON & Render</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
