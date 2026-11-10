import { NextRequest, NextResponse } from 'next/server';
import {
  TutorChatRequest,
  generateContextualTutorReply,
} from '@/lib/tutor-contracts';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TutorChatRequest;
    if (
      !body ||
      !body.active_module_id ||
      !body.active_module_context ||
      !body.tutor_config ||
      !Array.isArray(body.tutor_config.focus_areas)
    ) {
      return NextResponse.json(
        { error: '422 Validation Error: Missing required fields or tutor_config.focus_areas.' },
        { status: 422 }
      );
    }

    const syntheticModule = {
      module_id: body.active_module_id,
      title: body.active_module_context.title,
      core_concept: body.active_module_context.core_concept,
      spoken_narration: body.active_module_context.core_concept,
      visual_analogy: {
        target_concept: body.active_module_context.title,
        everyday_parallel:
          body.active_module_context.key_points[0] || body.active_module_context.core_concept,
      },
      key_points: body.active_module_context.key_points,
      understanding_check: {
        question_spoken: `How would you explain ${body.active_module_context.title} in your own words?`,
        expected_concepts: ['intuition'],
        hint: 'Focus on the main cause-and-effect relationship.',
      },
    };

    const reply = generateContextualTutorReply(
      body.user_message,
      syntheticModule,
      body.tutor_config,
      body.quick_action
    );

    const encoder = new TextEncoder();
    const words = reply.written_markdown.split(' ');
    const stream = new ReadableStream({
      async start(controller) {
        for (const w of words) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: w + ' ' })}\n\n`));
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to stream tutor reply.' },
      { status: 400 }
    );
  }
}
