import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_INCOMING_LESSON,
  DEFAULT_OUTGOING_REQUEST,
  buildOutgoingPayload,
  buildEvaluateCheckpointPayload,
  buildSynthesizedPdfBytes,
  buildTutorChatPayload,
  combineSpeechTranscripts,
  determineDynamicModuleCount,
  estimateFileMetadata,
  evaluateUnderstandingResponse,
  extractSpeechRecognitionChunks,
  extractTextFromSseChunk,
  generateContextualTutorReply,
  getMicPatienceSilenceMs,
  getPersonaProsody,
  normalizeBaseUrl,
  normalizeTutorConfig,
  rankEnglishVoicesForPersona,
  splitIntoSpeechSentences,
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

test('rankEnglishVoicesForPersona enforces 4-tier priority hierarchy and persona preferences', () => {
  const sampleVoices = [
    { voiceURI: 'ms-david', name: 'Microsoft David - English (United States)', lang: 'en-US' },
    { voiceURI: 'ms-zira', name: 'Microsoft Zira - English (United States)', lang: 'en-US' },
    { voiceURI: 'apple-samantha', name: 'Samantha', lang: 'en-US' },
    { voiceURI: 'google-us', name: 'Google US English', lang: 'en-US' },
    { voiceURI: 'google-uk-f', name: 'Google UK English Female', lang: 'en-GB' },
    { voiceURI: 'ms-andrew-nat', name: 'Microsoft Andrew Online (Natural)', lang: 'en-US' },
    { voiceURI: 'ms-ava-nat', name: 'Microsoft Ava Online (Natural)', lang: 'en-US' },
  ];

  const warmRanked = rankEnglishVoicesForPersona(sampleVoices, 'warm_encouraging');
  assert.equal(warmRanked[0].voiceURI, 'ms-ava-nat');
  assert.equal(warmRanked[0].tier, 1);
  assert.equal(warmRanked[0].isHd, true);
  const samanthaIdx = warmRanked.findIndex((v) => v.voiceURI === 'apple-samantha');
  const googleUsIdx = warmRanked.findIndex((v) => v.voiceURI === 'google-us');
  const davidIdx = warmRanked.findIndex((v) => v.voiceURI === 'ms-david');
  assert.ok(googleUsIdx < samanthaIdx);
  assert.ok(samanthaIdx < davidIdx);

  const academicRanked = rankEnglishVoicesForPersona(sampleVoices, 'crisp_academic');
  assert.equal(academicRanked[0].voiceURI, 'ms-andrew-nat');
  const ukIdx = academicRanked.findIndex((v) => v.voiceURI === 'google-uk-f');
  const usIdx = academicRanked.findIndex((v) => v.voiceURI === 'google-us');
  assert.ok(ukIdx < usIdx);

  assert.deepEqual(getPersonaProsody('warm_encouraging'), { rate: 1.0, pitch: 1.02 });
  assert.deepEqual(getPersonaProsody('crisp_academic'), { rate: 1.03, pitch: 0.98 });
  assert.deepEqual(getPersonaProsody('casual_peer'), { rate: 1.05, pitch: 1.0 });
});

test('splitIntoSpeechSentences splits multi-sentence text cleanly for sequential TTS queueing', () => {
  const paragraph =
    'Imagine you are lost on a mountainside in thick fog! How do you reach the valley? You feel the slope under your feet. Trailing fragment';
  const chunks = splitIntoSpeechSentences(paragraph);
  assert.equal(chunks.length, 4);
  assert.equal(chunks[0], 'Imagine you are lost on a mountainside in thick fog!');
  assert.equal(chunks[1], 'How do you reach the valley?');
  assert.equal(chunks[2], 'You feel the slope under your feet.');
  assert.equal(chunks[3], 'Trailing fragment');
});

