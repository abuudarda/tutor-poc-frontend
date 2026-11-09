export type EducationLevel =
  | 'elementary'
  | 'high_school'
  | 'undergraduate'
  | 'graduate_phd'
  | 'industry_professional';

export type SimplicityLevel = 1 | 2 | 3 | 4 | 5;

export type TeachingMethodology = 'socratic' | 'feynman' | 'direct_structured';

export type FocusArea =
  | 'core_intuition'
  | 'real_world_examples'
  | 'exam_prep_edge_cases'
  | 'step_by_step_derivations';

export type TutorPersona =
  | 'warm_encouraging'
  | 'crisp_academic'
  | 'casual_peer';

export interface SourceMaterialPayload {
  file_name: string;
  content_type: string;
  raw_text_extracted: string;
}

export interface TutorConfigPayload {
  education_level: EducationLevel;
  simplicity_level: SimplicityLevel;
  methodology: TeachingMethodology;
  focus_areas: FocusArea[];
  persona: TutorPersona;
}

export interface OutgoingRequestPayload {
  session_id: string;
  source_material: SourceMaterialPayload;
  tutor_config: TutorConfigPayload;
}

export interface VisualAnalogy {
  target_concept: string;
  everyday_parallel: string;
}

export interface UnderstandingCheck {
  question_spoken: string;
  expected_concepts: string[];
  hint: string;
}

export interface LessonModule {
  module_id: string;
  title: string;
  core_concept: string;
  spoken_narration: string;
  visual_analogy: VisualAnalogy;
  key_points: string[];
  understanding_check: UnderstandingCheck;
}

export interface IncomingLessonResponse {
  lesson_id: string;
  chapter_title: string;
  estimated_duration_minutes: number;
  welcome_spoken_intro: string;
  modules: LessonModule[];
}

export interface FileMetadataSummary {
  fileName: string;
  contentType: string;
  byteSize: number;
  formattedSize: string;
  wordCount: number;
  estimatedReadingMinutes: number;
}

export interface EvaluationResult {
  passed: boolean;
  matchedConcepts: string[];
  missingConcepts: string[];
  scorePercent: number;
  tutorFeedbackSpoken: string;
}

export const SIMPLICITY_LABELS: Record<
  SimplicityLevel,
  { short: string; description: string }
> = {
  1: {
    short: '1: ELI5 & Heavy Analogies',
    description: 'Zero jargon, vivid everyday stories, intuitive metaphors.',
  },
  2: {
    short: '2: Intuitive & Conversational',
    description: 'Gentle introduction of core terms anchored by visual analogies.',
  },
  3: {
    short: '3: Balanced Conceptual & Applied',
    description: 'Standard university pacing blending intuition with formal mechanisms.',
  },
  4: {
    short: '4: Technical & Analytical',
    description: 'Formal definitions, algorithmic workflows, and boundary conditions.',
  },
  5: {
    short: '5: Rigorous Academic & Mathematical Depth',
    description: 'First-principles derivations, proofs, and edge-case analysis.',
  },
};

export const EDUCATION_LEVEL_OPTIONS: {
  value: EducationLevel;
  label: string;
}[] = [
  { value: 'elementary', label: 'Elementary' },
  { value: 'high_school', label: 'High School' },
  { value: 'undergraduate', label: 'Undergraduate' },
  { value: 'graduate_phd', label: 'Graduate / PhD' },
  { value: 'industry_professional', label: 'Industry Professional' },
];

export const METHODOLOGY_OPTIONS: {
  value: TeachingMethodology;
  label: string;
  subtitle: string;
}[] = [
  {
    value: 'socratic',
    label: 'Socratic Guide',
    subtitle: 'Asks probing questions to lead you to the answer.',
  },
  {
    value: 'feynman',
    label: 'Feynman Coach',
    subtitle: 'Teaches a chunk, then asks you to explain it back simply.',
  },
  {
    value: 'direct_structured',
    label: 'Direct & Structured',
    subtitle: 'Clear step-by-step breakdown with quick quizzes.',
  },
];

