// src/app/lessons/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Protected from "@/components/Protected";
import Nav from "@/components/Nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Volume2, CheckCircle, ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/lib/auth-store";
import { apiClient, type LessonDetail } from "@/lib/api";

type Step =
  | { id: string; type: "intro" }
  | { id: string; type: "vocab"; front: string; back: string; audio?: string | null }
  | { id: string; type: "review" };

export default function LessonPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = Number(params.id as string);
  const { accessToken } = useAuth();

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // step state
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({}); // vocab reveal state
  const [updating, setUpdating] = useState(false);

  // ---- load lesson ----
  useEffect(() => {
    if (!accessToken || Number.isNaN(lessonId)) return;
    (async () => {
      try {
        const data = await apiClient.getLessonDetail(lessonId, accessToken);
        data.flashcards ||= [];
        data.questions ||= [];
        setLesson(data);

        // Build a simple, pedagogically sound step path:
        // Intro -> vocab (one per flashcard) -> Review
        const built: Step[] = [{ id: "intro", type: "intro" }];
        for (const fc of data.flashcards) {
          built.push({
            id: `v-${fc.id}`,
            type: "vocab",
            front: fc.front_text ?? "",
            back: fc.back_text ?? "",
            audio: fc.audio_url ?? null,
          });
        }
        built.push({ id: "review", type: "review" });
        setSteps(built);

        // init revealed map
        const initRev: Record<string, boolean> = {};
        built.forEach((s) => (initRev[s.id] = s.type === "intro")); // intro counts as revealed
        setRevealed(initRev);
      } catch (e) {
        console.error(e);
        setError("Failed to load lesson");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [lessonId, accessToken]);

  // ---- derived progress ----
  const totalSteps = steps.length || 1;
  const completed = useMemo(() => Object.values(revealed).filter(Boolean).length, [revealed]);
  const progressPct = Math.round((completed / totalSteps) * 100);

  // ---- persist progress (debounced per completion) ----
  const persistProgress = async (percent: number) => {
    if (!lesson || !accessToken) return;
    try {
      setUpdating(true);
      await apiClient.updateProgress({ lesson_id: lesson.id, percent }, accessToken);
    } catch (e) {
      console.error("Progress update failed:", e);
    } finally {
      setUpdating(false);
    }
  };

  // mark current step as done, advance, and persist
  const completeAndNext = async () => {
    const step = steps[currentIdx];
    if (!step) return;

    setRevealed((prev) => ({ ...prev, [step.id]: true }));

    // compute the *new* progress that includes this completion
    const newlyCompleted = Object.values({ ...revealed, [step.id]: true }).filter(Boolean).length;
    const nextPct = Math.round((newlyCompleted / totalSteps) * 100);
    persistProgress(nextPct).catch(() => {});

    // advance
    setTimeout(() => {
      setCurrentIdx((i) => Math.min(i + 1, totalSteps - 1));
    }, 300);
  };

  // play audio or fall back to TTS
  const playAudio = (url?: string | null, text?: string) => {
    if (!url && !text) return;
    if (url) {
      const audio = new Audio(url);
      audio.play().catch(() => {
        if (text) speak(text);
      });
      return;
    }
    if (text) speak(text);
  };

  const speak = (text: string) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      speechSynthesis.speak(u);
    } catch {
      // noop
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

  if (error || !lesson) {
    return (
      <Protected>
        <Nav />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="text-destructive mb-4">{error || "Lesson not found"}</p>
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

  const step = steps[currentIdx];

  return (
    <Protected>
      <Nav />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold">{lesson.title}</h1>
            <p className="text-sm text-muted-foreground">
              {lesson.word_count ? `${lesson.word_count} words • ` : ""}auto-tracked progress
            </p>
          </div>
          <Badge variant="outline" className="text-base px-3 py-1">
            {currentIdx + 1}/{totalSteps}
          </Badge>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span>Lesson progress</span>
            <span className="font-medium">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>

        {/* Step card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {step.type === "intro" && "Welcome"}
              {step.type === "vocab" && "Vocabulary"}
              {step.type === "review" && "Review & Next"}
            </CardTitle>
            <CardDescription>
              {step.type === "intro" && "Read the overview, then continue to learn each word."}
              {step.type === "vocab" && "Tap to reveal the translation. Audio available."}
              {step.type === "review" && "Great work! Take the quiz to reinforce what you learned."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {step.type === "intro" && (
              <div className="space-y-4">
                {lesson.body_md ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{lesson.body_md}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    This lesson introduces key words and simple examples. Continue to learn each word and then take a short quiz.
                  </p>
                )}
              </div>
            )}

            {step.type === "vocab" && (
              <div className="text-center space-y-6">
                <div className="text-5xl font-bold">{step.front}</div>

                <Button
                  variant="outline"
                  onClick={() => playAudio(step.audio, step.front)}
                  className="mx-auto flex items-center gap-2"
                >
                  <Volume2 className="h-4 w-4" />
                  Hear pronunciation
                </Button>

                {revealed[step.id] ? (
                  <div className="space-y-2">
                    <div className="text-3xl font-semibold text-green-600">{step.back}</div>
                    <div className="text-sm text-muted-foreground">Nice! Move to the next word when you’re ready.</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">What’s the Romanian translation?</div>
                    <Button onClick={() => setRevealed((r) => ({ ...r, [step.id]: true }))}>Show translation</Button>
                  </div>
                )}
              </div>
            )}

            {step.type === "review" && (
              <div className="text-center space-y-4">
                <div className="text-4xl">🎉</div>
                <p>Great job working through this lesson.</p>
                <div className="flex gap-3 justify-center">
                  <Button size="lg" onClick={() => router.push(`/quiz/${lesson.id}`)}>
                    Start Quiz
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => router.push("/dashboard")}>
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer nav */}
        {step.type !== "review" && (
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
            >
              Previous
            </Button>

            <div className="flex gap-2">
              {steps.map((s, i) => (
                <div
                  key={s.id}
                  className={`w-2.5 h-2.5 rounded-full ${
                    i === currentIdx ? "bg-primary" : revealed[s.id] ? "bg-green-600" : "bg-muted"
                  }`}
                />
              ))}
            </div>

            <Button
              onClick={completeAndNext}
              disabled={step.type === "vocab" && !revealed[step.id]} // must reveal before continuing
            >
              {revealed[step.id] ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Continue
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}

        {/* tiny status under nav */}
        <div className="mt-2 text-xs text-muted-foreground text-right">
          {updating ? "Saving progress…" : "Progress auto-saved"}
        </div>
      </main>
    </Protected>
  );
}
