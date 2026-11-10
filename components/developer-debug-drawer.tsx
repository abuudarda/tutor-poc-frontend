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
  Activity,
  Radio,
} from 'lucide-react';
import {
  OutgoingRequestPayload,
  IncomingLessonResponse,
  EndpointKey,
  ApiTrafficLogEntry,
  DEFAULT_INCOMING_LESSON,
  validateIncomingLessonJson,
} from '@/lib/tutor-contracts';

interface DeveloperDebugDrawerProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  outgoingPayload: OutgoingRequestPayload;
  incomingLesson: IncomingLessonResponse;
  apiTrafficLogs: Record<EndpointKey, ApiTrafficLogEntry | null>;
  sseStreamingEnabled: boolean;
  onToggleSseStreaming: (enabled: boolean) => void;
  onApplyCustomLesson: (customLesson: IncomingLessonResponse) => void;
}

const ENDPOINT_TABS: { key: EndpointKey; label: string; path: string }[] = [
  { key: 'parse-document', label: 'A. Parse Document', path: '/api/v1/parse-document' },
  { key: 'generate-lesson', label: 'B. Generate Lesson', path: '/api/v1/generate-lesson' },
  {
    key: 'evaluate-checkpoint',
    label: 'C. Evaluate Checkpoint',
    path: '/api/v1/evaluate-checkpoint',
  },
  { key: 'tutor-chat', label: 'D/E. Tutor Chat', path: '/api/v1/tutor-chat' },
];