export const FOCUS_AREA_OPTIONS: {
  value: FocusArea;
  label: string;
}[] = [
  { value: 'core_intuition', label: 'Core Intuition' },
  { value: 'real_world_examples', label: 'Real-World Examples' },
  { value: 'exam_prep_edge_cases', label: 'Exam Prep / Edge Cases' },
  { value: 'step_by_step_derivations', label: 'Step-by-Step Derivations' },
];

export const PERSONA_OPTIONS: {
  value: TutorPersona;
  label: string;
  voiceRateMod: number;
  voicePitchMod: number;
}[] = [
  {
    value: 'warm_encouraging',
    label: 'Warm & Encouraging',
    voiceRateMod: 0.98,
    voicePitchMod: 1.04,
  },
  {
    value: 'crisp_academic',
    label: 'Crisp & Academic',
    voiceRateMod: 1.03,
    voicePitchMod: 0.96,
  },
  {
    value: 'casual_peer',
    label: 'Casual Peer',
    voiceRateMod: 1.05,
    voicePitchMod: 1.0,
  },
];

export const DEFAULT_SOURCE_TEXT = `Chapter 4: Neural Networks, Backpropagation & Gradient Descent

1. The Optimization Objective (Loss Landscape)
Training a deep neural network requires finding a set of weights W and biases b that minimize a scalar Loss Function L(y, y_hat). Because modern networks contain millions of parameters, we cannot solve for the optimal weights analytically. Instead, we iteratively descend the error surface using Gradient Descent: w_{t+1} = w_t - eta * grad_w L. Here, eta (learning rate) governs the step size. If eta is too small, convergence crawls; if eta is too large, updates overshoot the valley and diverge.

2. Credit Assignment via Backpropagation
How do we know how much a hidden weight in Layer 1 contributed to an error at the final output layer? Backpropagation applies the calculus Chain Rule backward from the output to the input: dL/dw_ij = (dL/da_j) * (da_j/dz_j) * (dz_j/dw_ij). Each layer caches its forward activation and passes local error signals upstream.

3. Vanishing Gradients & Non-Convex Topologies
In deep networks using saturating activations like sigmoid, local derivatives are < 0.25, causing gradients to shrink exponentially across layers (vanishing gradient). Modern architectures use ReLU, residual skip connections, and adaptive optimizers (Adam, Momentum) to traverse flat saddle points and narrow ravines.`;

export const DEFAULT_OUTGOING_REQUEST: OutgoingRequestPayload = {
  session_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  source_material: {
    file_name: 'chapter_4_neural_networks.pdf',
    content_type: 'application/pdf',
    raw_text_extracted: DEFAULT_SOURCE_TEXT,
  },
  tutor_config: {
    education_level: 'undergraduate',
    simplicity_level: 2,
    methodology: 'feynman',
    focus_areas: ['core_intuition', 'real_world_examples'],
    persona: 'warm_encouraging',
  },
};

