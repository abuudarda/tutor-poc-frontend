export type EducationLevel =
  | 'elementary'
  | 'high_school'
  | 'undergraduate'
  | 'graduate'
  | 'professional';

export type SimplicityLevel = 1 | 2 | 3 | 4 | 5;

export type TeachingMethodology = 'socratic' | 'feynman' | 'direct';

export type FocusArea =
  | 'core_intuition'
  | 'real_world_examples'
  | 'exam_prep_edge_cases'
  | 'step_by_step_derivations'
  | string;

export type TutorPersona =
  | 'warm_encouraging'
  | 'crisp_academic'
  | 'casual_peer';

export type QuickActionType =
  | 'explain_simpler'
  | 'real_world_example'
  | 'test_me'
  | 'freeform';

export const DEFAULT_BACKEND_BASE_URL = 'https://tutor-poc-backend.vercel.app';

export interface SourceMaterialPayload {
  file_name: string;
  content_type: string;
  raw_text_extracted: string;
}

export interface TutorConfigPayload {
  education_level: EducationLevel;
  simplicity_level: SimplicityLevel;
  methodology: TeachingMethodology;
  focus_areas: string[];
  persona: TutorPersona;
}

// Endpoint A: POST /api/v1/parse-document Response
export interface ParseDocumentResponse {
  file_name: string;
  content_type: string;
  page_count: number;
  word_count: number;
  estimated_reading_time_minutes: number;
  raw_text_extracted: string;
}

// Endpoint B: POST /api/v1/generate-lesson Request
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

// Endpoint B: POST /api/v1/generate-lesson Response
export interface IncomingLessonResponse {
  lesson_id: string;
  chapter_title: string;
  estimated_duration_minutes: number;
  welcome_spoken_intro: string;
  modules: LessonModule[];
}

// Endpoint C: POST /api/v1/evaluate-checkpoint Request
export interface EvaluateCheckpointRequest {
  session_id: string;
  module_id: string;
  module_title: string;
  core_concept: string;
  question_asked: string;
  expected_concepts: string[];
  user_response: string;
  tutor_config: TutorConfigPayload;
}

// Endpoint C: POST /api/v1/evaluate-checkpoint Response
export interface EvaluateCheckpointResponse {
  passed: boolean;
  mastery_score: number;
  concepts_matched: string[];
  concepts_missed: string[];
  spoken_feedback: string;
  written_summary: string;
  follow_up_hint: string;
}

// Endpoint D & E: POST /api/v1/tutor-chat Request
export interface ChatHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ActiveModuleContextPayload {
  title: string;
  core_concept: string;
  key_points: string[];
}

export interface TutorChatRequest {
  session_id: string;
  active_module_id: string;
  active_module_context: ActiveModuleContextPayload;
  tutor_config: TutorConfigPayload;
  quick_action: QuickActionType;
  user_message: string;
  chat_history: ChatHistoryTurn[];
}

// Endpoint D: POST /api/v1/tutor-chat?stream=false Response
export interface TutorChatResponse {
  spoken_reply: string;
  written_markdown: string;
  highlight_key_point_index: number | null;
  suggested_follow_ups: string[];
}

export interface FileMetadataSummary {
  fileName: string;
  contentType: string;
  byteSize: number;
  formattedSize: string;
  pageCount: number;
  wordCount: number;
  estimatedReadingMinutes: number;
}

export type EndpointKey =
  | 'parse-document'
  | 'generate-lesson'
  | 'evaluate-checkpoint'
  | 'tutor-chat';

export interface ApiTrafficLogEntry {
  endpoint: EndpointKey;
  method: 'POST';
  url: string;
  timestamp: string;
  status: number | 'pending' | 'mock' | 'error';
  requestPayload: unknown;
  responsePayload: unknown;
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
  { value: 'graduate', label: 'Graduate / PhD' },
  { value: 'professional', label: 'Industry Professional' },
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
    value: 'direct',
    label: 'Direct & Structured',
    subtitle: 'Clear step-by-step breakdown with quick quizzes.',
  },
];

