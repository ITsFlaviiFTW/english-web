// Normalizes UI selections to the API payload shape for both lesson and random/category.

export type McqPayload = { options: string[] };
export type BuildPayload = { tokens: string[] };

export type UISelected =
  | { type: "mcq"; index: number }
  | { type: "tf"; value: boolean | null }
  | { type: "fill"; text: string }
  | { type: "build"; tokens: string[] };

export type UIQuestion = {
  id: number;              // 1-based question id within the quiz page
  lesson_id?: number;      // present for random/category API
  item_index?: number;     // 1-based index within the source lesson (random/category API)
  prompt: string;
  qtype: "mcq" | "tf" | "fill" | "build";
  payload: McqPayload | BuildPayload | Record<string, unknown>;
};

type SelectedPayload =
  | { index: number }
  | { value: boolean }
  | { text: string }
  | { tokens: string[] };

// ---- LESSON builder ---------------------------------------------------------

export type LessonAttemptAnswer = {
  question_id: number;       // <-- required by /quiz/attempts/
  selected: SelectedPayload;
};

export type LessonAttemptPayload = {
  lesson_id: number;
  answers: LessonAttemptAnswer[];
};

export function buildLessonSubmitPayload(
  lessonId: number,
  questions: UIQuestion[],
  selections: Record<number, UISelected | undefined>
): LessonAttemptPayload {
  const answers: LessonAttemptAnswer[] = [];

  questions.forEach((q) => {
    const sel = selections[q.id];
    if (!sel) return;

    let selected: SelectedPayload | null = null;
    if (sel.type === "mcq" && sel.index != null) selected = { index: sel.index };
    else if (sel.type === "tf" && sel.value != null) selected = { value: sel.value };
    else if (sel.type === "fill") selected = { text: (sel.text || "").trim() };
    else if (sel.type === "build") selected = { tokens: (sel.tokens || []).filter(Boolean) };

    if (selected) answers.push({ question_id: q.id, selected });
  });

  return { lesson_id: lessonId, answers };
}

// ---- RANDOM/CATEGORY builder ------------------------------------------------

export type RandomAttemptAnswer = {
  qid: number;              // UI question id on the mixed quiz page
  lesson_id: number;        // actual source lesson
  item_index: number;       // 1-based item index within that lesson
  selected: SelectedPayload;
};

export type RandomAttemptPayload = {
  answers: RandomAttemptAnswer[];
};

export function buildRandomSubmitPayload(
  questions: UIQuestion[],
  selections: Record<number, UISelected | undefined>,
  fallbackLessonId = 0
): RandomAttemptPayload {
  const answers: RandomAttemptAnswer[] = [];

  questions.forEach((q, idx) => {
    const sel = selections[q.id];
    if (!sel) return;

    let selected: SelectedPayload | null = null;
    if (sel.type === "mcq" && sel.index != null) selected = { index: sel.index };
    else if (sel.type === "tf" && sel.value != null) selected = { value: sel.value };
    else if (sel.type === "fill") selected = { text: (sel.text || "").trim() };
    else if (sel.type === "build") selected = { tokens: (sel.tokens || []).filter(Boolean) };

    if (!selected) return;

    answers.push({
      qid: q.id,
      lesson_id: q.lesson_id ?? fallbackLessonId,
      item_index: q.item_index ?? (idx + 1),
      selected,
    });
  });

  return { answers };
}