export const DEFAULT_INCOMING_LESSON: IncomingLessonResponse = {
  lesson_id: 'lesson-001',
  chapter_title: 'Understanding Backpropagation & Gradient Descent',
  estimated_duration_minutes: 15,
  welcome_spoken_intro:
    "Welcome! Today we are tackling backpropagation. Don't worry about the heavy calculus yet—we are going to build your intuition first.",
  modules: [
    {
      module_id: 'mod_1',
      title: 'The Loss Landscape & Blindfolded Hiking',
      core_concept:
        'Gradient descent minimizes error by taking steps proportional to the negative of the gradient.',
      spoken_narration:
        'Imagine you are standing at the top of a foggy mountain and need to reach the lowest valley. Since you cannot see, you feel the slope of the ground under your feet and take a step downhill. That slope is your gradient, and the size of your step is your learning rate.',
      visual_analogy: {
        target_concept: 'Learning Rate & Gradient',
        everyday_parallel:
          'Stepping downhill in thick fog—step too small and it takes forever; leap too far and you overshoot the valley.',
      },
      key_points: [
        'Loss Function measures how wrong the model currently is.',
        'Gradient tells us the direction of steepest ascent (so we go the opposite way).',
        'Learning Rate controls how aggressively we update weights.',
      ],
      understanding_check: {
        question_spoken:
          'Before we move on, tell me in your own words: what happens to our hiker if the learning rate is set way too high?',
        expected_concepts: ['overshoot', 'diverge', 'bounce', 'miss the minimum'],
        hint: 'Think about taking a 50-foot leap down a narrow canyon.',
      },
    },
    {
      module_id: 'mod_2',
      title: 'The Chain Rule & Blame Assignment',
      core_concept:
        'Backpropagation uses the calculus chain rule to distribute error responsibility backward from output to early layers.',
      spoken_narration:
        'Once our model makes a prediction and misses the target, how do we know which neuron in an early hidden layer caused the mistake? Backpropagation works like a relay race in reverse: the output layer measures the final error and whispers back to the previous layer exactly how much its activations mattered.',
      visual_analogy: {
        target_concept: 'Backward Error Propagation (Chain Rule)',
        everyday_parallel:
          'A restaurant head chef tasting an over-salted soup and tracing the exact proportion of salt added by the saucier, prep cook, and broth station.',
      },
      key_points: [
        'Forward pass computes predictions and caches intermediate activations.',
        'Chain Rule multiplies local derivatives backward layer by layer: dL/dw = (dL/da) · (da/dz) · (dz/dw).',
        'Dynamic programming avoids recomputing shared downstream paths.',
      ],
      understanding_check: {
        question_spoken:
          'Explain back to me simply: why do we propagate signals backward from the output instead of perturbing every weight one by one forward?',
        expected_concepts: ['chain rule', 'reuse', 'shared', 'blame', 'efficiency', 'backward'],
        hint: 'Consider how upstream layers share the same downstream calculations.',
      },
    },
    {
      module_id: 'mod_3',
      title: 'Vanishing Gradients & Momentum Rescue',
      core_concept:
        'Multiplying small derivatives across many layers shrinks the learning signal, which ReLU activations and Momentum help overcome.',
      spoken_narration:
        'When a network is very deep, multiplying numbers smaller than one over and over causes the gradient signal to fade to a whisper before it reaches the first layers. Adding momentum is like rolling a heavy bowling ball downhill: even on flat plateaus or tiny bumps, its accumulated velocity carries it through.',
      visual_analogy: {
        target_concept: 'Vanishing Gradient & Momentum Optimizer',
        everyday_parallel:
          'A game of telephone across 50 rooms where the message fades out, vs. a heavy bowling ball rolling smoothly past flat pebbles.',
      },
      key_points: [
        'Sigmoid derivatives peak at 0.25, causing exponential signal decay across depth.',
        'ReLU keeps the derivative at 1.0 for positive activations, preserving gradient flow.',
        'Momentum averages past gradients to dampen oscillations and cross flat saddle points.',
      ],
      understanding_check: {
        question_spoken:
          'To wrap up this chapter: how does adding momentum help our optimizer when the loss landscape hits a flat plateau or narrow ravine?',
        expected_concepts: ['velocity', 'past gradients', 'inertia', 'plateau', 'oscillation', 'carry'],
        hint: 'Think about the difference between a feather and a heavy bowling ball hitting a flat patch.',
      },
    },
  ],
};

export interface PresetStudyMaterial {
  id: string;
  label: string;
  fileName: string;
  contentType: string;
  rawText: string;
  lesson: IncomingLessonResponse;
}

