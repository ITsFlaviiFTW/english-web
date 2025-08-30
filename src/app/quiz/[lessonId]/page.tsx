"use client";

import { useEffect, useState, useMemo } from "react";
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

type QuestionAnswer = { index?: number; value?: boolean; text?: string };
type QuizAnswer = { question_id: number; selected: QuestionAnswer | null };

export default function QuizPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = Number(params.lessonId as string);
  const { accessToken } = useAuth();

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
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
        setLesson(data);
        setAnswers(data.questions.map(q => ({ question_id: q.id, selected: null })));
      } catch (e) {
        setError("Failed to load quiz");
      } finally {
        setLoading(false);
      }
    })();
  }, [lessonId, accessToken]);

  const setAnswer = (qid: number, selected: QuestionAnswer) => {
    setAnswers(prev => prev.map(a => (a.question_id === qid ? { ...a, selected } : a)));
  };

  const currentAnswer = useMemo(() => {
    if (!lesson) return null;
    const qid = lesson.questions[current].id;
    return answers.find(a => a.question_id === qid)?.selected ?? null;
  }, [answers, lesson, current]);

  const canProceed = !!currentAnswer;

  const submit = async () => {
    if (!lesson || !accessToken) return;
    setSubmitting(true);
    try {
      const payload = {
        lesson_id: lesson.id,
        answers: answers.filter(a => a.selected !== null),
      };
      const r = await apiClient.submitQuizAttempt(payload, accessToken);
      setResult(r);
    } catch (e) {
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
    const correct = result.results.filter(r => r.is_correct).length;
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
                const r = result.results.find(x => x.question_id === q.id);
                const ok = !!r?.is_correct;
                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-lg border ${ok ? "bg-secondary/10 border-secondary/20" : "bg-destructive/10 border-destructive/20"}`}
                  >
                    <div className="flex items-start gap-2">
                      {ok ? <CheckCircle className="h-5 w-5 text-secondary mt-0.5" /> : <XCircle className="h-5 w-5 text-destructive mt-0.5" />}
                      <div className="flex-1">
                        <div className="font-medium">Question {idx + 1}: {q.prompt}</div>
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

  return (
    <Protected>
      <Nav />
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => router.push(`/lessons/${lesson.id}`)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Lesson
          </Button>
          <Badge variant="outline">{current + 1} / {lesson.questions.length}</Badge>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Question {current + 1}</CardTitle>
            <CardDescription>
              {q.qtype === "mcq" && "Choose the correct answer"}
              {q.qtype === "tf" && "Select true or false"}
              {q.qtype === "fill" && "Fill in the blank"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {q.qtype === "mcq" && (
              <RadioGroup
                value={currentAnswer?.index?.toString() || ""}
                onValueChange={(v) => setAnswer(q.id, { index: Number(v) })}
              >
                {q.payload.options?.map((opt, i) => (
                  <label key={i} className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value={String(i)} />
                    <span>{opt}</span>
                  </label>
                ))}
              </RadioGroup>
            )}

            {q.qtype === "tf" && (
              <RadioGroup
                value={currentAnswer?.value?.toString() || ""}
                onValueChange={(v) => setAnswer(q.id, { value: v === "true" })}
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

            {q.qtype === "fill" && (
              <div className="space-y-2">
                <Input
                  placeholder="Type your answer…"
                  value={currentAnswer?.text || ""}
                  onChange={(e) => setAnswer(q.id, { text: e.target.value })}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button variant="outline" disabled={current === 0} onClick={() => setCurrent(v => Math.max(0, v - 1))}>
            Previous
          </Button>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">{pct}%</div>
            {current === lesson.questions.length - 1 ? (
              <Button disabled={!canProceed || submitting} onClick={submit}>
                {submitting ? "Submitting..." : "Submit Quiz"}
              </Button>
            ) : (
              <Button disabled={!canProceed} onClick={() => setCurrent(v => v + 1)}>
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </Protected>
  );
}