test('determineDynamicModuleCount and synthesizeAdaptiveLessonFromPayload scale from 2 to 8+ modules dynamically', () => {
  const shortNotes =
    'Chapter 1: Thermodynamics Basics\n\nFirst law of thermodynamics states that energy is conserved across closed systems.\n\nSecond law states that entropy increases in isolated systems over time.';
  assert.equal(determineDynamicModuleCount(shortNotes), 2);
  const shortLesson = synthesizeAdaptiveLessonFromPayload({
    ...DEFAULT_OUTGOING_REQUEST,
    source_material: {
      file_name: 'short_notes.txt',
      content_type: 'text/plain',
      raw_text_extracted: shortNotes,
    },
  });
  assert.equal(shortLesson.modules.length, 2);

  const mediumWords = Array.from(
    { length: 4 },
    (_, i) =>
      `${i + 1}. Section Topic ${i + 1}\n` +
      Array.from({ length: 120 }, (__, w) => `concept_${i}_${w}`).join(' ') +
      '.'
  ).join('\n\n');
  const medCount = determineDynamicModuleCount(mediumWords);
  assert.ok(medCount >= 3 && medCount <= 5);

  const longChapter = [
    'Chapter 9: Distributed Systems Architecture',
    ...Array.from(
      { length: 7 },
      (_, i) =>
        `${i + 1}. Subsystem Topic ${i + 1}\n` +
        Array.from({ length: 150 }, (__, w) => `distributed_token_${i}_${w}`).join(' ') +
        '.'
    ),
  ].join('\n\n');
  const longCount = determineDynamicModuleCount(longChapter);
  assert.equal(longCount, 7);

  const longLesson = synthesizeAdaptiveLessonFromPayload({
    ...DEFAULT_OUTGOING_REQUEST,
    source_material: {
      file_name: 'distributed_systems.pdf',
      content_type: 'application/pdf',
      raw_text_extracted: longChapter,
    },
  });
  assert.equal(longLesson.modules.length, 7);
  const validated = validateIncomingLessonJson(JSON.stringify(longLesson));
  assert.equal(validated.valid, true);

  const pdfBytes = buildSynthesizedPdfBytes('Test Chapter', shortNotes);
  const header = new TextDecoder().decode(pdfBytes.slice(0, 8));
  assert.equal(header, '%PDF-1.4');
});

test('extractSpeechRecognitionChunks accumulates committedTranscript and interimTranscript across thinking pauses', () => {
  assert.equal(getMicPatienceSilenceMs('manual'), null);
  assert.equal(getMicPatienceSilenceMs('5s'), 5000);
  assert.equal(getMicPatienceSilenceMs('8s'), 8000);

  // First phrase finalized before a thinking pause
  const firstPass = extractSpeechRecognitionChunks(
    [{ isFinal: true, 0: { transcript: 'If the learning rate is too high,' } }],
    0,
    ''
  );
  assert.equal(firstPass.committedTranscript, 'If the learning rate is too high,');
  assert.equal(firstPass.interimTranscript, '');
  assert.equal(firstPass.combinedText, 'If the learning rate is too high,');

  // After a thinking pause and engine reconnect, user speaks an interim phrase
  const secondPass = extractSpeechRecognitionChunks(
    [{ isFinal: false, 0: { transcript: 'the hiker will overshoot the valley' } }],
    0,
    firstPass.committedTranscript
  );
  assert.equal(secondPass.committedTranscript, 'If the learning rate is too high,');
  assert.equal(secondPass.interimTranscript, 'the hiker will overshoot the valley');
  assert.equal(
    secondPass.combinedText,
    'If the learning rate is too high, the hiker will overshoot the valley'
  );

  // Second phrase finalizes and third interim phrase begins
  const thirdPass = extractSpeechRecognitionChunks(
    [
      { isFinal: true, 0: { transcript: 'the hiker will overshoot the valley' } },
      { isFinal: false, 0: { transcript: 'and diverge.' } },
    ],
    0,
    firstPass.committedTranscript
  );
  assert.equal(
    thirdPass.committedTranscript,
    'If the learning rate is too high, the hiker will overshoot the valley'
  );
  assert.equal(thirdPass.interimTranscript, 'and diverge.');
  assert.equal(
    combineSpeechTranscripts(thirdPass.committedTranscript, thirdPass.interimTranscript),
    'If the learning rate is too high, the hiker will overshoot the valley and diverge.'
  );
});

test('getYouTubeEmbedUrl converts watch, youtu.be, embed, and raw video IDs into clean embed URLs', async () => {
  const { getYouTubeEmbedUrl, DEFAULT_DEMO_YOUTUBE_URL } = await import('./tutor-contracts');
  assert.equal(
    getYouTubeEmbedUrl(DEFAULT_DEMO_YOUTUBE_URL),
    'https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1'
  );
  assert.equal(
    getYouTubeEmbedUrl('https://www.youtube.com/watch?v=M7lc1UVf-VE&t=42s'),
    'https://www.youtube.com/embed/M7lc1UVf-VE?rel=0&modestbranding=1'
  );
  assert.equal(
    getYouTubeEmbedUrl('https://youtu.be/M7lc1UVf-VE?si=abc123'),
    'https://www.youtube.com/embed/M7lc1UVf-VE?rel=0&modestbranding=1'
  );
  assert.equal(
    getYouTubeEmbedUrl('https://www.youtube.com/embed/M7lc1UVf-VE'),
    'https://www.youtube.com/embed/M7lc1UVf-VE?rel=0&modestbranding=1'
  );
  assert.equal(
    getYouTubeEmbedUrl('M7lc1UVf-VE'),
    'https://www.youtube.com/embed/M7lc1UVf-VE?rel=0&modestbranding=1'
  );
});