export const FOCUS_AREA_OPTIONS: {
  value: string;
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
    voiceRateMod: 1.0,
    voicePitchMod: 1.02,
  },
  {
    value: 'crisp_academic',
    label: 'Crisp & Academic',
    voiceRateMod: 1.03,
    voicePitchMod: 0.98,
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
  {
    id: 'rl_policy_gradients',
    label: 'Ch 12: Deep RL & Policy Gradients (6 Modules)',
    fileName: 'chapter_12_reinforcement_learning.pdf',
    contentType: 'application/pdf',
    rawText: `Chapter 12: Deep Reinforcement Learning, Markov Decision Processes & Policy Gradients

1. The Markov Decision Process (MDP) Tuple
Reinforcement Learning formalizes sequential decision-making through a Markov Decision Process defined by the tuple (S, A, P, R, gamma). At each discrete timestep t, the agent observes state s_t in S, selects action a_t in A according to policy pi(a|s), receives scalar reward r_t, and transitions to state s_{t+1} governed by environment dynamics P(s'|s, a).

2. Discounted Return & The Horizon Trade-off
The agent seeks to maximize expected cumulative discounted return G_t = sum_{k=0}^{infinity} gamma^k * r_{t+k+1}. The discount factor gamma in [0, 1) controls temporal myopia: gamma near 0 makes the agent greedy for immediate rewards, while gamma near 1 prioritizes long-term strategic outcomes.

3. Bellman Optimality & Value Iteration
The state-value function V^pi(s) and action-value function Q^pi(s, a) satisfy recursive Bellman equations. Instead of summing over infinite trajectories, Bellman decomposes value into immediate reward plus the discounted value of the successor state: Q(s, a) = r + gamma * max_{a'} Q(s', a').

4. Policy Gradient Theorem (REINFORCE)
Value-based methods struggle with continuous or high-dimensional action spaces. Policy Gradient methods parameterize pi_theta(a|s) directly and ascend the expected return gradient: grad_theta J(theta) = E[ grad_theta log pi_theta(a|s) * G_t ]. Actions that yield high return have their log-probability pushed up.

5. Variance Reduction via Advantage Baselines (Actor-Critic)
Raw Monte Carlo returns G_t exhibit high variance across episodes, destabilizing policy updates. Subtracting a state-dependent baseline V(s) yields the Advantage function A(s, a) = Q(s, a) - V(s), measuring how much better an action performed relative to the state average.

6. Clipped Surrogate Objective (Proximal Policy Optimization)
Large policy updates can collapse performance irreversibly if the new policy strays too far from the data-collection policy. PPO constrains the probability ratio r_t(theta) = pi_theta(a|s) / pi_{theta_old}(a|s) within [1 - epsilon, 1 + epsilon], guaranteeing monotonic trust-region improvement.`,
    lesson: {
      lesson_id: 'lesson-003',
      chapter_title: 'Deep Reinforcement Learning & Policy Gradient Methods',
      estimated_duration_minutes: 30,
      welcome_spoken_intro:
        'Welcome! Because this is a comprehensive six-section chapter on Deep Reinforcement Learning, we have broken it into 6 focused concept modules—from Markov Decision Processes all the way to PPO trust regions.',
      modules: [
        {
          module_id: 'mod_1',
          title: 'The Markov Decision Process (MDP) Loop',
          core_concept:
            'An MDP models sequential decision-making where future transitions depend only on the current state and chosen action.',
          spoken_narration:
            'Imagine training a puppy with treats. The puppy looks at its current situation—that is the State. It tries a behavior—that is the Action. If it sits politely, you hand over a treat—the Reward—and the room moves to a new State.',
          visual_analogy: {
            target_concept: 'State-Action-Reward Transition (S, A, P, R)',
            everyday_parallel:
              'Playing chess where only the current board arrangement matters for your next move, not the order of moves that got you there.',
          },
          key_points: [
            'Markov Property states that P(s_{t+1} | s_t, a_t) is independent of earlier history.',
            'Policy pi(a|s) maps states to probability distributions over actions.',
            'Environment dynamics P(s\'|s,a) govern state transitions.',
          ],
          understanding_check: {
            question_spoken:
              'In your own words, what does it mean for a state to satisfy the Markov property?',
            expected_concepts: ['current state', 'history', 'future', 'independent', 'memoryless'],
            hint: 'Think about whether knowing how chess pieces reached their current squares changes the legal moves available right now.',
          },
        },
        {
          module_id: 'mod_2',
          title: 'Discounted Return & Temporal Horizon (γ)',
          core_concept:
            'The discount factor gamma exponentially weighs near-term rewards more heavily than distant uncertain rewards.',
          spoken_narration:
            'Would you rather receive $100 today or $100 ten years from now? In reinforcement learning, the discount factor gamma acts like an impatience knob between 0 and 1.',
          visual_analogy: {
            target_concept: 'Discount Factor γ in Cumulative Return G_t',
            everyday_parallel:
              'Financial time-value of money—a dollar today is worth more than a promised dollar far in the future.',
          },
          key_points: [
            'G_t = r_{t+1} + γ r_{t+2} + γ^2 r_{t+3} + ... keeps infinite-horizon sums finite.',
            'γ = 0 creates a purely myopic agent that only cares about the next step.',
            'γ → 0.99 encourages long-term planning and delayed gratification.',
          ],
          understanding_check: {
            question_spoken:
              'How does an agent behave if we set the discount factor gamma to 0 versus 0.99?',
            expected_concepts: ['immediate', 'short-sighted', 'long-term', 'future', 'greedy'],
            hint: 'Consider how much weight future steps receive when multiplied by 0 versus 0.99.',
          },
        },
        {
          module_id: 'mod_3',
          title: 'Bellman Recursion & Dynamic Bootstrapping',
          core_concept:
            'Bellman equations decompose long-term value into immediate reward plus the discounted value of the next state.',
          spoken_narration:
            'Instead of driving every possible highway route from New York to Los Angeles from scratch, Bellman says: the fastest time from New York to LA is the drive time to Chicago plus our already-known best time from Chicago to LA.',
          visual_analogy: {
            target_concept: 'Bellman Expectation & Optimality Backup',
            everyday_parallel:
              'GPS navigation reusing precomputed travel times from intermediate cities instead of re-simulating the entire continent.',
          },
          key_points: [
            'Q(s, a) = r + γ max_{a\'} Q(s\', a\') enables one-step temporal difference updates.',
            'Bootstrapping updates an estimate using another estimate.',
            'Eliminates the need to wait until the end of an episode to learn.',
          ],
          understanding_check: {
            question_spoken:
              'Why does Bellman bootstrapping let an agent learn faster than waiting for the final outcome of an entire episode?',
            expected_concepts: ['immediate', 'next state', 'reuse', 'estimate', 'bootstrap'],
            hint: 'Think about updating your travel estimate as soon as you hit traffic in the first city.',
          },
        },
        {
          module_id: 'mod_4',
          title: 'Policy Gradients & Log-Probability Reinforcement',
          core_concept:
            'REINFORCE directly adjusts policy parameters to increase the log-probability of actions that produced high returns.',
          spoken_narration:
            'When a robot arm controls continuous joint torques, we cannot list every possible action in a Q-table. Instead, Policy Gradients nudge the neural network weights directly: if a trajectory scored well, make those actions more likely next time.',
          visual_analogy: {
            target_concept: 'Log-Derivative Trick (∇_θ log π_θ(a|s) · G_t)',
            everyday_parallel:
              'Practicing basketball free throws—repeating the muscle release angle that swished through the hoop.',
          },
          key_points: [
            'Handles continuous action spaces naturally without action maximization.',
            'Can learn stochastic policies needed in partially observable games.',
            'Gradient scales the log-likelihood of chosen action by episode return G_t.',
          ],
          understanding_check: {
            question_spoken:
              'Why are Policy Gradient methods preferred over Q-learning when controlling a robot with continuous motor torques?',
            expected_concepts: ['continuous', 'infinite actions', 'max', 'direct', 'stochastic'],
            hint: 'Think about how hard it is to compute max_a Q(s,a) when "a" is a real-valued vector.',
          },
        },
        {
          module_id: 'mod_5',
          title: 'Actor-Critic & Advantage Baselines',
          core_concept:
            'Subtracting the state value baseline V(s) isolates how much better an action was than expected, slashing gradient variance.',
          spoken_narration:
            'If every action in a lucky state gives a reward of +500, raw Policy Gradients push up even mediocre actions! By subtracting the average score V(s), the Advantage A(s,a) tells the Actor whether an action beat expectations.',
          visual_analogy: {
            target_concept: 'Advantage Function A(s, a) = Q(s, a) - V(s)',
            everyday_parallel:
              'Grading a student relative to the exam difficulty average rather than raw points on an easy test.',
          },
          key_points: [
            'Actor (policy π_θ) chooses actions; Critic (value V_φ) evaluates states.',
            'Subtracting V(s) leaves expected gradient unbiased while reducing variance.',
            'Positive advantage reinforces the action; negative advantage suppresses it.',
          ],
          understanding_check: {
            question_spoken:
              'How does subtracting the baseline V(s) prevent the policy from reinforcing a sub-optimal action in a high-reward state?',
            expected_concepts: ['average', 'baseline', 'variance', 'relative', 'advantage'],
            hint: 'Compare scoring +90 when the state average is +100 versus when the average is +50.',
          },
        },
        {
          module_id: 'mod_6',
          title: 'Proximal Policy Optimization (PPO Clipping)',
          core_concept:
            'PPO clips the policy probability ratio so no single gradient step can destructively alter the agent behavior.',
          spoken_narration:
            'In supervised learning, a bad gradient step can be fixed on the next batch because the dataset stays fixed. In RL, a bad policy step ruins the agent, which then collects terrible data! PPO puts guardrails around each update.',
          visual_analogy: {
            target_concept: 'Clipped Probability Ratio r_t(θ) ∈ [1 - ε, 1 + ε]',
            everyday_parallel:
              'A mountain climber clipping into safety carabiners every few feet so a slip cannot cause a free-fall.',
          },
          key_points: [
            'Probability ratio r_t(θ) = π_θ(a|s) / π_old(a|s) measures policy shift.',
            'Clipping within [1 - ε, 1 + ε] removes incentive for extreme weight jumps.',
            'Delivers Trust Region stability with simple first-order SGD.',
          ],
          understanding_check: {
            question_spoken:
              'Why is an overly large policy update much more dangerous in Reinforcement Learning than in standard supervised learning?',
            expected_concepts: ['data collection', 'collapse', 'ratio', 'clip', 'trust region'],
            hint: 'Remember that the RL policy itself collects the next batch of training experiences.',
          },
        },
      ],
    },
  },
];