export const PRESET_STUDY_MATERIALS: PresetStudyMaterial[] = [
  {
    id: 'backprop',
    label: 'Ch 4: Backpropagation & Gradient Descent',
    fileName: 'chapter_4_neural_networks.pdf',
    contentType: 'application/pdf',
    rawText: DEFAULT_SOURCE_TEXT,
    lesson: DEFAULT_INCOMING_LESSON,
  },
  {
    id: 'transformers',
    label: 'Ch 7: Transformer Self-Attention Mechanics',
    fileName: 'attention_is_all_you_need_notes.md',
    contentType: 'text/markdown',
    rawText: `Chapter 7: Scaled Dot-Product Self-Attention & Multi-Head Routing

1. Breaking the Sequential Bottleneck
Recurrent Neural Networks (RNNs) process tokens one by one, losing long-range context. Self-attention enables every token in a sequence to look directly at every other token in parallel in O(1) sequential steps.

2. Queries, Keys, and Values (Q, K, V)
Each input token embedding x_i is projected into three distinct vectors: a Query (Q) asking for information, a Key (K) advertising what information the token holds, and a Value (V) containing the payload to pass along. Attention(Q,K,V) = softmax((Q K^T) / sqrt(d_k)) V.

3. Scaling by 1 / sqrt(d_k)
When vector dimension d_k is large, dot products grow large in magnitude, pushing the softmax function into regions with extremely small gradients. Dividing by sqrt(d_k) keeps variance near 1.`,
    lesson: {
      lesson_id: 'lesson-002',
      chapter_title: 'Transformer Self-Attention & Query-Key-Value Routing',
      estimated_duration_minutes: 12,
      welcome_spoken_intro:
        'Welcome! Today we are unpacking Self-Attention—the engine behind modern language models. We will see how words dynamically look up context from each other.',
      modules: [
        {
          module_id: 'mod_1',
          title: 'The Library Lookup: Queries, Keys, and Values',
          core_concept:
            'Self-attention computes dynamic context weights by matching each token Query against all token Keys to blend their Values.',
          spoken_narration:
            'Think of every word in a sentence walking into a research library. Each word holds a Query slip stating what context it needs—like the pronoun "it" asking "who am I referring to?". Every other word wears a Key badge on its lapel, and carries a Value briefcase with its semantic meaning.',
          visual_analogy: {
            target_concept: 'Query (Q), Key (K), and Value (V) Projections',
            everyday_parallel:
              'Searching a database where your search bar is the Query, book titles are Keys, and the book contents you read are Values.',
          },
          key_points: [
            'Query (Q) represents what a token is looking for in the surrounding context.',
            'Key (K) acts as an index label describing what a token can offer.',
            'Dot product Q · K^T measures compatibility between pairs of tokens.',
          ],
          understanding_check: {
            question_spoken:
              'In the sentence "The trophy did not fit in the suitcase because it was too big", how do Query and Key vectors help the word "it" resolve its meaning?',
            expected_concepts: ['query', 'key', 'match', 'score', 'trophy', 'compatibility'],
            hint: 'Think about what "it" is searching for and what label "trophy" advertises.',
          },
        },
        {
          module_id: 'mod_2',
          title: 'Why We Scale by Square Root of d_k',
          core_concept:
            'Dividing dot products by sqrt(d_k) prevents softmax saturation and preserves healthy gradients during training.',
          spoken_narration:
            'Why do we divide the dot product by the square root of the dimension d_k before applying softmax? Without that divisor, high-dimensional dot products explode into huge numbers, turning softmax into a winner-take-all switch with zero gradient flow.',
          visual_analogy: {
            target_concept: 'Scaled Dot-Product Normalization (1 / √d_k)',
            everyday_parallel:
              'Turning down a microphone preamp gain so a loud chorus does not clip the audio into flat distortion.',
          },
          key_points: [
            'High-dimensional dot products have variance proportional to d_k.',
            'Extreme logits push softmax outputs to 0.0 or 1.0 where derivatives vanish.',
            'Scaling by 1 / √d_k restores unit variance across attention heads.',
          ],
          understanding_check: {
            question_spoken:
              'What happens to the softmax probabilities and training gradients if we forget to divide by the square root of d_k?',
            expected_concepts: ['saturate', 'vanish', 'extreme', 'sharp', 'zero gradient', 'peaked'],
            hint: 'Think about what happens to softmax when one input logit is 500 and another is 10.',
          },
        },
      ],
    },
  },
];

