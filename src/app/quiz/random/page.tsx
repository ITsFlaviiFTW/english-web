"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Protected from "@/components/Protected";
import Nav from "@/components/Nav";
import { useAuth } from "@/lib/auth-store";
import { apiClient } from "@/lib/api"; // <-- only once
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, RotateCcw, Trophy, XCircle, Zap } from "lucide-react";
import {
  buildRandomSubmitPayload,
  type UIQuestion,
  type UISelected,
  type McqPayload,
  type BuildPayload,
} from "@/lib/quizPayload";

// local result types:
type ResultItem = ({ question_id: number } | { qid: number }) & { is_correct: boolean };
type RandomAttemptResult = { score_pct: number; xp_delta: number; results: ResultItem[] };


export default function RandomQuizPage() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [items, setItems] = useState<UIQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selections, setSelections] = useState<Record<number, UISelected | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<RandomAttemptResult | null>(null)
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      setIsLoading(true);
      setError("");
      try {
        const data = await apiClient.get(`/quiz/random/?size=10`, accessToken);
        const fetched: UIQuestion[] = (data?.items ?? []) as UIQuestion[];
        setItems(fetched);
        const init: Record<number, UISelected | undefined> = {};
        fetched.forEach((q) => (init[q.id] = undefined));
        setSelections(init);
      } catch {
        setError("Failed to load random quiz");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [accessToken]);

  const total = items.length;
  const progressPct = useMemo(() => {
    if (!total) return 0;
    return Math.round(((currentIdx + 1) / total) * 100);
  }, [currentIdx, total]);

  const current = items[currentIdx];

  const setAnswer = (qid: number, sel: UISelected) =>
    setSelections((prev) => ({ ...prev, [qid]: sel }));

  const canProceed = () => {
    if (!current) return false;
    const sel = selections[current.id];
    if (!sel) return false;
    if (current.qtype === "build") return sel.type === "build" && sel.tokens.length > 0;
    if (current.qtype === "mcq") return sel.type === "mcq" && sel.index != null;
    if (current.qtype === "tf") return sel.type === "tf" && sel.value != null;
    if (current.qtype === "fill") return sel.type === "fill";
    return false;
  };

