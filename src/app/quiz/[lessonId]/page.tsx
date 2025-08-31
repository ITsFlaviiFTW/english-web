"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Protected from "@/components/Protected";
import Nav from "@/components/Nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/lib/auth-store";
import { apiClient, type LessonDetail, type QuizAttemptResult } from "@/lib/api";
import { ArrowLeft, CheckCircle, XCircle, Trophy, Zap } from "lucide-react";


type McqPayload = { options: string[] };
type TfPayload = Record<string, never>;
type FillPayload = { blanks: number };
type BuildPayload = { tokens: string[] };

type QuizItem =
  | { id: number; lesson_id?: number; prompt: string; qtype: "mcq"; payload: McqPayload }
  | { id: number; lesson_id?: number; prompt: string; qtype: "tf"; payload: TfPayload }
  | { id: number; lesson_id?: number; prompt: string; qtype: "fill"; payload: FillPayload }
  | { id: number; lesson_id?: number; prompt: string; qtype: "build"; payload: BuildPayload };

type LessonDetailUI = Omit<LessonDetail, "questions"> & { questions: QuizItem[] };

// Union type for selected answers
type UISelected =
  | { type: "mcq"; index: number }
  | { type: "tf"; value: boolean | null }
  | { type: "fill"; text: string }
  | { type: "build"; tokens: string[] };

type QuizAnswer = { question_id: number; selected: UISelected | null };

// --- type guards ---
const isMcq = (s: UISelected | undefined): s is Extract<UISelected, { type: "mcq" }> =>
  !!s && s.type === "mcq";

const isTf = (s: UISelected | undefined): s is Extract<UISelected, { type: "tf" }> =>
  !!s && s.type === "tf";

const isFill = (s: UISelected | undefined): s is Extract<UISelected, { type: "fill" }> =>
  !!s && s.type === "fill";

const isBuild = (s: UISelected | undefined): s is Extract<UISelected, { type: "build" }> =>
  !!s && s.type === "build";

