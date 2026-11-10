'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  ExternalLink,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  BookOpen,
  Type,
  Sparkles,
  Image as ImageIcon,
  FileCode2,
  ArrowUpRight,
} from 'lucide-react';

interface SourceMaterialViewerProps {
  sourceFile: File | null;
  sourceFileUrl: string | null;
  fileName: string;
  contentType: string;
  pageCount: number;
  rawSourceText: string;
  compact?: boolean;
  onAskTutorAboutParagraph?: (paragraphText: string) => void;
}

export function SourceMaterialViewer({
  sourceFile,
  sourceFileUrl,
  fileName,
  contentType,
  pageCount,
  rawSourceText,
  compact = false,
  onAskTutorAboutParagraph,
}: SourceMaterialViewerProps) {
  const lowerName = (fileName || '').toLowerCase();
  const lowerMime = (contentType || '').toLowerCase();

  const isPdfMaterial =
    Boolean(sourceFileUrl) &&
    (lowerMime === 'application/pdf' || lowerName.endsWith('.pdf'));

  const isImageMaterial =
    Boolean(sourceFileUrl) &&
    (lowerMime.startsWith('image/') ||
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg'));

  // Allow toggling to the searchable Source Reader even when a PDF or Image is loaded
  const [viewerSubMode, setViewerSubMode] = useState<'native' | 'reader'>('native');

  // PDF Controls State
  const [pageNum, setPageNum] = useState<number>(1);

  // Image Pan/Zoom Controls State
  const [imageZoom, setImageZoom] = useState<number>(100);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Source Reader Typography & Search State
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono'>('sans');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Split rawSourceText into clean numbered paragraphs
  const paragraphs = useMemo(() => {
    const cleaned = (rawSourceText || '').trim();
    if (!cleaned) return ['No source text available. Upload a document or paste study notes in the Setup Studio.'];
    const split = cleaned
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    return split.length > 0 ? split : [cleaned];
  }, [rawSourceText]);

  // Count keyword matches across paragraphs
  const totalKeywordMatches = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return 0;
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    const matches = (rawSourceText || '').match(regex);
    return matches ? matches.length : 0;
  }, [rawSourceText, searchQuery]);

  // Render text with highlighted search matches
  const renderHighlightedText = (text: string) => {
    const q = searchQuery.trim();
    if (!q) return text;
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, idx) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark
          key={idx}
          className="bg-amber-200 dark:bg-amber-500/40 text-slate-900 dark:text-amber-100 px-1 rounded font-semibold"
        >
          {part}
        </mark>
      ) : (
        <React.Fragment key={idx}>{part}</React.Fragment>
      )
    );
  };

  // Compute PDF iframe URL with #page=${pageNum}&toolbar=1&navpanes=0&view=FitH
  const pdfIframeSrc = useMemo(() => {
    if (!sourceFileUrl) return '';
    const clampedPage = Math.max(1, pageNum);
    return `${sourceFileUrl}#page=${clampedPage}&toolbar=1&navpanes=0&view=FitH`;
  }, [sourceFileUrl, pageNum]);

  const showNativePdf = isPdfMaterial && viewerSubMode === 'native';
  const showNativeImage = isImageMaterial && viewerSubMode === 'native';

  const readerFontClass =
    fontFamily === 'serif'
      ? 'font-serif'
      : fontFamily === 'mono'
      ? 'font-mono'
      : 'font-sans';

  const readerSizeClass =
    fontSize === 'sm'
      ? 'text-xs leading-relaxed'
      : fontSize === 'lg'
      ? 'text-base leading-loose'
      : 'text-sm leading-relaxed';

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
      {/* Top Utility Bar */}
      <div className="px-4 py-3 bg-slate-50/90 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {isPdfMaterial ? (
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          ) : isImageMaterial ? (
            <ImageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          ) : (
            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-white font-mono truncate max-w-[220px] sm:max-w-[300px]">
                {fileName || 'study_material.txt'}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/70 shrink-0">
                {isPdfMaterial
                  ? 'PDF Viewer'
                  : isImageMaterial
                  ? 'Image Canvas'
                  : 'Source Reader'}
              </span>
            </div>
            {sourceFile && (
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Local Blob · {(sourceFile.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
        </div>

        {/* Utility Controls: Jump to Page (for PDF), Pan/Zoom (for Image), or Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {(isPdfMaterial || isImageMaterial) && (
            <div
              className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-[11px]"
              role="group"
              aria-label="Document rendering mode"
            >
              <button
                type="button"
                onClick={() => setViewerSubMode('native')}
                className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  viewerSubMode === 'native'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {isPdfMaterial ? 'PDF Embed' : 'Image View'}
              </button>
              <button
                type="button"
                onClick={() => setViewerSubMode('reader')}
                className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  viewerSubMode === 'reader'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Text Reader
              </button>
            </div>
          )}

          {showNativePdf && sourceFileUrl && (
            <>
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs">
                <label
                  htmlFor="pdf-jump-to-page"
                  className="text-[11px] font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap"
                >
                  Jump to Page:
                </label>
                <input
                  id="pdf-jump-to-page"
                  type="number"
                  min={1}
                  max={Math.max(1, pageCount || 999)}
                  value={pageNum}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setPageNum(Number.isNaN(val) || val < 1 ? 1 : val);
                  }}
                  className="w-12 text-center font-mono text-xs font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                  / {Math.max(1, pageCount)}
                </span>
              </div>

              <a
                href={sourceFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Open in New Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </>
          )}

          {showNativeImage && sourceFileUrl && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setImageZoom((z) => Math.max(50, z - 25))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                aria-label="Zoom out image"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono tabular-nums px-1.5 text-slate-700 dark:text-slate-300">
                {imageZoom}%
              </span>
              <button
                type="button"
                onClick={() => setImageZoom((z) => Math.min(300, z + 25))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                aria-label="Zoom in image"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setImageZoom(100);
                  setPanOffset({ x: 0, y: 0 });
                }}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                aria-label="Reset image zoom and pan"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <a
                href={sourceFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 whitespace-nowrap"
              >
                <span>Open in New Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* MODE 1: Embedded Native PDF Viewer */}
      {showNativePdf && sourceFileUrl ? (
        <div className="p-3 bg-slate-100 dark:bg-slate-950 flex-1">
          <div
            className={`w-full ${
              compact ? 'h-[580px]' : 'h-[680px]'
            } rounded-xl overflow-hidden bg-white dark:bg-slate-900`}
          >
            <iframe
              key={`${sourceFileUrl}-page-${pageNum}`}
              src={pdfIframeSrc}
              className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-800"
              title="Study Material PDF Viewer"
            />
          </div>
        </div>
      ) : showNativeImage && sourceFileUrl ? (
        /* MODE 2: Zoomable & Pannable Study Image Viewer */
        <div
          className={`relative overflow-hidden bg-slate-950 flex items-center justify-center select-none ${
            compact ? 'h-[540px]' : 'h-[640px]'
          } ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={(e) => {
            setIsPanning(true);
            setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
          }}
          onMouseMove={(e) => {
            if (!isPanning) return;
            setPanOffset({
              x: e.clientX - panStart.x,
              y: e.clientY - panStart.y,
            });
          }}
          onMouseUp={() => setIsPanning(false)}
          onMouseLeave={() => setIsPanning(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sourceFileUrl}
            alt={fileName || 'Uploaded study diagram'}
            draggable={false}
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${
                imageZoom / 100
              })`,
              transformOrigin: 'center center',
            }}
            className="max-w-full max-h-full object-contain transition-transform duration-75"
          />
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-700 text-[11px] font-mono text-slate-300">
            Drag to pan · Zoom {imageZoom}%
          </div>
        </div>
      ) : (
        /* MODE 3: Distraction-Free Source Reader (.txt, .md, .docx, Pasted Text, or Text Fallback) */
        <div className="flex flex-col flex-1">
          {/* Reader Toolbar: Keyword Search + Typography Controls */}
          <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            {/* Live Keyword Search Bar */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                aria-label="Search keywords in source document"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search terms in source text..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-8 pr-20 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery.trim().length > 0 && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                  {totalKeywordMatches} {totalKeywordMatches === 1 ? 'match' : 'matches'}
                </span>
              )}
            </div>

            {/* Typography Controls: Font Family & Font Size */}
            <div className="flex items-center gap-2 shrink-0">
              <div
                className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-[11px]"
                role="group"
                aria-label="Reader font family"
              >
                {(['sans', 'serif', 'mono'] as const).map((fam) => (
                  <button
                    key={fam}
                    type="button"
                    onClick={() => setFontFamily(fam)}
                    className={`px-2 py-0.5 rounded font-medium capitalize transition-colors cursor-pointer ${
                      fontFamily === fam
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {fam}
                  </button>
                ))}
              </div>

              <div
                className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-[11px]"
                role="group"
                aria-label="Reader font size"
              >
                <Type className="w-3.5 h-3.5 text-slate-400 mx-1" />
                {(['sm', 'md', 'lg'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setFontSize(sz)}
                    className={`px-2 py-0.5 rounded font-mono uppercase transition-colors cursor-pointer ${
                      fontSize === sz
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Numbered Paragraphs Reader Stream */}
          <div
            className={`p-5 space-y-4 overflow-y-auto ${
              compact ? 'max-h-[580px]' : 'max-h-[680px]'
            } bg-white dark:bg-slate-900 ${readerFontClass}`}
          >
            {paragraphs.map((para, idx) => {
              const isHeading =
                para.length < 100 &&
                (/^(chapter|section|part|\d+\.|#)/i.test(para) || !para.includes('. '));

              return (
                <article
                  key={idx}
                  className={`group rounded-xl border p-4 transition-colors ${
                    isHeading
                      ? 'border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/25'
                      : 'border-slate-200/70 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-mono font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                      ¶ {String(idx + 1).padStart(2, '0')}
                    </span>

                    {onAskTutorAboutParagraph && (
                      <button
                        type="button"
                        onClick={() => onAskTutorAboutParagraph(para)}
                        className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Ask AI Tutor about ¶ {String(idx + 1).padStart(2, '0')}</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <p
                    className={`${readerSizeClass} ${
                      isHeading
                        ? 'font-bold text-slate-900 dark:text-white font-display'
                        : 'text-slate-800 dark:text-slate-200'
                    } whitespace-pre-wrap`}
                  >
                    {renderHighlightedText(para)}
                  </p>
                </article>
              );
            })}
          </div>

          {/* Reader Footer Status */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <FileCode2 className="w-3.5 h-3.5 text-indigo-500" />
              {paragraphs.length} numbered {paragraphs.length === 1 ? 'section' : 'sections'}
            </span>
            <span>
              {(rawSourceText || '').trim().split(/\s+/).filter(Boolean).length} words total
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