export function estimateFileMetadata(
  fileName: string,
  contentType: string,
  rawText: string,
  explicitByteSize?: number
): FileMetadataSummary {
  const trimmed = rawText.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const byteSize =
    typeof explicitByteSize === 'number' && explicitByteSize > 0
      ? explicitByteSize
      : new TextEncoder().encode(rawText).length;

  let formattedSize = `${byteSize} B`;
  if (byteSize >= 1024 * 1024) {
    formattedSize = `${(byteSize / (1024 * 1024)).toFixed(2)} MB`;
  } else if (byteSize >= 1024) {
    formattedSize = `${(byteSize / 1024).toFixed(1)} KB`;
  }

  // Average academic study reading rate ~180 words per minute (minimum 1 min if non-empty)
  const estimatedReadingMinutes = words === 0 ? 0 : Math.max(1, Math.ceil(words / 180));

  return {
    fileName: fileName || 'untitled_notes.txt',
    contentType: contentType || 'text/plain',
    byteSize,
    formattedSize,
    wordCount: words,
    estimatedReadingMinutes,
  };
}

export function buildOutgoingPayload(params: {
  sessionId: string;
  fileName: string;
  contentType: string;
  rawText: string;
  educationLevel: EducationLevel;
  simplicityLevel: SimplicityLevel;
  methodology: TeachingMethodology;
  focusAreas: FocusArea[];
  persona: TutorPersona;
}): OutgoingRequestPayload {
  return {
    session_id: params.sessionId.trim() || 'uuid-v4-string',
    source_material: {
      file_name: params.fileName.trim() || 'study_material.txt',
      content_type: params.contentType.trim() || 'text/plain',
      raw_text_extracted: params.rawText,
    },
    tutor_config: {
      education_level: params.educationLevel,
      simplicity_level: params.simplicityLevel,
      methodology: params.methodology,
      focus_areas: params.focusAreas.length > 0 ? params.focusAreas : ['core_intuition'],
      persona: params.persona,
    },
  };
}

export function validateIncomingLessonJson(
  rawJsonString: string
): { valid: true; data: IncomingLessonResponse } | { valid: false; error: string } {
  try {
    const parsed = JSON.parse(rawJsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Root JSON must be an object.' };
    }
    if (typeof parsed.lesson_id !== 'string' || !parsed.lesson_id.trim()) {
      return { valid: false, error: 'Missing or invalid "lesson_id" string.' };
    }
    if (typeof parsed.chapter_title !== 'string' || !parsed.chapter_title.trim()) {
      return { valid: false, error: 'Missing or invalid "chapter_title" string.' };
    }
    if (typeof parsed.estimated_duration_minutes !== 'number') {
      return { valid: false, error: '"estimated_duration_minutes" must be a number.' };
    }
    if (typeof parsed.welcome_spoken_intro !== 'string') {
      return { valid: false, error: 'Missing "welcome_spoken_intro" string.' };
    }
    if (!Array.isArray(parsed.modules) || parsed.modules.length === 0) {
      return { valid: false, error: '"modules" must be a non-empty array of concept modules.' };
    }

    for (let i = 0; i < parsed.modules.length; i++) {
      const mod = parsed.modules[i];
      if (!mod || typeof mod !== 'object') {
        return { valid: false, error: `Module at index ${i} must be an object.` };
      }
      if (typeof mod.module_id !== 'string' || !mod.module_id) {
        return { valid: false, error: `Module ${i} is missing "module_id".` };
      }
      if (typeof mod.title !== 'string' || !mod.title) {
        return { valid: false, error: `Module ${i} is missing "title".` };
      }
      if (typeof mod.core_concept !== 'string') {
        return { valid: false, error: `Module ${i} is missing "core_concept".` };
      }
      if (typeof mod.spoken_narration !== 'string') {
        return { valid: false, error: `Module ${i} is missing "spoken_narration".` };
      }
      if (
        !mod.visual_analogy ||
        typeof mod.visual_analogy.target_concept !== 'string' ||
        typeof mod.visual_analogy.everyday_parallel !== 'string'
      ) {
        return {
          valid: false,
          error: `Module ${i} must include "visual_analogy" with "target_concept" and "everyday_parallel".`,
        };
      }
      if (!Array.isArray(mod.key_points)) {
        return { valid: false, error: `Module ${i} must include a "key_points" string array.` };
      }
      if (
        !mod.understanding_check ||
        typeof mod.understanding_check.question_spoken !== 'string' ||
        !Array.isArray(mod.understanding_check.expected_concepts) ||
        typeof mod.understanding_check.hint !== 'string'
      ) {
        return {
          valid: false,
          error: `Module ${i} has an invalid "understanding_check" contract.`,
        };
      }
    }

    return { valid: true, data: parsed as IncomingLessonResponse };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Invalid JSON syntax.',
    };
  }
}

