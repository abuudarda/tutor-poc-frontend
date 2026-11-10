import { NextRequest, NextResponse } from 'next/server';
import {
  EvaluateCheckpointRequest,
  evaluateUnderstandingResponse,
} from '@/lib/tutor-contracts';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EvaluateCheckpointRequest;
    if (
      !body ||
      !body.module_id ||
      typeof body.user_response !== 'string' ||
      !body.tutor_config ||
      !Array.isArray(body.tutor_config.focus_areas)
    ) {
      return NextResponse.json(
        { error: '422 Validation Error: Missing required fields or tutor_config.focus_areas.' },
        { status: 422 }
      );
    }

    const result = evaluateUnderstandingResponse(body.user_response, {
      question_spoken: body.question_asked || '',
      expected_concepts: Array.isArray(body.expected_concepts) ? body.expected_concepts : [],
      hint: 'Connect the concept back to its everyday mental model.',
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to evaluate checkpoint.' },
      { status: 400 }
    );
  }
}
