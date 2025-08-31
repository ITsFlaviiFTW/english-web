// src/lib/quizPayload.ts
export type QType = "mcq" | "tf" | "fill" | "build";

export type McqPayload = { options: string[] };
export type TfPayload = Record<string, never>;
export type FillPayload = { blanks: number };
export type BuildPayload = { tokens: string[] };

export type UIQuestion =
  | { id: number; lesson_id?: number; prompt: string; qtype: "mcq"; payload: McqPayload }
  | { id: number; lesson_id?: number; prompt: string; qtype: "tf"; payload: TfPayload }
  | { id: number; lesson_id?: number; prompt: string; qtype: "fill"; payload: FillPayload }
  | { id: number; lesson_id?: number; prompt: string; qtype: "build"; payload: BuildPayload };

export type UISelected =
  | { type: "mcq"; index: number | null }
  | { type: "tf"; value: boolean | null }
  | { type: "fill"; text: string }
  | { type: "build"; tokens: string[] }; // IMPORTANT: send tokens

export type SubmitAnswer =
  | { question_id: number; selected: { index: number } }
  | { question_id: number; selected: { value: boolean } }
  | { question_id: number; selected: { text: string } }
  | { question_id: number; selected: { tokens: string[] } };

export type SubmitPayload = {
  lesson_id: number;
  answers: SubmitAnswer[];
};

export function buildSubmitPayload(
  lessonId: number,
  questions: UIQuestion[],
  selections: Record<number, UISelected | undefined> // keyed by question.id (1..N)
): SubmitPayload {
  const answers: SubmitAnswer[] = questions.map((q) => {
    const sel = selections[q.id];
    if (!sel) {
      // send empty shell; backend tolerates unanswered
      return { question_id: q.id, selected: { text: "" } };
    }
    if (q.qtype === "mcq" && sel.type === "mcq" && sel.index != null) {
      return { question_id: q.id, selected: { index: sel.index } };
    }
    if (q.qtype === "tf" && sel.type === "tf" && sel.value != null) {
      return { question_id: q.id, selected: { value: sel.value } };
    }
    if (q.qtype === "build" && sel.type === "build") {
      return { question_id: q.id, selected: { tokens: sel.tokens } };
    }
    // fill fallback
    const text = sel.type === "fill" ? sel.text : "";
    return { question_id: q.id, selected: { text } };
  });

  return { lesson_id: lessonId, answers };
}