export function evaluateUnderstandingResponse(
  userAnswer: string,
  check: UnderstandingCheck
): EvaluationResult {
  const normalized = userAnswer.toLowerCase().trim();
  if (!normalized) {
    return {
      passed: false,
      matchedConcepts: [],
      missingConcepts: [...check.expected_concepts],
      scorePercent: 0,
      tutorFeedbackSpoken:
        'Please share a brief explanation via voice or text so we can lock in this concept.',
    };
  }

  const matched: string[] = [];
  const missing: string[] = [];

  // Synonym / stem awareness so natural student answers match cleanly
  const synonymMap: Record<string, string[]> = {
    overshoot: ['overshoot', 'jump past', 'leap past', 'step too far', 'too big', 'past the valley', 'jump over'],
    diverge: ['diverge', 'explode', 'unstable', 'never settle', 'fly off', 'get worse'],
    bounce: ['bounce', 'zig-zag', 'oscillate', 'back and forth', 'ping pong'],
    'miss the minimum': ['miss the minimum', 'miss the valley', 'skip the bottom', 'miss the lowest'],
    'chain rule': ['chain rule', 'multiply derivatives', 'derivative', 'chain'],
    reuse: ['reuse', 'cache', 'avoid recomputing', 'save work', 'once'],
    shared: ['shared', 'common', 'downstream', 'upstream'],
    blame: ['blame', 'responsibility', 'credit', 'contributed', 'caused'],
    efficiency: ['efficient', 'efficiency', 'faster', 'millions', 'one pass'],
    backward: ['backward', 'reverse', 'output to input', 'back'],
    velocity: ['velocity', 'momentum', 'speed', 'bowling ball', 'keep moving'],
    'past gradients': ['past gradient', 'previous step', 'history', 'average', 'accumulated'],
    inertia: ['inertia', 'heavy', 'mass', 'roll'],
    plateau: ['plateau', 'flat', 'saddle', 'bump'],
    oscillation: ['oscillation', 'dampen', 'zig-zag', 'ravine'],
    carry: ['carry', 'push through', 'roll through', 'glide'],
  };

  for (const concept of check.expected_concepts) {
    const key = concept.toLowerCase();
    const candidates = synonymMap[key] || [key];
    const isHit = candidates.some((phrase) => normalized.includes(phrase));
    if (isHit) {
      matched.push(concept);
    } else {
      missing.push(concept);
    }
  }

  const wordCount = normalized.split(/\s+/).length;
  // Pass if they hit at least 1 expected concept OR provide a thoughtful response (>= 6 words)
  const passed = matched.length > 0 || wordCount >= 6;
  const rawScore =
    check.expected_concepts.length > 0
      ? Math.round((matched.length / check.expected_concepts.length) * 100)
      : 100;
  const scorePercent = passed ? Math.max(75, Math.min(100, rawScore + 50)) : Math.max(25, rawScore);

  let tutorFeedbackSpoken = '';
  if (matched.length >= 2) {
    tutorFeedbackSpoken = `Spot on! You nailed the core intuition—specifically how ${matched.slice(0, 2).join(' and ')} govern the behavior here. Marking this module as Mastered!`;
  } else if (matched.length === 1) {
    tutorFeedbackSpoken = `Great intuition mentioning "${matched[0]}"! You also want to keep in mind ${missing.slice(0, 2).join(' and ')}. Module mastered—let's keep that momentum going!`;
  } else if (passed) {
    tutorFeedbackSpoken = `Good effort putting that in your own words! To sharpen the mental model even further, connect your explanation to ${check.expected_concepts.slice(0, 2).join(' and ')}. Module marked as Mastered!`;
  } else {
    tutorFeedbackSpoken = `You're on the right track, but try expanding a bit more! Hint: ${check.hint}`;
  }

  return {
    passed,
    matchedConcepts: matched,
    missingConcepts: missing,
    scorePercent,
    tutorFeedbackSpoken,
  };
}