export function DeveloperDebugDrawer({
  isOpen,
  onClose,
  outgoingPayload,
  incomingLesson,
  apiTrafficLogs,
  sseStreamingEnabled,
  onToggleSseStreaming,
  onApplyCustomLesson,
}: DeveloperDebugDrawerProps) {
  const [activeTab, setActiveTab] = useState<'sandbox' | 'traffic'>('sandbox');
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointKey>('generate-lesson');
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

  const currentTrafficEntry = apiTrafficLogs[selectedEndpoint];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#111110]/85"
      role="dialog"
      aria-modal="true"
      aria-labelledby="debug-modal-title"
    >
      <div className="w-full max-w-6xl max-h-[90vh] rounded-md border border-zinc-700 bg-[#181816] text-stone-100 shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#111110] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Terminal className="w-4 h-4 text-[#D95D39] shrink-0" />
            <h2
              id="debug-modal-title"
              className="text-sm sm:text-base font-bold font-display text-stone-100"
            >
              Developer Contract Inspector &amp; Live FastAPI Traffic Log
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Tabs inside Drawer */}
            <div className="flex items-center border border-zinc-700 rounded-md overflow-hidden bg-[#181816]">
              <button
                type="button"
                onClick={() => setActiveTab('sandbox')}
                className={`px-3 py-1 text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'sandbox'
                    ? 'bg-[#D95D39] text-white font-semibold'
                    : 'text-stone-400 hover:text-stone-100'
                }`}
              >
                Lesson JSON Sandbox
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('traffic')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 border-l border-zinc-700 text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'traffic'
                    ? 'bg-[#D95D39] text-white font-semibold'
                    : 'text-stone-400 hover:text-stone-100'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Live Endpoint Payloads (4)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Developer Debug Drawer"
              className="p-1.5 rounded-md text-stone-400 hover:text-stone-100 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {activeTab === 'sandbox' ? (
          /* TAB 1: Outgoing Request JSON + Editable Incoming Lesson JSON */
          <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
            {/* Left Column: Outgoing Request JSON */}
            <div className="flex flex-col space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold text-[#E87A5A] font-mono uppercase tracking-wider">
                    01 // Outgoing Request JSON (Frontend → Backend)
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Live payload synchronized with Setup Studio form controls
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyOutgoing}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-mono text-stone-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
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

              <div className="flex-1 rounded-md border border-zinc-800 bg-[#111110] p-4 overflow-auto max-h-[400px]">
                <pre className="text-xs font-mono text-stone-200 leading-relaxed">
                  {JSON.stringify(outgoingPayload, null, 2)}
                </pre>
              </div>
            </div>

            {/* Right Column: Editable Incoming Response JSON */}
            <div className="flex flex-col space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <label
                    htmlFor="incoming-json-sandbox-textarea"
                    className="block text-xs font-semibold text-emerald-400 font-mono uppercase tracking-wider"
                  >
                    02 // Incoming Response JSON (Backend → Frontend · Editable)
                  </label>
                  <p className="text-[11px] text-stone-400">
                    Paste custom backend JSON here and click Apply to render in the classroom
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-mono text-stone-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default JSON</span>
                </button>
              </div>

              <textarea
                id="incoming-json-sandbox-textarea"
                rows={15}
                value={incomingDraft}
                onChange={(e) => {
                  setIncomingDraft(e.target.value);
                  setValidationError(null);
                }}
                spellCheck={false}
                className="w-full flex-1 rounded-md border border-zinc-800 bg-[#111110] p-4 text-xs font-mono text-emerald-200 leading-relaxed focus:outline-none focus:border-[#D95D39] max-h-[400px]"
              />

              {validationError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 p-3 rounded-md border border-rose-800 bg-rose-950/60 text-xs text-rose-200 font-mono"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>Schema Error: {validationError}</span>
                </div>
              )}

              {appliedSuccess && (
                <div
                  role="status"
                  className="flex items-center gap-2 p-3 rounded-md border border-emerald-800 bg-emerald-950/60 text-xs text-emerald-200 font-mono"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Incoming Lesson JSON validated and rendered in the Interactive Classroom!
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* TAB 2: Live Endpoint Request/Response Traffic Inspector */
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-zinc-800">
              <div className="flex flex-wrap gap-2">
                {ENDPOINT_TABS.map((ep) => {
                  const entry = apiTrafficLogs[ep.key];
                  const active = selectedEndpoint === ep.key;
                  return (
                    <button
                      key={ep.key}
                      type="button"
                      onClick={() => setSelectedEndpoint(ep.key)}
                      className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-[#D95D39]/20 border-[#D95D39] text-stone-100 font-semibold'
                          : 'bg-[#111110] border-zinc-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <span>{ep.label}</span>
                      {entry && (
                        <span className="ml-2 text-[10px] text-emerald-400">
                          [{entry.status}]
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* SSE Toggle in Developer Sandbox */}
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-[#D95D39]" />
                <span className="text-xs font-mono text-stone-300">
                  Stream Tutor Replies (SSE):
                </span>
                <button
                  type="button"
                  onClick={() => onToggleSseStreaming(!sseStreamingEnabled)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                    sseStreamingEnabled
                      ? 'bg-emerald-950/40 border-emerald-600 text-emerald-300'
                      : 'bg-zinc-800 border-zinc-700 text-stone-400'
                  }`}
                >
                  {sseStreamingEnabled ? 'ON (/tutor-chat/stream)' : 'OFF (?stream=false)'}
                </button>
              </div>
            </div>

            {currentTrafficEntry ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono bg-[#111110] px-4 py-2.5 rounded-md border border-zinc-800">
                  <span className="text-[#E87A5A]">
                    {currentTrafficEntry.method} {currentTrafficEntry.url}
                  </span>
                  <span className="text-stone-400">
                    Status: {currentTrafficEntry.status} · Time: {currentTrafficEntry.timestamp}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-mono font-semibold text-[#E87A5A] mb-2 uppercase tracking-wider">
                      Latest Request Payload
                    </h4>
                    <div className="rounded-md border border-zinc-800 bg-[#111110] p-4 overflow-auto max-h-[340px]">
                      <pre className="text-xs font-mono text-stone-200 leading-relaxed">
                        {JSON.stringify(currentTrafficEntry.requestPayload, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-mono font-semibold text-emerald-400 mb-2 uppercase tracking-wider">
                      Latest Response Payload
                    </h4>
                    <div className="rounded-md border border-zinc-800 bg-[#111110] p-4 overflow-auto max-h-[340px]">
                      <pre className="text-xs font-mono text-emerald-200 leading-relaxed">
                        {JSON.stringify(currentTrafficEntry.responsePayload, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-zinc-800 bg-[#111110] p-8 text-center space-y-2">
                <p className="text-sm font-mono text-stone-300">
                  No live traffic recorded yet for{' '}
                  <code className="text-[#E87A5A]">{selectedEndpoint}</code>.
                </p>
                <p className="text-xs text-stone-500">
                  Trigger the corresponding action in the Setup Studio or Interactive Classroom to
                  inspect the exact JSON request and response payloads here.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#111110] border-t border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs font-mono text-stone-400">
            All tutor_config payloads enforce focus_areas[] and normalized FastAPI enums
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-mono text-stone-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Close
            </button>
            {activeTab === 'sandbox' && (
              <button
                type="button"
                onClick={handleApplyJson}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-mono font-semibold uppercase tracking-wider text-white bg-[#D95D39] hover:bg-[#C04E2C] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Apply Custom Lesson JSON &amp; Render</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
