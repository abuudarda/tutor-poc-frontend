import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_INCOMING_LESSON,
  DEFAULT_OUTGOING_REQUEST,
  buildOutgoingPayload,
  estimateFileMetadata,
  evaluateUnderstandingResponse,
  generateContextualTutorReply,
  synthesizeAdaptiveLessonFromPayload,
  validateIncomingLessonJson,
} from './tutor-contracts';

test('estimateFileMetadata calculates word count, reading time, and formatted size', () => {
  const sampleText = Array.from({ length: 360 }, (_, i) => `word_${i}`).join(' ');
  const meta = estimateFileMetadata('lecture_notes.md', 'text/markdown', sampleText);
  assert.equal(meta.fileName, 'lecture_notes.md');
  assert.equal(meta.wordCount, 360);
  assert.equal(meta.estimatedReadingMinutes, 2);
  assert.ok(meta.byteSize > 1000);
});

test('buildOutgoingPayload constructs strict OutgoingRequestPayload schema', () => {
  const payload = buildOutgoingPayload({
    sessionId: 'uuid-test-1234',
    fileName: 'chapter_4_neural_networks.pdf',
    contentType: 'application/pdf',
    rawText: 'Gradient descent minimizes loss.',
    educationLevel: 'undergraduate',
    simplicityLevel: 2,
    methodology: 'feynman',
    focusAreas: ['core_intuition', 'real_world_examples'],
    persona: 'warm_encouraging',
  });

  assert.equal(payload.session_id, 'uuid-test-1234');
  assert.equal(payload.source_material.file_name, 'chapter_4_neural_networks.pdf');
  assert.equal(payload.tutor_config.education_level, 'undergraduate');
  assert.equal(payload.tutor_config.simplicity_level, 2);
  assert.equal(payload.tutor_config.methodology, 'feynman');
  assert.deepEqual(payload.tutor_config.focus_areas, ['core_intuition', 'real_world_examples']);
  assert.equal(payload.tutor_config.persona, 'warm_encouraging');
});

test('validateIncomingLessonJson accepts valid DEFAULT_INCOMING_LESSON and rejects malformed payloads', () => {
  const validResult = validateIncomingLessonJson(JSON.stringify(DEFAULT_INCOMING_LESSON));
  assert.equal(validResult.valid, true);
  if (validResult.valid) {
    assert.equal(validResult.data.lesson_id, 'lesson-001');
    assert.equal(validResult.data.modules[0].module_id, 'mod_1');
  }

  const invalidResult = validateIncomingLessonJson(JSON.stringify({ lesson_id: 'x', modules: [] }));
  assert.equal(invalidResult.valid, false);
});

test('evaluateUnderstandingResponse detects expected concepts and passes valid student explanations', () => {
  const check = DEFAULT_INCOMING_LESSON.modules[0].understanding_check;

  const emptyEval = evaluateUnderstandingResponse('   ', check);
  assert.equal(emptyEval.passed, false);
  assert.equal(emptyEval.scorePercent, 0);

  const strongEval = evaluateUnderstandingResponse(
    'If the learning rate is way too high, the hiker will overshoot the valley and bounce around or diverge.',
    check
  );
  assert.equal(strongEval.passed, true);
  assert.ok(strongEval.matchedConcepts.includes('overshoot'));
  assert.ok(strongEval.matchedConcepts.includes('diverge'));
  assert.ok(strongEval.scorePercent >= 90);
});

test('synthesizeAdaptiveLessonFromPayload preserves default schema and adapts custom material', () => {
  const defaultLesson = synthesizeAdaptiveLessonFromPayload(DEFAULT_OUTGOING_REQUEST);
  assert.equal(defaultLesson.lesson_id, 'lesson-001');
  assert.equal(defaultLesson.modules[0].title, 'The Loss Landscape & Blindfolded Hiking');

  const customPayload = buildOutgoingPayload({
    sessionId: 'custom-999',
    fileName: 'enzymes_catalysis.txt',
    contentType: 'text/plain',
    rawText:
      'Enzymes biological catalysts lower activation energy.\n\nSubstrates bind to the active site through induced fit geometry to accelerate chemical reactions.',
    educationLevel: 'high_school',
    simplicityLevel: 1,
    methodology: 'socratic',
    focusAreas: ['core_intuition'],
    persona: 'casual_peer',
  });
  const customLesson = synthesizeAdaptiveLessonFromPayload(customPayload);
  assert.ok(customLesson.modules.length >= 2);
  assert.ok(customLesson.modules[0].understanding_check.question_spoken.length > 10);
});

test('generateContextualTutorReply handles quick action prompts accurately', () => {
  const mod = DEFAULT_INCOMING_LESSON.modules[0];
  const simpler = generateContextualTutorReply(
    'Explain this simpler',
    mod,
    DEFAULT_OUTGOING_REQUEST.tutor_config
  );
  assert.ok(simpler.writtenReply.includes('thick fog'));
  assert.equal(simpler.highlightedPointIndex, 0);
});