export default function QuizPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = Number(params.lessonId as string);
  const { accessToken } = useAuth();

  const [lesson, setLesson] = useState<LessonDetailUI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizAttemptResult | null>(null);

  useEffect(() => {
    if (!accessToken || Number.isNaN(lessonId)) return;
    (async () => {
      try {
        const data = await apiClient.getLessonDetail(lessonId, accessToken);
        const ui: LessonDetailUI = { ...(data as LessonDetail), questions: (data.questions as unknown as QuizItem[]) };
        setLesson(ui);
        setAnswers(ui.questions.map((q) => ({ question_id: q.id, selected: null })));
      } catch {
        setError("Failed to load quiz");
      } finally {
        setLoading(false);
      }
    })();
  }, [lessonId, accessToken]);

  const setAnswer = (qid: number, selected: UISelected) => {
    setAnswers((prev) => prev.map((a) => (a.question_id === qid ? { ...a, selected } : a)));
  };

  const submit = async () => {
    if (!lesson || !accessToken) return;
    setSubmitting(true);
    try {
      const payload = {
        lesson_id: lesson.id,
        answers: answers.filter((a) => a.selected !== null),
      };
      const r = await apiClient.submitQuizAttempt(payload, accessToken);
      setResult(r);
    } catch {
      setError("Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Protected>
        <Nav />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Protected>
    );
  }

  if (error || !lesson) {
    return (
      <Protected>
        <Nav />
        <div className="max-w-2xl mx-auto p-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-destructive mb-4">{error || "Quiz not found"}</p>
              <Button onClick={() => router.back()} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </Protected>
    );
  }

  if (result) {
    const correct = result.results.filter((r) => r.is_correct).length;
    return (
      <Protected>
        <Nav />
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <CardContent className="pt-6 text-center">
              <Trophy className="h-16 w-16 text-primary mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-2">Quiz Complete!</h2>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <div className="text-2xl font-bold">{result.score_pct}%</div>
                  <div className="text-sm text-muted-foreground">Score</div>
                </div>
                <div>
                  <div className="text-2xl font-bold flex items-center justify-center gap-1">
                    <Zap className="h-5 w-5" />+{result.xp_delta}
                  </div>
                  <div className="text-sm text-muted-foreground">XP</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {correct}/{result.results.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Correct</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Question Results</CardTitle>
              <CardDescription>Review your answers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {lesson.questions.map((q, idx) => {
                const r = result.results.find((x) => x.question_id === q.id);
                const ok = !!r?.is_correct;
                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-lg border ${
                      ok ? "bg-secondary/10 border-secondary/20" : "bg-destructive/10 border-destructive/20"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {ok ? (
                        <CheckCircle className="h-5 w-5 text-secondary mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">
                          Question {idx + 1}: {q.prompt}
                        </div>
                        <Badge variant={ok ? "default" : "destructive"}>{ok ? "Correct" : "Incorrect"}</Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => router.push(`/lessons/${lesson.id}`)}>
              <ArrowLeft className="h-4 w-4" />
              Back to Lesson
            </Button>
            <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
          </div>
        </div>
      </Protected>
    );
  }

  const q = lesson.questions[current];
  const pct = Math.round(((current + 1) / lesson.questions.length) * 100);
  const sel = answers.find((a) => a.question_id === q.id)?.selected ?? undefined;

  const canProceed = !!sel && (q.qtype === "build" ? (isBuild(sel) && sel.tokens.length > 0) : true);

  return (
    <Protected>
      <Nav />
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => router.push(`/lessons/${lesson.id}`)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Lesson
          </Button>
          <Badge variant="outline">
            {current + 1} / {lesson.questions.length}
          </Badge>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Question {current + 1}</CardTitle>
            <CardDescription>
              {q.qtype === "mcq" && "Choose the correct answer"}
              {q.qtype === "tf" && "Select true or false"}
              {q.qtype === "fill" && "Fill in the blank"}
              {q.qtype === "build" && "Tap the tiles to build the sentence"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-lg font-medium">{q.prompt}</div>

            {q.qtype === "mcq" && (
              <RadioGroup
                value={isMcq(sel) && sel.index != null ? String(sel.index) : ""}
                onValueChange={(v) => setAnswer(q.id, { type: "mcq", index: Number(v) })}
              >
                {(q.payload as McqPayload).options?.map((opt, i) => (
                  <label key={i} className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value={String(i)} />
                    <span>{opt}</span>
                  </label>
                ))}
              </RadioGroup>
            )}

            {q.qtype === "tf" && (
              <RadioGroup
                value={isTf(sel) && sel.value != null ? String(sel.value) : ""}
                onValueChange={(v) => setAnswer(q.id, { type: "tf", value: v === "true" })}
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="true" />
                  <span>True</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="false" />
                  <span>False</span>
                </label>
              </RadioGroup>
            )}

            {q.qtype === "build" && (
              <TokenBuilder
                tokens={(q.payload as BuildPayload).tokens}
                value={isBuild(sel) ? sel.tokens : []}
                onChange={(tokens) => setAnswer(q.id, { type: "build", tokens })}
              />
            )}

            {q.qtype === "fill" && (
              <Input
                placeholder="Type your answer…"
                value={isFill(sel) ? sel.text : ""}
                onChange={(e) => setAnswer(q.id, { type: "fill", text: e.target.value })}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button variant="outline" disabled={current === 0} onClick={() => setCurrent((v) => Math.max(0, v - 1))}>
            Previous
          </Button>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">{pct}%</div>
            {current === lesson.questions.length - 1 ? (
              <Button disabled={!canProceed || submitting} onClick={submit}>
                {submitting ? "Submitting..." : "Submit Quiz"}
              </Button>
            ) : (
              <Button disabled={!canProceed} onClick={() => setCurrent((v) => v + 1)}>
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </Protected>
  );
}

function TokenBuilder({
  tokens,
  value,
  onChange,
}: {
  tokens: string[];
  value: string[]; // use array, not string
  onChange: (joined: string[]) => void;
}) {
  const selected = value;
  const remaining = tokens.filter(
    (t) => selected.filter((s) => s === t).length < tokens.filter((x) => x === t).length,
  );

  const add = (t: string) => onChange([...selected, t]);
  const removeAt = (i: number) => {
    const next = selected.slice();
    next.splice(i, 1);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {remaining.map((t, i) => (
          <button
            key={`rem-${i}-${t}`}
            type="button"
            className="px-3 py-2 rounded-md border hover:bg-muted"
            onClick={() => add(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="min-h-12 p-3 rounded-md border bg-muted/30">
        {selected.length === 0 ? (
          <span className="text-muted-foreground text-sm">Tap tiles above to build your answer…</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selected.map((t, i) => (
              <button
                key={`sel-${i}-${t}`}
                type="button"
                className="px-3 py-2 rounded-md border bg-background hover:bg-destructive/10"
                onClick={() => removeAt(i)}
                title="Remove token"
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