// Strip trailing slashes from baseUrl so we never form `//api/v1/...`
export function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '');
}

// Normalize any legacy or user-supplied enum strings into strict FastAPI backend enum values
export function normalizeTutorConfig(config: {
  education_level: string;
  simplicity_level: number;
  methodology: string;
  focus_areas?: string[];
  persona: string;
}): TutorConfigPayload {
  const eduMap: Record<string, EducationLevel> = {
    elementary: 'elementary',
    high_school: 'high_school',
    undergraduate: 'undergraduate',
    graduate: 'graduate',
    graduate_phd: 'graduate',
    professional: 'professional',
    industry_professional: 'professional',
  };

  const methMap: Record<string, TeachingMethodology> = {
    socratic: 'socratic',
    feynman: 'feynman',
    direct: 'direct',
    direct_structured: 'direct',
  };

  const personaMap: Record<string, TutorPersona> = {
    warm_encouraging: 'warm_encouraging',
    crisp_academic: 'crisp_academic',
    casual_peer: 'casual_peer',
  };

  const clampedSimplicity = Math.max(
    1,
    Math.min(5, Math.round(Number(config.simplicity_level) || 2))
  ) as SimplicityLevel;

  const cleanFocus =
    Array.isArray(config.focus_areas) && config.focus_areas.filter(Boolean).length > 0
      ? config.focus_areas.filter(Boolean)
      : ['core_intuition'];

  return {
    education_level: eduMap[config.education_level] || 'undergraduate',
    simplicity_level: clampedSimplicity,
    methodology: methMap[config.methodology] || 'feynman',
    focus_areas: cleanFocus,
    persona: personaMap[config.persona] || 'warm_encouraging',
  };
}

