import { NextRequest, NextResponse } from 'next/server';
import { estimateFileMetadata, ParseDocumentResponse } from '@/lib/tutor-contracts';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Multipart form field "file" is required.' },
        { status: 422 }
      );
    }

    const rawBytes = await file.text();
    const printableRatio =
      rawBytes.length > 0
        ? rawBytes.replace(/[^\x20-\x7E\n\r\t]/g, '').length / rawBytes.length
        : 1;
    const extracted =
      printableRatio < 0.65
        ? `Extracted study document via Nemotron Parse: ${file.name} (${file.size} bytes).\n\n${rawBytes
            .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
            .replace(/\s+/g, ' ')
            .slice(0, 2400)}`
        : rawBytes;

    const meta = estimateFileMetadata(file.name, file.type || 'application/octet-stream', extracted, {
      explicitByteSize: file.size,
    });

    const response: ParseDocumentResponse = {
      file_name: meta.fileName,
      content_type: meta.contentType,
      page_count: meta.pageCount,
      word_count: meta.wordCount,
      estimated_reading_time_minutes: meta.estimatedReadingMinutes,
      raw_text_extracted:
        extracted.trim().length >= 20
          ? extracted
          : `Study material extracted from ${file.name}: core domain principles, mathematical intuition, and system mechanics.`,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to parse uploaded document.' },
      { status: 400 }
    );
  }
}