const handleSubmit = async () => {
  if (!accessToken || !items.length) return;
  setIsSubmitting(true);
  setError("");
  try {
    const payload = buildRandomSubmitPayload(items, selections);
    const r = await apiClient.post("/quiz/random/attempts/", payload, accessToken);
    setResult(r as RandomAttemptResult);
    setShowResults(true);
  } catch {
    setError("Failed to submit quiz");
  } finally {
    setIsSubmitting(false);
  }
};




  if (isLoading) {
    return (
      <Protected>
        <Nav />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Protected>
    );
  }

  if (error || !current) {
    return (
      <Protected>
        <Nav />
        <div className="max-w-2xl mx-auto p-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-destructive mb-4">{error || "No quiz items available"}</p>
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

  if (showResults && result) {
    const correct = result.results.filter((r) => r.is_correct).length;
    return (
      <Protected>
        <Nav />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="mb-8 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
              <CardContent className="pt-6 text-center">
                <Trophy className="h-16 w-16 text-primary mx-auto mb-4" />
                <h2 className="text-3xl font-bold mb-2">Quiz Complete!</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{result.score_pct}%</div>
                    <div className="text-sm text-muted-foreground">Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold flex items-center justify-center gap-1">
                      <Zap className="h-5 w-5" />+{result.xp_delta}
                    </div>
                    <div className="text-sm text-muted-foreground">XP Gained</div>
                  </div>
                  <div className="text-center">
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
              <CardContent>
                <div className="space-y-4">
                  {items.map((q, i) => {
                    const r = result.results.find((x) => ("question_id" in x ? x.question_id : x.qid) === q.id);
                    const isCorrect = !!r?.is_correct;
                    return (
                      <div
                        key={q.id}
                        className={`p-4 rounded-lg border ${
                          isCorrect ? "bg-secondary/10 border-secondary/20" : "bg-destructive/10 border-destructive/20"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {isCorrect ? (
                            <CheckCircle className="h-5 w-5 text-secondary mt-0.5" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium mb-1">
                              Question {i + 1}: {q.prompt}
                            </p>
                            <Badge variant={isCorrect ? "default" : "destructive"}>
                              {isCorrect ? "Correct" : "Incorrect"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3 justify-center mt-6">
              <Button onClick={() => router.push("/dashboard")} className="gap-2">
                <Trophy className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  setShowResults(false);
                  setResult(null);
                  setCurrentIdx(0);
                  const init: Record<number, UISelected | undefined> = {};
                  items.forEach((q) => (init[q.id] = undefined));
                  setSelections(init);
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Retake
              </Button>
            </div>
          </div>
        </main>
      </Protected>
    );
  }

  return (
    <Protected>
      <Nav />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-bold">Random Quiz</h2>
          <Badge variant="outline">
            {currentIdx + 1} / {total}
          </Badge>
        </div>
        <div className="w-full bg-muted rounded-full h-2 mb-6">
          <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Question {currentIdx + 1}</CardTitle>
            <CardDescription>
              {current.qtype === "mcq" && "Choose the correct answer"}
              {current.qtype === "tf" && "Select true or false"}
              {current.qtype === "fill" && "Fill in the blank"}
              {current.qtype === "build" && "Tap the tiles to build the sentence"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderQuestion(current, selections[current.id], (sel) => setAnswer(current.id, sel))}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))} disabled={currentIdx === 0} variant="outline">
            Previous
          </Button>

          {currentIdx === total - 1 ? (
            <Button onClick={handleSubmit} disabled={!canProceed() || isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Quiz"}
            </Button>
          ) : (
            <Button onClick={() => setCurrentIdx((i) => i + 1)} disabled={!canProceed()}>
              Next
            </Button>
          )}
        </div>
      </main>
    </Protected>
  );
}

function renderQuestion(
  q: UIQuestion,
  sel: UISelected | undefined,
  update: (sel: UISelected) => void
) {
  if (q.qtype === "mcq") {
    const value = sel?.type === "mcq" && sel.index != null ? String(sel.index) : "";
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">{q.prompt}</h3>
        <RadioGroup value={value} onValueChange={(v) => update({ type: "mcq", index: parseInt(v, 10) })}>
          {(q.payload as McqPayload).options.map((opt, i) => (
            <div key={i} className="flex items-center space-x-2">
              <RadioGroupItem value={String(i)} id={`opt-${q.id}-${i}`} />
              <Label htmlFor={`opt-${q.id}-${i}`} className="cursor-pointer">
                {opt}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    );
  }

  if (q.qtype === "tf") {
    const value = sel?.type === "tf" && sel.value != null ? String(sel.value) : "";
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">{q.prompt}</h3>
        <RadioGroup value={value} onValueChange={(v) => update({ type: "tf", value: v === "true" })}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="true" id={`true-${q.id}`} />
            <Label htmlFor={`true-${q.id}`} className="cursor-pointer">
              True
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="false" id={`false-${q.id}`} />
            <Label htmlFor={`false-${q.id}`} className="cursor-pointer">
              False
            </Label>
          </div>
        </RadioGroup>
      </div>
    );
  }

  if (q.qtype === "build") {
    const tokens = sel?.type === "build" ? sel.tokens : [];
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">{q.prompt}</h3>
        <TokenBuilder
          tokens={(q.payload as BuildPayload).tokens}
          value={tokens}
          onChange={(toks) => update({ type: "build", tokens: toks })}
        />
      </div>
    );
  }

  const text = sel?.type === "fill" ? sel.text : "";
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{q.prompt}</h3>
      <Input placeholder="Type your answer here..." value={text} onChange={(e) => update({ type: "fill", text: e.target.value })} />
    </div>
  );
}

function TokenBuilder({
  tokens,
  value,
  onChange,
}: {
  tokens: string[];
  value: string[];
  onChange: (joined: string[]) => void;
}) {
  const selected = value;
  const remaining = tokens.reduce<string[]>((acc, t) => {
    const used = selected.filter((s) => s === t).length;
    const total = tokens.filter((x) => x === t).length;
    if (used < total) acc.push(t);
    return acc;
  }, []);

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