export function estimateFileMetadata(
  fileName: string,
  contentType: string,
  rawText: string,
  options?: {
    explicitByteSize?: number;
    explicitPageCount?: number;
    explicitWordCount?: number;
    explicitReadingMinutes?: number;
  }
): FileMetadataSummary {
  const trimmed = rawText.trim();
  const computedWords = trimmed ? trimmed.split(/\s+/).length : 0;
  const wordCount =
    typeof options?.explicitWordCount === 'number' && options.explicitWordCount >= 0
      ? options.explicitWordCount
      : computedWords;

  const byteSize =
    typeof options?.explicitByteSize === 'number' && options.explicitByteSize > 0
      ? options.explicitByteSize
      : new TextEncoder().encode(rawText).length;

  let formattedSize = `${byteSize} B`;
  if (byteSize >= 1024 * 1024) {
    formattedSize = `${(byteSize / (1024 * 1024)).toFixed(2)} MB`;
  } else if (byteSize >= 1024) {
    formattedSize = `${(byteSize / 1024).toFixed(1)} KB`;
  }

  const pageCount =
    typeof options?.explicitPageCount === 'number' && options.explicitPageCount >= 1
      ? options.explicitPageCount
      : Math.max(1, Math.ceil(wordCount / 350));

  const estimatedReadingMinutes =
    typeof options?.explicitReadingMinutes === 'number' &&
    options.explicitReadingMinutes >= 1
      ? options.explicitReadingMinutes
      : wordCount === 0
      ? 0
      : Math.max(1, Math.ceil(wordCount / 180));

  return {
    fileName: fileName || 'study_notes.txt',
    contentType: contentType || 'text/plain',
    byteSize,
    formattedSize,
    pageCount,
    wordCount,
    estimatedReadingMinutes,
  };
}

export function buildOutgoingPayload(params: {
  sessionId: string;
  fileName: string;
  contentType: string;
  rawText: string;
  educationLevel: EducationLevel | string;
  simplicityLevel: SimplicityLevel | number;
  methodology: TeachingMethodology | string;
  focusAreas: string[];
  persona: TutorPersona | string;
}): OutgoingRequestPayload {
  const normalizedConfig = normalizeTutorConfig({
    education_level: params.educationLevel,
    simplicity_level: params.simplicityLevel,
    methodology: params.methodology,
    focus_areas: params.focusAreas,
    persona: params.persona,
  });

  return {
    session_id: params.sessionId.trim() || 'uuid-v4-string',
    source_material: {
      file_name: params.fileName.trim() || 'study_notes.txt',
      content_type: params.contentType.trim() || 'text/plain',
      raw_text_extracted: params.rawText,
    },
    tutor_config: normalizedConfig,
  };
}

export function buildEvaluateCheckpointPayload(params: {
  sessionId: string;
  module: LessonModule;
  userResponse: string;
  tutorConfig: TutorConfigPayload;
}): EvaluateCheckpointRequest {
  return {
    session_id: params.sessionId.trim() || 'uuid-v4-string',
    module_id: params.module.module_id,
    module_title: params.module.title,
    core_concept: params.module.core_concept,
    question_asked: params.module.understanding_check.question_spoken,
    expected_concepts:
      params.module.understanding_check.expected_concepts.length > 0
        ? params.module.understanding_check.expected_concepts
        : ['core_intuition'],
    user_response: params.userResponse.trim(),
    tutor_config: normalizeTutorConfig(params.tutorConfig),
  };
}