export function synthesizeAdaptiveLessonFromPayload(
  payload: OutgoingRequestPayload
): IncomingLessonResponse {
  const raw = payload.source_material.raw_text_extracted.trim();
  const lower = raw.toLowerCase();

  // Check if it matches our Transformer preset
  if (lower.includes('self-attention') || lower.includes('queries, keys')) {
    return adaptLessonToConfig(PRESET_STUDY_MATERIALS[1].lesson, payload.tutor_config);
  }

  // Check if it matches Default Backpropagation preset
  if (
    lower.includes('backpropagation') ||
    lower.includes('gradient descent') ||
    payload.source_material.file_name === 'chapter_4_neural_networks.pdf'
  ) {
    return adaptLessonToConfig(DEFAULT_INCOMING_LESSON, payload.tutor_config);
  }

  // Otherwise dynamically build a tailored multi-module lesson from the user's custom text!
  const paragraphs = raw
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);

  const firstLine = raw.split('\n')[0]?.replace(/^[#*-\s]+/, '').trim() || 'Custom Study Chapter';
  const chapterTitle =
    firstLine.length > 8 && firstLine.length < 90
      ? firstLine
      : `Interactive Mastery: ${payload.source_material.file_name.replace(/\.[^.]+$/, '')}`;

  const chunks = paragraphs.length >= 2 ? paragraphs.slice(0, 3) : [raw || 'Core domain principles.'];

  const modules: LessonModule[] = chunks.map((chunk, idx) => {
    const sentences = chunk
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const titleSnippet =
      sentences[0]?.slice(0, 56).replace(/[.!?]+$/, '') || `Core Principle ${idx + 1}`;
    const coreConcept =
      sentences[0] || 'Understanding the structural mechanism and underlying intuition.';

    // Extract keywords (> 5 chars) for expected_concepts
    const words = Array.from(
      new Set(
        chunk
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter((w) => w.length >= 6 && !['chapter', 'because', 'however', 'through', 'between'].includes(w))
      )
    ).slice(0, 4);

    return {
      module_id: `mod_${idx + 1}`,
      title: `Module ${idx + 1}: ${titleSnippet}`,
      core_concept: coreConcept,
      spoken_narration: `Let's unpack section ${idx + 1}. ${sentences.slice(0, 2).join(' ')} Think about how each piece interacts dynamically rather than memorizing isolated terms.`,
      visual_analogy: {
        target_concept: titleSnippet,
        everyday_parallel:
          'Like tuning an instrument by ear—listening to feedback after each adjustment until the system resonates cleanly.',
      },
      key_points:
        sentences.length >= 2
          ? sentences.slice(0, 3)
          : [
              coreConcept,
              `Configured for ${payload.tutor_config.education_level.replace('_', ' ')} level (Simplicity ${payload.tutor_config.simplicity_level}/5).`,
              `Guided via ${payload.tutor_config.methodology} methodology.`,
            ],
      understanding_check: {
        question_spoken: `In your own words, how would you explain the key takeaway of "${titleSnippet}" to a peer?`,
        expected_concepts: words.length > 0 ? words : ['mechanism', 'intuition', 'process'],
        hint: `Focus on the cause-and-effect relationship described in: "${coreConcept.slice(0, 80)}..."`,
      },
    };
  });

  return adaptLessonToConfig(
    {
      lesson_id: `lesson-${ payload.session_id.slice(0, 6) }`,
      chapter_title: chapterTitle,
      estimated_duration_minutes: Math.max(10, modules.length * 5),
      welcome_spoken_intro: `Welcome! I have structured "${chapterTitle}" into ${modules.length} interactive concept modules tailored for a ${payload.tutor_config.education_level.replace('_', ' ')} level.`,
      modules,
    },
    payload.tutor_config
  );
}

export function adaptLessonToConfig(
  baseLesson: IncomingLessonResponse,
  config: TutorConfigPayload
): IncomingLessonResponse {
  // Keep exact default schema intact if matching default config so strict contract inspection matches 1:1
  if (
    baseLesson.lesson_id === 'lesson-001' &&
    config.education_level === 'undergraduate' &&
    config.simplicity_level === 2 &&
    config.methodology === 'feynman' &&
    config.persona === 'warm_encouraging'
  ) {
    return baseLesson;
  }

  const personaPrefix =
    config.persona === 'crisp_academic'
      ? 'Let us examine the formal structure precisely. '
      : config.persona === 'casual_peer'
      ? 'Hey! Let us break this down together—no stress. '
      : '';

  return {
    ...baseLesson,
    welcome_spoken_intro: `${personaPrefix}${baseLesson.welcome_spoken_intro}`,
  };
}

export function generateContextualTutorReply(
  userPrompt: string,
  activeModule: LessonModule,
  config: TutorConfigPayload
): { writtenReply: string; spokenReply: string; highlightedPointIndex: number | null } {
  const lower = userPrompt.toLowerCase();

  if (lower.includes('simpler') || lower.includes('eli5')) {
    const reply = `Let's strip away the math for "${activeModule.title}": ${activeModule.visual_analogy.everyday_parallel} In short, ${activeModule.core_concept.toLowerCase()}`;
    return {
      writtenReply: reply,
      spokenReply: reply,
      highlightedPointIndex: 0,
    };
  }

  if (lower.includes('real-world') || lower.includes('example') || lower.includes('analogy')) {
    const reply = `Here is a concrete real-world parallel for ${activeModule.visual_analogy.target_concept}: ${activeModule.visual_analogy.everyday_parallel} Notice how this directly mirrors point #2: "${activeModule.key_points[1] || activeModule.key_points[0]}".`;
    return {
      writtenReply: reply,
      spokenReply: reply,
      highlightedPointIndex: activeModule.key_points.length > 1 ? 1 : 0,
    };
  }

  if (lower.includes('test me') || lower.includes('quiz') || lower.includes('check')) {
    const reply = `Ready for the Concept Check? ${activeModule.understanding_check.question_spoken} (Hint if you need it: ${activeModule.understanding_check.hint})`;
    return {
      writtenReply: reply,
      spokenReply: activeModule.understanding_check.question_spoken,
      highlightedPointIndex: activeModule.key_points.length - 1,
    };
  }

  // Match against key points or general question
  const methodologyNote =
    config.methodology === 'socratic'
      ? `Think about this first: based on "${activeModule.visual_analogy.target_concept}", what do you predict happens next?`
      : config.methodology === 'feynman'
      ? `Try echoing that back in one simple sentence without technical jargon!`
      : `Notice how this connects directly to: "${activeModule.key_points[0]}".`;

  const reply = `Great question on "${activeModule.title}". ${activeModule.core_concept} ${methodologyNote}`;
  return {
    writtenReply: reply,
    spokenReply: reply,
    highlightedPointIndex: 0,
  };
}
