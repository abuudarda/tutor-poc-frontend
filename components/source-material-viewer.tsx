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
    if (!cleaned)
      return [
        'No source text available. Upload a document or paste study notes in the Setup Studio.',
      ];
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
          className="bg-[#D95D39]/25 text-zinc-900 dark:text-stone-100 px-1 rounded-none font-semibold"
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
    <div className="rounded-md border border-stone-300/80 dark:border-zinc-800 bg-[#FCFBF9] dark:bg-[#181816] overflow-hidden flex flex-col">
      {/* Top Utility Bar */}
      <div className="px-4 py-3 bg-[#EFECE6]/70 dark:bg-[#141413] border-b border-stone-300/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {isPdfMaterial ? (
            <FileText className="w-4 h-4 text-[#D95D39] dark:text-[#E87A5A] shrink-0" />
          ) : isImageMaterial ? (
            <ImageIcon className="w-4 h-4 text-[#D95D39] dark:text-[#E87A5A] shrink-0" />
          ) : (
            <BookOpen className="w-4 h-4 text-[#D95D39] dark:text-[#E87A5A] shrink-0" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-900 dark:text-stone-100 font-mono truncate max-w-[220px] sm:max-w-[300px]">
                {fileName || 'study_material.txt'}
              </span>
              <span className="px-1.5 py-0.5 rounded-none text-[10px] font-mono uppercase tracking-wider bg-[#FCFBF9] dark:bg-[#181816] text-[#D95D39] dark:text-[#E87A5A] border border-stone-300/80 dark:border-zinc-700 shrink-0">
                {isPdfMaterial
                  ? 'PDF VIEWER'
                  : isImageMaterial
                  ? 'IMAGE CANVAS'
                  : 'SOURCE READER'}
              </span>
            </div>
            {sourceFile && (
              <p className="text-[11px] font-mono text-stone-500 dark:text-stone-400">
                LOCAL BLOB · {(sourceFile.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
        </div>

        {/* Utility Controls: Jump to Page (for PDF), Pan/Zoom (for Image), or Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {(isPdfMaterial || isImageMaterial) && (
            <div
              className="flex items-center border border-stone-300/80 dark:border-zinc-700 rounded-md overflow-hidden bg-[#EFECE6] dark:bg-[#222220] text-[11px] font-mono"
              role="group"
              aria-label="Document rendering mode"
            >
              <button
                type="button"
                onClick={() => setViewerSubMode('native')}
                className={`px-2.5 py-1 transition-colors cursor-pointer whitespace-nowrap ${
                  viewerSubMode === 'native'
                    ? 'bg-[#FCFBF9] dark:bg-[#181816] text-zinc-900 dark:text-stone-100 font-semibold'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                {isPdfMaterial ? 'PDF Embed' : 'Image View'}
              </button>
              <button
                type="button"
                onClick={() => setViewerSubMode('reader')}
                className={`px-2.5 py-1 border-l border-stone-300/80 dark:border-zinc-700 transition-colors cursor-pointer whitespace-nowrap ${
                  viewerSubMode === 'reader'
                    ? 'bg-[#FCFBF9] dark:bg-[#181816] text-zinc-900 dark:text-stone-100 font-semibold'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                Text Reader
              </button>
            </div>
          )}

          {showNativePdf && sourceFileUrl && (
            <>
              <div className="flex items-center gap-1.5 bg-[#FCFBF9] dark:bg-[#181816] border border-stone-300/80 dark:border-zinc-700 rounded-md px-2.5 py-1 text-xs font-mono">
                <label
                  htmlFor="pdf-jump-to-page"
                  className="text-[11px] text-stone-600 dark:text-stone-400 whitespace-nowrap"
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
                  className="w-12 text-center font-mono text-xs font-semibold text-zinc-900 dark:text-stone-100 bg-[#F7F6F2] dark:bg-[#111110] border border-stone-300/80 dark:border-zinc-700 rounded-none px-1 py-0.5 focus:outline-none focus:border-[#D95D39]"
                />
                <span className="text-[11px] font-mono text-stone-500 tabular-nums">
                  / {Math.max(1, pageCount)}
                </span>
              </div>

              <a
                href={sourceFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono font-semibold bg-[#D95D39] hover:bg-[#C04E2C] text-white transition-colors whitespace-nowrap shrink-0"
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
                className="p-1.5 rounded-md border border-stone-300/80 dark:border-zinc-700 bg-[#FCFBF9] dark:bg-[#181816] text-stone-700 dark:text-stone-300 hover:bg-[#EFECE6] cursor-pointer"
                aria-label="Zoom out image"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono tabular-nums px-1.5 text-stone-700 dark:text-stone-300">
                {imageZoom}%
              </span>
              <button
                type="button"
                onClick={() => setImageZoom((z) => Math.min(300, z + 25))}
                className="p-1.5 rounded-md border border-stone-300/80 dark:border-zinc-700 bg-[#FCFBF9] dark:bg-[#181816] text-stone-700 dark:text-stone-300 hover:bg-[#EFECE6] cursor-pointer"
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
                className="p-1.5 rounded-md border border-stone-300/80 dark:border-zinc-700 bg-[#FCFBF9] dark:bg-[#181816] text-stone-700 dark:text-stone-300 hover:bg-[#EFECE6] cursor-pointer"
                aria-label="Reset image zoom and pan"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <a
                href={sourceFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-mono font-semibold bg-[#D95D39] text-white whitespace-nowrap"
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
        <div className="p-3 bg-[#EFECE6] dark:bg-[#111110] flex-1">
          <div
            className={`w-full ${
              compact ? 'h-[580px]' : 'h-[680px]'
            } rounded-md overflow-hidden bg-[#FCFBF9] dark:bg-[#181816]`}
          >
            <iframe
              key={`${sourceFileUrl}-page-${pageNum}`}
              src={pdfIframeSrc}
              className="w-full h-full rounded-md border border-stone-300/80 dark:border-zinc-800"
              title="Study Material PDF Viewer"
            />
          </div>
        </div>
      ) : showNativeImage && sourceFileUrl ? (
        /* MODE 2: Zoomable & Pannable Study Image Viewer */
        <div
          className={`relative overflow-hidden bg-[#111110] flex items-center justify-center select-none ${
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
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-none bg-[#181816]/90 border border-zinc-700 text-[11px] font-mono text-stone-300">
            DRAG TO PAN · ZOOM {imageZoom}%
          </div>
        </div>
      ) : (
        /* MODE 3: Distraction-Free Source Reader (.txt, .md, .docx, Pasted Text, or Text Fallback) */
        <div className="flex flex-col flex-1">
          {/* Reader Toolbar: Keyword Search + Typography Controls */}
          <div className="px-4 py-2.5 bg-[#FCFBF9] dark:bg-[#181816] border-b border-stone-300/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
            {/* Live Keyword Search Bar */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                aria-label="Search keywords in source document"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search terms in source text..."
                className="w-full rounded-md border border-stone-300/80 dark:border-zinc-800 bg-[#F7F6F2] dark:bg-[#111110] pl-8 pr-20 py-1.5 text-xs text-zinc-900 dark:text-stone-100 focus:outline-none focus:border-[#D95D39]"
              />
              {searchQuery.trim().length > 0 && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono font-semibold text-[#D95D39] dark:text-[#E87A5A]">
                  {totalKeywordMatches} {totalKeywordMatches === 1 ? 'match' : 'matches'}
                </span>
              )}
            </div>

            {/* Typography Controls: Font Family & Font Size */}
            <div className="flex items-center gap-2 shrink-0">
              <div
                className="flex items-center border border-stone-300/80 dark:border-zinc-700 rounded-md overflow-hidden bg-[#EFECE6] dark:bg-[#222220] text-[11px] font-mono"
                role="group"
                aria-label="Reader font family"
              >
                {(['sans', 'serif', 'mono'] as const).map((fam) => (
                  <button
                    key={fam}
                    type="button"
                    onClick={() => setFontFamily(fam)}
                    className={`px-2 py-0.5 capitalize transition-colors cursor-pointer ${
                      fontFamily === fam
                        ? 'bg-[#FCFBF9] dark:bg-[#181816] text-[#D95D39] dark:text-[#E87A5A] font-semibold'
                        : 'text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    {fam}
                  </button>
                ))}
              </div>

              <div
                className="flex items-center border border-stone-300/80 dark:border-zinc-700 rounded-md overflow-hidden bg-[#EFECE6] dark:bg-[#222220] text-[11px] font-mono"
                role="group"
                aria-label="Reader font size"
              >
                <Type className="w-3.5 h-3.5 text-stone-500 mx-1" />
                {(['sm', 'md', 'lg'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setFontSize(sz)}
                    className={`px-2 py-0.5 uppercase transition-colors cursor-pointer ${
                      fontSize === sz
                        ? 'bg-[#FCFBF9] dark:bg-[#181816] text-[#D95D39] dark:text-[#E87A5A] font-semibold'
                        : 'text-stone-600 dark:text-stone-400'
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
            } bg-[#FCFBF9] dark:bg-[#181816] ${readerFontClass}`}
          >
            {paragraphs.map((para, idx) => {
              const isHeading =
                para.length < 100 &&
                (/^(chapter|section|part|\d+\.|#)/i.test(para) || !para.includes('. '));

              return (
                <article
                  key={idx}
                  className={`group rounded-md border p-4 transition-colors ${
                    isHeading
                      ? 'border-l-4 border-l-[#D95D39] border-stone-300/80 dark:border-zinc-800 bg-[#EFECE6]/50 dark:bg-[#222220]'
                      : 'border-stone-300/80 dark:border-zinc-800 bg-[#F7F6F2]/70 dark:bg-[#111110]/70 hover:border-stone-400 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-mono font-semibold text-[#D95D39] dark:text-[#E87A5A] tabular-nums">
                      ¶ {String(idx + 1).padStart(2, '0')}
                    </span>

                    {onAskTutorAboutParagraph && (
                      <button
                        type="button"
                        onClick={() => onAskTutorAboutParagraph(para)}
                        className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 hover:text-[#D95D39] dark:hover:text-[#E87A5A] transition-colors cursor-pointer"
                      >
                        <span>Ask Tutor // ¶ {String(idx + 1).padStart(2, '0')}</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <p
                    className={`${readerSizeClass} ${
                      isHeading
                        ? 'font-bold text-zinc-900 dark:text-stone-100 font-display'
                        : 'text-zinc-800 dark:text-stone-200'
                    } whitespace-pre-wrap`}
                  >
                    {renderHighlightedText(para)}
                  </p>
                </article>
              );
            })}
          </div>

          {/* Reader Footer Status */}
          <div className="px-4 py-2.5 bg-[#EFECE6]/70 dark:bg-[#141413] border-t border-stone-300/80 dark:border-zinc-800 flex items-center justify-between text-[11px] font-mono text-stone-500 dark:text-stone-400">
            <span className="flex items-center gap-1.5">
              <FileCode2 className="w-3.5 h-3.5 text-[#D95D39]" />
              {paragraphs.length} NUMBERED {paragraphs.length === 1 ? 'SECTION' : 'SECTIONS'}
            </span>
            <span>
              {(rawSourceText || '').trim().split(/\s+/).filter(Boolean).length} WORDS TOTAL
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