export function buildTutorChatPayload(params: {
  sessionId: string;
  module: LessonModule;
  tutorConfig: TutorConfigPayload;
  quickAction: QuickActionType;
  userMessage: string;
  chatHistory: ChatHistoryTurn[];
}): TutorChatRequest {
  // Strictly allow only "user" or "assistant" roles in chat_history
  const sanitizedHistory: ChatHistoryTurn[] = params.chatHistory
    .filter(
      (turn) =>
        (turn.role === 'user' || turn.role === 'assistant') &&
        typeof turn.content === 'string' &&
        turn.content.trim().length > 0
    )
    .map((turn) => ({
      role: turn.role === 'user' ? 'user' : 'assistant',
      content: turn.content,
    }));

  return {
    session_id: params.sessionId.trim() || 'uuid-v4-string',
    active_module_id: params.module.module_id,
    active_module_context: {
      title: params.module.title,
      core_concept: params.module.core_concept,
      key_points: params.module.key_points,
    },
    tutor_config: normalizeTutorConfig(params.tutorConfig),
    quick_action: params.quickAction,
    user_message: params.userMessage.trim(),
    chat_history: sanitizedHistory,
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
): EvaluateCheckpointResponse {
  const normalized = userAnswer.toLowerCase().trim();
  if (!normalized) {
    return {
      passed: false,
      mastery_score: 0,
      concepts_matched: [],
      concepts_missed: [...check.expected_concepts],
      spoken_feedback:
        'Please share a brief explanation via voice or text so we can lock in this concept.',
      written_summary: 'No explanation was provided yet.',
      follow_up_hint: check.hint,
    };
  }

  const matched: string[] = [];
  const missing: string[] = [];

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
  const passed = matched.length > 0 || wordCount >= 6;
  const rawScore =
    check.expected_concepts.length > 0
      ? Math.round((matched.length / check.expected_concepts.length) * 100)
      : 100;
  const masteryScore = passed
    ? Math.max(75, Math.min(100, rawScore + 50))
    : Math.max(25, rawScore);

  let spokenFeedback = '';
  let writtenSummary = '';
  if (matched.length >= 2) {
    spokenFeedback = `Spot on! You nailed the core intuition—specifically how ${matched.slice(0, 2).join(' and ')} govern the behavior here. Marking this module as Mastered!`;
    writtenSummary = `Strong conceptual mastery demonstrated (${masteryScore}%). You accurately connected ${matched.join(', ')} to the underlying mechanism.`;
  } else if (matched.length === 1) {
    spokenFeedback = `Great intuition mentioning "${matched[0]}"! You also want to keep in mind ${missing.slice(0, 2).join(' and ')}. Module mastered—let's keep that momentum going!`;
    writtenSummary = `Passed checkpoint (${masteryScore}%). Matched core idea "${matched[0]}", with room to incorporate ${missing.slice(0, 2).join(', ')}.`;
  } else if (passed) {
    spokenFeedback = `Good effort putting that in your own words! To sharpen the mental model even further, connect your explanation to ${check.expected_concepts.slice(0, 2).join(' and ')}. Module marked as Mastered!`;
    writtenSummary = `Thoughtful explanation in your own words (${masteryScore}%). Review the target terminology (${check.expected_concepts.slice(0, 2).join(', ')}) to solidify exam readiness.`;
  } else {
    spokenFeedback = `You're on the right track, but try expanding a bit more! Hint: ${check.hint}`;
    writtenSummary = `Explanation needs a bit more detail (${masteryScore}%). Try addressing how ${missing.slice(0, 2).join(' and ')} come into play.`;
  }

  return {
    passed,
    mastery_score: masteryScore,
    concepts_matched: matched,
    concepts_missed: missing,
    spoken_feedback: spokenFeedback,
    written_summary: writtenSummary,
    follow_up_hint: passed ? '' : check.hint,
  };
}

/**
 * Determines target module count dynamically based on word count and section headings:
 * - Short notes (< 300 words): 2 modules (or explicit heading count if >= 3)
 * - Medium section (300–900 words): 3–5 modules
 * - Long chapter (900+ words or >= 6 headings): 6–12 modules (one module per distinct sub-topic)
 */
export function determineDynamicModuleCount(rawText: string): number {
  const cleaned = (rawText || '').trim();
  if (!cleaned) return 1;

  const words = cleaned.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Detect explicit markdown or numbered headings
  const lines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const headingLines = lines.filter(
    (line, idx) =>
      idx > 0 &&
      line.length >= 4 &&
      line.length <= 100 &&
      (/^(#{1,4}\s+|\d+[\.\)]\s+|section\s+\d+|module\s+\d+|part\s+\d+|chapter\s+\d+)/i.test(
        line
      ) ||
        (/^[A-Z][A-Za-z0-9\s,&:-]+$/.test(line) && !line.endsWith('.')))
  );

  const headingCount = headingLines.length;

  if (headingCount >= 6) {
    return Math.min(12, headingCount);
  }

  if (wordCount < 300) {
    return headingCount >= 3 ? Math.min(5, headingCount) : 2;
  }

  if (wordCount < 900) {
    const byWords = Math.round(wordCount / 180);
    return Math.max(3, Math.min(5, Math.max(byWords, headingCount)));
  }

  // Long chapter (900+ words) -> 6 to 12 modules
  const byLongWords = Math.ceil(wordCount / 150);
  return Math.max(6, Math.min(12, Math.max(byLongWords, headingCount)));
}

/**
 * Segments raw study text into `targetCount` coherent topic clusters without any hardcoded 4-module cap.
 */
export function segmentStudyMaterialIntoModules(
  rawText: string
): { heading: string; body: string }[] {
  const cleaned = (rawText || '').trim();
  if (!cleaned) {
    return [{ heading: 'Core Concept Overview', body: 'Core domain principles and mechanisms.' }];
  }

  const targetCount = determineDynamicModuleCount(cleaned);

  // Split into paragraphs (excluding a standalone chapter title on line 0 if present)
  const rawParagraphs = cleaned
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const contentBlocks =
    rawParagraphs.length > 1 &&
    rawParagraphs[0].length < 95 &&
    !rawParagraphs[0].includes('. ')
      ? rawParagraphs.slice(1)
      : rawParagraphs;

  // If contentBlocks has at least targetCount paragraphs, group them evenly into targetCount clusters
  if (contentBlocks.length >= targetCount) {
    const clusters: { heading: string; body: string }[] = [];
    for (let i = 0; i < targetCount; i++) {
      const startIdx = Math.floor((i * contentBlocks.length) / targetCount);
      const endIdx = Math.floor(((i + 1) * contentBlocks.length) / targetCount);
      const slice = contentBlocks.slice(startIdx, Math.max(startIdx + 1, endIdx));
      const combined = slice.join('\n\n');
      const firstLine = slice[0].split(/\r?\n/)[0].replace(/^[#*\d\.\)\s-]+/, '').trim();
      const heading =
        firstLine.length >= 4 && firstLine.length <= 68
          ? firstLine.replace(/[.!?]+$/, '')
          : `Concept Cluster ${i + 1}`;
      clusters.push({ heading, body: combined });
    }
    return clusters;
  }

  // Otherwise, split by sentences so even a single dense block yields targetCount distinct modules
  const allSentences = contentBlocks
    .join(' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (allSentences.length >= targetCount) {
    const clusters: { heading: string; body: string }[] = [];
    for (let i = 0; i < targetCount; i++) {
      const startIdx = Math.floor((i * allSentences.length) / targetCount);
      const endIdx = Math.floor(((i + 1) * allSentences.length) / targetCount);
      const slice = allSentences.slice(startIdx, Math.max(startIdx + 1, endIdx));
      const body = slice.join(' ');
      const snippet = slice[0]
        .replace(/^[#*\d\.\)\s-]+/, '')
        .slice(0, 56)
        .replace(/[.!?]+$/, '')
        .trim();
      clusters.push({
        heading: snippet || `Core Principle ${i + 1}`,
        body,
      });
    }
    return clusters;
  }

  // Fallback for very brief 1-sentence input when targetCount === 2
  return [
    {
      heading: 'Foundational Mechanism & Intuition',
      body: cleaned,
    },
    {
      heading: 'Applied Implications & Edge Cases',
      body: `${cleaned} Understanding how this principle behaves under real-world boundary conditions.`,
    },
  ];
}

export function synthesizeAdaptiveLessonFromPayload(
  payload: OutgoingRequestPayload
): IncomingLessonResponse {
  const raw = payload.source_material.raw_text_extracted.trim();

  // Only return exact preset lessons if the raw text matches one of the presets
  for (const preset of PRESET_STUDY_MATERIALS) {
    if (raw === preset.rawText.trim()) {
      return adaptLessonToConfig(preset.lesson, payload.tutor_config);
    }
  }

  const firstLine = raw.split('\n')[0]?.replace(/^[#*-\s]+/, '').trim() || 'Custom Study Chapter';
  const chapterTitle =
    firstLine.length > 8 && firstLine.length < 90
      ? firstLine
      : `Interactive Mastery: ${payload.source_material.file_name.replace(/\.[^.]+$/, '')}`;

  const topicClusters = segmentStudyMaterialIntoModules(raw);

  const modules: LessonModule[] = topicClusters.map((cluster, idx) => {
    const sentences = cluster.body
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const titleSnippet = cluster.heading || `Core Principle ${idx + 1}`;
    const coreConcept =
      sentences[0] || 'Understanding the structural mechanism and underlying intuition.';

    const words = Array.from(
      new Set(
        cluster.body
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter(
            (w) =>
              w.length >= 6 &&
              !['chapter', 'because', 'however', 'through', 'between', 'section'].includes(w)
          )
      )
    ).slice(0, 4);

    return {
      module_id: `mod_${idx + 1}`,
      title: titleSnippet,
      core_concept: coreConcept,
      spoken_narration: `Let's unpack Module ${idx + 1}: ${titleSnippet}. ${sentences
        .slice(0, 2)
        .join(' ')} Notice how this mechanism builds our intuition step by step.`,
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
      lesson_id: `lesson-${payload.session_id.slice(0, 6)}`,
      chapter_title: chapterTitle,
      estimated_duration_minutes: Math.max(8, modules.length * 4),
      welcome_spoken_intro: `Welcome! I have structured "${chapterTitle}" into ${modules.length} interactive concept modules tailored for a ${payload.tutor_config.education_level.replace('_', ' ')} level.`,
      modules,
    },
    payload.tutor_config
  );
}

/**
 * Generates valid, standalone PDF 1.4 binary bytes from study text so preset PDFs
 * and synthesized chapters can also be rendered in the native browser PDF <iframe>.
 */
export function buildSynthesizedPdfBytes(title: string, rawText: string): Uint8Array {
  const escapePdfText = (str: string) =>
    str
      .replace(/[^\x20-\x7E]/g, ' ')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');

  const wrapLines = (text: string, maxChars = 78): string[] => {
    const out: string[] = [];
    for (const para of text.split(/\r?\n/)) {
      const trimmed = para.trim();
      if (!trimmed) {
        out.push('');
        continue;
      }
      const words = trimmed.split(/\s+/);
      let current = '';
      for (const w of words) {
        if ((current + ' ' + w).trim().length > maxChars) {
          if (current) out.push(current);
          current = w;
        } else {
          current = current ? `${current} ${w}` : w;
        }
      }
      if (current) out.push(current);
    }
    return out;
  };

  const allLines = [title, '', ...wrapLines(rawText)];
  const linesPerPage = 38;
  const pages: string[][] = [];
  for (let i = 0; i < allLines.length; i += linesPerPage) {
    pages.push(allLines.slice(i, i + linesPerPage));
  }
  if (pages.length === 0) pages.push([title]);

  const objects: string[] = [];
  // Obj 1: Catalog, Obj 2: Pages, Obj 3: Font
  const pageCount = pages.length;
  const firstPageObjId = 4;
  const pageObjIds: number[] = [];
  for (let p = 0; p < pageCount; p++) {
    pageObjIds.push(firstPageObjId + p * 2);
  }

  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`);
  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>\nendobj`
  );
  objects.push(
    `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`
  );

  for (let p = 0; p < pageCount; p++) {
    const pageObjId = firstPageObjId + p * 2;
    const contentObjId = pageObjId + 1;
    const lines = pages[p];
    const ops: string[] = ['BT', '/F1 11 Tf', '50 745 Td', '15 TL'];
    lines.forEach((line, idx) => {
      const escaped = escapePdfText(line);
      if (idx === 0) {
        ops.push(`(${escaped}) Tj`);
      } else {
        ops.push(`T* (${escaped}) Tj`);
      }
    });
    ops.push('ET');
    const streamBody = ops.join('\n');

    objects.push(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj`
    );
    objects.push(
      `${contentObjId} 0 obj\n<< /Length ${streamBody.length} >>\nstream\n${streamBody}\nendstream\nendobj`
    );
  }

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + '\n';
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const encoder = new TextEncoder();
  return encoder.encode(pdf);
}

export function adaptLessonToConfig(
  baseLesson: IncomingLessonResponse,
  config: TutorConfigPayload
): IncomingLessonResponse {
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
  config: TutorConfigPayload,
  quickAction: QuickActionType = 'freeform'
): TutorChatResponse {
  const lower = userPrompt.toLowerCase();

  if (quickAction === 'explain_simpler' || lower.includes('simpler') || lower.includes('eli5')) {
    const reply = `Let's strip away the math for **${activeModule.title}**: ${activeModule.visual_analogy.everyday_parallel} In short, ${activeModule.core_concept.toLowerCase()}`;
    return {
      spoken_reply: reply.replace(/\*\*/g, ''),
      written_markdown: reply,
      highlight_key_point_index: 0,
      suggested_follow_ups: [
        'Give me a real-world example of this',
        'What happens in an extreme edge case?',
        'Test me on this concept',
      ],
    };
  }

  if (
    quickAction === 'real_world_example' ||
    lower.includes('real-world') ||
    lower.includes('example') ||
    lower.includes('analogy')
  ) {
    const idx = activeModule.key_points.length > 1 ? 1 : 0;
    const reply = `Here is a concrete real-world parallel for **${activeModule.visual_analogy.target_concept}**: ${activeModule.visual_analogy.everyday_parallel} Notice how this directly mirrors point #${idx + 1}: *"${activeModule.key_points[idx]}"*.`;
    return {
      spoken_reply: reply.replace(/[*"]/g, ''),
      written_markdown: reply,
      highlight_key_point_index: idx,
      suggested_follow_ups: [
        'Why does this analogy break down at scale?',
        'Explain the formula step by step',
        'Quiz me on this module',
      ],
    };
  }

  if (
    quickAction === 'test_me' ||
    lower.includes('test me') ||
    lower.includes('quiz') ||
    lower.includes('check')
  ) {
    const idx = Math.max(0, activeModule.key_points.length - 1);
    const written = `**Ready for a quick concept check?**\n\n${activeModule.understanding_check.question_spoken}\n\n*(Hint if you need it: ${activeModule.understanding_check.hint})*`;
    return {
      spoken_reply: activeModule.understanding_check.question_spoken,
      written_markdown: written,
      highlight_key_point_index: idx,
      suggested_follow_ups: [
        'Give me a hint to get started',
        'Explain this simpler first',
        'How does this connect to the next module?',
      ],
    };
  }

  const methodologyNote =
    config.methodology === 'socratic'
      ? `Think about this first: based on "${activeModule.visual_analogy.target_concept}", what do you predict happens next?`
      : config.methodology === 'feynman'
      ? `Try echoing that back in one simple sentence without technical jargon!`
      : `Notice how this connects directly to: "${activeModule.key_points[0]}".`;

  const reply = `Great question on **${activeModule.title}**. ${activeModule.core_concept} ${methodologyNote}`;
  return {
    spoken_reply: reply.replace(/\*\*/g, ''),
    written_markdown: reply,
    highlight_key_point_index: 0,
    suggested_follow_ups: [
      `How does "${activeModule.visual_analogy.target_concept}" work in practice?`,
      'Give me a real-world example',
      'Test me on this',
    ],
  };
}

// Parse SSE data chunks cleanly from /api/v1/tutor-chat/stream
export function extractTextFromSseChunk(rawChunk: string): {
  tokens: string;
  done: boolean;
  structuredPayload?: Partial<TutorChatResponse>;
} {
  let tokens = '';
  let done = false;
  let structuredPayload: Partial<TutorChatResponse> | undefined;

  const lines = rawChunk.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('data:')) {
      const dataStr = trimmed.slice(5).trim();
      if (dataStr === '[DONE]') {
        done = true;
        continue;
      }
      try {
        const parsed = JSON.parse(dataStr);
        if (typeof parsed === 'string') {
          tokens += parsed;
        } else if (parsed && typeof parsed === 'object') {
          if (typeof parsed.token === 'string') tokens += parsed.token;
          else if (typeof parsed.delta === 'string') tokens += parsed.delta;
          else if (typeof parsed.content === 'string') tokens += parsed.content;
          else if (typeof parsed.text === 'string') tokens += parsed.text;
          else if (typeof parsed.written_markdown === 'string') {
            structuredPayload = parsed;
            if (!tokens) tokens += parsed.written_markdown;
          }
          if (parsed.done === true) done = true;
        }
      } catch {
        // Plain text data line
        tokens += dataStr;
      }
    }
  }

  return { tokens, done, structuredPayload };
}

export interface SpeechVoiceInput {
  voiceURI: string;
  name: string;
  lang: string;
  localService?: boolean;
}

export interface RankedVoiceOption extends SpeechVoiceInput {
  tier: 1 | 2 | 3 | 4;
  isHd: boolean;
  personaBonus: number;
  score: number;
  displayLabel: string;
}

export const FALLBACK_NEURAL_VOICE_PRESETS: SpeechVoiceInput[] = [
  {
    voiceURI: 'Microsoft Ava Online (Natural) - English (United States)',
    name: 'Microsoft Ava Online (Natural)',
    lang: 'en-US',
    localService: false,
  },
  {
    voiceURI: 'Microsoft Aria Online (Natural) - English (United States)',
    name: 'Microsoft Aria Online (Natural)',
    lang: 'en-US',
    localService: false,
  },
  {
    voiceURI: 'Microsoft Andrew Online (Natural) - English (United States)',
    name: 'Microsoft Andrew Online (Natural)',
    lang: 'en-US',
    localService: false,
  },
  {
    voiceURI: 'Google US English',
    name: 'Google US English',
    lang: 'en-US',
    localService: false,
  },
  {
    voiceURI: 'Google UK English Female',
    name: 'Google UK English Female',
    lang: 'en-GB',
    localService: false,
  },
  {
    voiceURI: 'Google UK English Male',
    name: 'Google UK English Male',
    lang: 'en-GB',
    localService: false,
  },
  {
    voiceURI: 'Samantha',
    name: 'Samantha',
    lang: 'en-US',
    localService: true,
  },
  {
    voiceURI: 'Daniel',
    name: 'Daniel',
    lang: 'en-GB',
    localService: true,
  },
];

/**
 * Ranks available English (`en-US`, `en-GB`, `en-*`) voices using the strict 4-tier
 * neural priority hierarchy and maps persona preferences within tiers so legacy
 * robotic voices (like Microsoft David / Microsoft Zira) are never chosen by default.
 */
export function rankEnglishVoicesForPersona(
  voices: SpeechVoiceInput[],
  persona: TutorPersona = 'warm_encouraging'
): RankedVoiceOption[] {
  const englishVoices = voices.filter((v) => {
    const langNorm = (v.lang || '').toLowerCase().replace('_', '-');
    return langNorm.startsWith('en-us') || langNorm.startsWith('en-gb') || langNorm.startsWith('en');
  });

  const sourceList =
    englishVoices.length > 0 ? englishVoices : FALLBACK_NEURAL_VOICE_PRESETS;

  const ranked = sourceList.map((v): RankedVoiceOption => {
    const nameLower = v.name.toLowerCase();
    const langNorm = (v.lang || 'en-US').replace('_', '-');

    // Strict 4-Tier Hierarchy:
    // 1. Voices containing "Natural" or "Online"
    // 2. Voices containing "Google"
    // 3. Apple premium voices (Samantha, Alex, Daniel, Ava)
    // 4. Any remaining local English voice as a last resort
    let tier: 1 | 2 | 3 | 4 = 4;
    if (nameLower.includes('natural') || nameLower.includes('online')) {
      tier = 1;
    } else if (nameLower.includes('google')) {
      tier = 2;
    } else if (
      nameLower.includes('samantha') ||
      nameLower.includes('alex') ||
      nameLower.includes('daniel') ||
      nameLower.includes('ava')
    ) {
      tier = 3;
    }

    // Badge "Natural" and "Google" voices as HD
    const isHd =
      nameLower.includes('natural') ||
      nameLower.includes('online') ||
      nameLower.includes('google');

    const tierBaseScore =
      tier === 1 ? 400 : tier === 2 ? 300 : tier === 3 ? 200 : 100;

    // Persona-specific voice affinity within each priority tier
    let personaBonus = 0;
    if (persona === 'warm_encouraging') {
      if (nameLower.includes('ava')) personaBonus += 35;
      else if (nameLower.includes('aria')) personaBonus += 30;
      else if (nameLower.includes('google us english')) personaBonus += 28;
      else if (nameLower.includes('samantha')) personaBonus += 22;
    } else if (persona === 'crisp_academic') {
      if (nameLower.includes('google uk english')) personaBonus += 36;
      else if (nameLower.includes('andrew')) personaBonus += 34;
      else if (nameLower.includes('daniel')) personaBonus += 30;
      if (langNorm.toLowerCase().includes('gb')) personaBonus += 12;
    } else if (persona === 'casual_peer') {
      if (nameLower.includes('aria')) personaBonus += 32;
      else if (nameLower.includes('ava')) personaBonus += 28;
      else if (nameLower.includes('google us english')) personaBonus += 26;
      else if (nameLower.includes('samantha') || nameLower.includes('alex')) {
        personaBonus += 22;
      }
    }

    // Deprioritize legacy robotic voices ("Microsoft David", "Microsoft Zira") inside Tier 4
    if (nameLower.includes('david') || nameLower.includes('zira')) {
      personaBonus -= 40;
    }

    const score = tierBaseScore + personaBonus;
    const cleanName = v.name.replace(/\s*-\s*English.*$/i, '').trim();
    const displayLabel = isHd
      ? `[HD] ${cleanName} (${langNorm})`
      : `${cleanName} (${langNorm})`;

    return {
      voiceURI: v.voiceURI || v.name,
      name: v.name,
      lang: langNorm,
      localService: v.localService,
      tier,
      isHd,
      personaBonus,
      score,
      displayLabel,
    };
  });

  // Deduplicate by voiceURI and sort descending by score
  const seen = new Set<string>();
  const deduped: RankedVoiceOption[] = [];
  for (const item of ranked.sort((a, b) => b.score - a.score)) {
    if (!seen.has(item.voiceURI)) {
      seen.add(item.voiceURI);
      deduped.push(item);
    }
  }

  return deduped;
}

export function getPersonaProsody(persona: TutorPersona): {
  rate: number;
  pitch: number;
} {
  if (persona === 'warm_encouraging') {
    return { rate: 1.0, pitch: 1.02 };
  }
  if (persona === 'crisp_academic') {
    return { rate: 1.03, pitch: 0.98 };
  }
  return { rate: 1.05, pitch: 1.0 };
}

/**
 * Splits spoken_narration or spoken_reply into individual sentences using
 * match(/[^.!?]+[.!?]+/g) (plus any trailing unpunctuated text) so Chrome's
 * cloud TTS voices never cut out at the ~15-second utterance limit.
 */
export function splitIntoSpeechSentences(rawText: string): string[] {
  const cleaned = rawText
    .replace(/[*#_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return [];

  const matchedSentences = cleaned.match(/[^.!?]+[.!?]+/g) || [];
  const consumedLength = matchedSentences.reduce((acc, s) => acc + s.length, 0);
  const remainder = cleaned.slice(consumedLength).trim();

  const chunks = matchedSentences.map((s) => s.trim()).filter(Boolean);
  if (remainder) {
    chunks.push(remainder);
  }

  return chunks.length > 0 ? chunks : [cleaned];
}

