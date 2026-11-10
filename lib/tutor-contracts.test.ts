import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_INCOMING_LESSON,
  DEFAULT_OUTGOING_REQUEST,
  buildOutgoingPayload,
  buildEvaluateCheckpointPayload,
  buildTutorChatPayload,
  estimateFileMetadata,
  evaluateUnderstandingResponse,
  extractTextFromSseChunk,
  generateContextualTutorReply,
  normalizeBaseUrl,
  normalizeTutorConfig,
  synthesizeAdaptiveLessonFromPayload,
  validateIncomingLessonJson,
} from './tutor-contracts';

test('normalizeBaseUrl strips trailing slashes cleanly', () => {
  assert.equal(
    normalizeBaseUrl('https://tutor-poc-backend.vercel.app///'),
    'https://tutor-poc-backend.vercel.app'
  );
  assert.equal(
    normalizeBaseUrl('https://tutor-poc-backend.vercel.app'),
    'https://tutor-poc-backend.vercel.app'
  );
  assert.equal(normalizeBaseUrl('   '), '');
});

test('normalizeTutorConfig maps legacy and backend enum strings and guarantees focus_areas', () => {
  const cfg = normalizeTutorConfig({
    education_level: 'graduate_phd',
    simplicity_level: 4,
    methodology: 'direct_structured',
    focus_areas: [],
    persona: 'crisp_academic',
  });

  assert.equal(cfg.education_level, 'graduate');
  assert.equal(cfg.methodology, 'direct');
  assert.deepEqual(cfg.focus_areas, ['core_intuition']);
  assert.equal(cfg.persona, 'crisp_academic');
});

test('estimateFileMetadata calculates word count, page count, reading time, and honors explicit values', () => {
  const sampleText = Array.from({ length: 360 }, (_, i) => `word_${i}`).join(' ');
  const meta = estimateFileMetadata('lecture_notes.md', 'text/markdown', sampleText, {
    explicitPageCount: 3,
    explicitWordCount: 420,
    explicitReadingMinutes: 4,
  });
  assert.equal(meta.fileName, 'lecture_notes.md');
  assert.equal(meta.pageCount, 3);
  assert.equal(meta.wordCount, 420);
  assert.equal(meta.estimatedReadingMinutes, 4);
});

test('buildOutgoingPayload, buildEvaluateCheckpointPayload, and buildTutorChatPayload include focus_areas', () => {
  const outgoing = buildOutgoingPayload({
    sessionId: 'uuid-test-1234',
    fileName: 'chapter_4_neural_networks.pdf',
    contentType: 'application/pdf',
    rawText: 'Gradient descent minimizes loss across deep networks.',
    educationLevel: 'professional',
    simplicityLevel: 2,
    methodology: 'direct',
    focusAreas: ['core_intuition', 'real_world_examples'],
    persona: 'warm_encouraging',
  });

  assert.equal(outgoing.tutor_config.education_level, 'professional');
  assert.equal(outgoing.tutor_config.methodology, 'direct');
  assert.deepEqual(outgoing.tutor_config.focus_areas, ['core_intuition', 'real_world_examples']);

  const mod = DEFAULT_INCOMING_LESSON.modules[0];
  const evalReq = buildEvaluateCheckpointPayload({
    sessionId: 'uuid-test-1234',
    module: mod,
    userResponse: 'The hiker will overshoot and diverge.',
    tutorConfig: outgoing.tutor_config,
  });
  assert.equal(evalReq.module_id, 'mod_1');
  assert.equal(evalReq.question_asked, mod.understanding_check.question_spoken);
  assert.deepEqual(evalReq.tutor_config.focus_areas, ['core_intuition', 'real_world_examples']);

  const chatReq = buildTutorChatPayload({
    sessionId: 'uuid-test-1234',
    module: mod,
    tutorConfig: outgoing.tutor_config,
    quickAction: 'explain_simpler',
    userMessage: 'Explain this simpler',
    chatHistory: [
      { role: 'assistant', content: 'Welcome!' },
      { role: 'user', content: 'How does learning rate work?' },
    ],
  });
  assert.equal(chatReq.quick_action, 'explain_simpler');
  assert.equal(chatReq.chat_history.length, 2);
  assert.deepEqual(chatReq.tutor_config.focus_areas, ['core_intuition', 'real_world_examples']);
});

test('validateIncomingLessonJson accepts valid DEFAULT_INCOMING_LESSON and rejects malformed payloads', () => {
  const validResult = validateIncomingLessonJson(JSON.stringify(DEFAULT_INCOMING_LESSON));
  assert.equal(validResult.valid, true);

  const invalidResult = validateIncomingLessonJson(JSON.stringify({ lesson_id: 'x', modules: [] }));
  assert.equal(invalidResult.valid, false);
});

test('evaluateUnderstandingResponse returns exact EvaluateCheckpointResponse schema', () => {
  const check = DEFAULT_INCOMING_LESSON.modules[0].understanding_check;
  const strongEval = evaluateUnderstandingResponse(
    'If the learning rate is way too high, the hiker will overshoot the valley and bounce around or diverge.',
    check
  );
  assert.equal(strongEval.passed, true);
  assert.ok(strongEval.concepts_matched.includes('overshoot'));
  assert.ok(strongEval.concepts_matched.includes('diverge'));
  assert.ok(strongEval.mastery_score >= 90);
  assert.ok(strongEval.spoken_feedback.length > 10);
  assert.ok(strongEval.written_summary.length > 10);
});

test('generateContextualTutorReply returns TutorChatResponse schema and extractTextFromSseChunk parses SSE events', () => {
  const mod = DEFAULT_INCOMING_LESSON.modules[0];
  const simpler = generateContextualTutorReply(
    'Explain this simpler',
    mod,
    DEFAULT_OUTGOING_REQUEST.tutor_config,
    'explain_simpler'
  );
  assert.ok(simpler.written_markdown.includes('thick fog'));
  assert.equal(simpler.highlight_key_point_index, 0);
  assert.ok(Array.isArray(simpler.suggested_follow_ups));

  const sse = extractTextFromSseChunk(
    'data: {"token": "Hello "}\n\ndata: {"token": "world!"}\n\ndata: [DONE]\n\n'
  );
  assert.equal(sse.tokens, 'Hello world!');
  assert.equal(sse.done, true);
});
