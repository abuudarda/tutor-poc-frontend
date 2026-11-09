import { NextRequest, NextResponse } from 'next/server';
import {
  OutgoingRequestPayload,
  synthesizeAdaptiveLessonFromPayload,
  validateIncomingLessonJson,
} from '@/lib/tutor-contracts';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as OutgoingRequestPayload;
    if (!body || !body.source_material || !body.tutor_config) {
      return NextResponse.json(
        { error: 'Invalid OutgoingRequestPayload JSON contract.' },
        { status: 400 }
      );
    }

    const generated = synthesizeAdaptiveLessonFromPayload(body);
    const check = validateIncomingLessonJson(JSON.stringify(generated));
    if (!check.valid) {
      return NextResponse.json({ error: check.error }, { status: 500 });
    }

    return NextResponse.json(check.data, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to parse request JSON.' },
      { status: 400 }
    );
  }
}
