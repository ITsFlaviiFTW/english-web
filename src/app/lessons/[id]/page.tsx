"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Protected from "@/components/Protected";
import Nav from "@/components/Nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Volume2 } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { apiClient, type LessonDetail } from "@/lib/api";

/* ───────────────────────────── Types (content v2) ───────────────────────────── */

type OverviewSection = {
  type: "overview";
  id: string;
  body_md?: string;
  narration_ro?: string;
  narration_en?: string;
};

type TeachItem = {
  front: string;
  back: string;
  audio_en?: string | null;
  ipa?: string;
  tip?: string;
};

type TeachSection = {
  type: "teach";
  id: string;
  narration_ro?: string;
  items: TeachItem[];
};

type GrammarSection = {
  type: "grammar";
  id: string;
  points: string[];
  mini_examples?: { en: string; ro: string; audio_en?: string | null }[];
  narration_ro?: string;
};

type PatternSection = {
  type: "patterns";
  id: string;
  examples: { en: string; ro: string; audio_en?: string | null }[];
  narration_ro?: string;
};

type BuildTask = { tokens: string[]; answer: string };
type BuildSection = {
  type: "build";
  id: string;
  tasks: BuildTask[];
  narration_ro?: string;
};

type ListenTask = { audio_en?: string | null; prompt_ro?: string; options: string[]; correct_index: number };
type ListenSection = {
  type: "listen";
  id: string;
  tasks: ListenTask[];
  narration_ro?: string;
};

type DictationTask = { audio_en?: string | null; answer: string };
type DictationSection = {
  type: "dictation";
  id: string;
  tasks: DictationTask[];
  narration_ro?: string;
};

type ReviewSection = { type: "review"; id: string; narration_ro?: string };

type Section =
  | OverviewSection
  | TeachSection
  | GrammarSection
  | PatternSection
  | BuildSection
  | ListenSection
  | DictationSection
  | ReviewSection;

/* A "page" is a flattened renderable unit derived from sections */
type Page =
  | { kind: "overview"; id: string; sectionId: string; body_md?: string; narration_ro?: string; narration_en?: string }
  | { kind: "teach"; id: string; sectionId: string; item: TeachItem; narration_ro?: string }
  | { kind: "grammar"; id: string; sectionId: string; points: string[]; narration_ro?: string }
  | { kind: "pattern"; id: string; sectionId: string; ex: { en: string; ro: string; audio_en?: string | null }; narration_ro?: string }
  | { kind: "build"; id: string; sectionId: string; task: BuildTask; narration_ro?: string }
  | { kind: "listen"; id: string; sectionId: string; task: ListenTask; narration_ro?: string }
  | { kind: "dictation"; id: string; sectionId: string; task: DictationTask; narration_ro?: string }
  | { kind: "review"; id: string; sectionId: string; narration_ro?: string };

type ContentV2 = { sections?: Section[] };

/* Fallback DTO for old flashcards to avoid 'any' */
type FlashcardDTO = {
  id?: number | string;
  front_text?: string;
  back_text?: string;
  audio_url?: string | null;
};

/* ───────────────────────────── Helpers ───────────────────────────── */

function speak(text: string, lang = "ro-RO") {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    window.speechSynthesis.speak(u);
  } catch {
    /* noop */
  }
}

async function playAudioOrSpeak(url?: string | null, fallbackText?: string, lang?: string) {
  if (url) {
    try {
      const a = new Audio(url);
      await a.play();
      return;
    } catch {
      /* fallthrough */
    }
  }
  if (fallbackText) speak(fallbackText, lang);
}

function readContentV2(data: LessonDetail): ContentV2 | undefined {
  const raw = (data as unknown as { content?: unknown }).content;
  if (raw && typeof raw === "object" && "sections" in raw) {
    const maybe = raw as { sections?: unknown };
    if (Array.isArray(maybe.sections)) {
      return { sections: maybe.sections as Section[] };
    }
  }
  return undefined;
}

/* ───────────────────────────── Page ───────────────────────────── */

export default function LessonPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = Number(params.id as string);
  const { accessToken } = useAuth();

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [current, setCurrent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  // task state for gated "Next"
  const [listenAnswers, setListenAnswers] = useState<Record<string, number | null>>({});
  const [dictationAnswers, setDictationAnswers] = useState<Record<string, string>>({});
  const [buildAnswers, setBuildAnswers] = useState<Record<string, string[]>>({});
  const [revealedTeach, setRevealedTeach] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!accessToken || Number.isNaN(lessonId)) return;
    (async () => {
      try {
        const data = await apiClient.getLessonDetail(lessonId, accessToken);
        setLesson(data);

        const content = readContentV2(data);

        if (content?.sections?.length) {
          const flat: Page[] = [];
          const listenInit: Record<string, number | null> = {};
          const dictInit: Record<string, string> = {};

          for (const sec of content.sections) {
            if (sec.type === "overview") {
              flat.push({
                kind: "overview",
                id: sec.id,
                sectionId: sec.id,
                body_md: (sec as OverviewSection).body_md,
                narration_ro: sec.narration_ro,
                narration_en: sec.narration_en,
              });
            } else if (sec.type === "teach") {
              for (let i = 0; i < sec.items.length; i++) {
                flat.push({
                  kind: "teach",
                  id: `${sec.id}-${i}`,
                  sectionId: sec.id,
                  item: sec.items[i],
                  narration_ro: sec.narration_ro,
                });
              }
            } else if (sec.type === "grammar") {
              flat.push({
                kind: "grammar",
                id: sec.id,
                sectionId: sec.id,
                points: sec.points,
                narration_ro: sec.narration_ro,
              });
            } else if (sec.type === "patterns") {
              for (let i = 0; i < sec.examples.length; i++) {
                flat.push({
                  kind: "pattern",
                  id: `${sec.id}-${i}`,
                  sectionId: sec.id,
                  ex: sec.examples[i],
                  narration_ro: sec.narration_ro,
                });
              }
            } else if (sec.type === "build") {
              for (let i = 0; i < sec.tasks.length; i++) {
                flat.push({
                  kind: "build",
                  id: `${sec.id}-${i}`,
                  sectionId: sec.id,
                  task: sec.tasks[i],
                  narration_ro: sec.narration_ro,
                });
              }
            } else if (sec.type === "listen") {
              for (let i = 0; i < sec.tasks.length; i++) {
                const pid = `${sec.id}-${i}`;
                flat.push({
                  kind: "listen",
                  id: pid,
                  sectionId: sec.id,
                  task: sec.tasks[i],
                  narration_ro: sec.narration_ro,
                });
                listenInit[pid] = null;
              }
            } else if (sec.type === "dictation") {
              for (let i = 0; i < sec.tasks.length; i++) {
                const pid = `${sec.id}-${i}`;
                flat.push({
                  kind: "dictation",
                  id: pid,
                  sectionId: sec.id,
                  task: sec.tasks[i],
                  narration_ro: sec.narration_ro,
                });
                dictInit[pid] = "";
              }
            } else if (sec.type === "review") {
              flat.push({
                kind: "review",
                id: sec.id,
                sectionId: sec.id,
                narration_ro: sec.narration_ro,
              });
            }
          }
          setPages(flat);
          setListenAnswers(listenInit);
          setDictationAnswers(dictInit);
        } else {
          // Fallback to current simple flow if you haven't migrated content
          const simple: Page[] = [];
          simple.push({ kind: "overview", id: "intro", sectionId: "intro" });
          const flashcards = (data as unknown as { flashcards?: FlashcardDTO[] }).flashcards ?? [];
          flashcards.forEach((fc, i) => {
            simple.push({
              kind: "teach",
              id: `v-${fc.id ?? i}`,
              sectionId: "teach",
              item: { front: fc.front_text ?? "", back: fc.back_text ?? "", audio_en: fc.audio_url ?? null },
            });
          });
          simple.push({ kind: "review", id: "review", sectionId: "review" });
          setPages(simple);
        }
      } catch {
        setError("Failed to load lesson");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [lessonId, accessToken]);

  const total = pages.length || 1;
  const progressPct = Math.round(((current + 1) / total) * 100);

  const persistProgress = useCallback(async (percent: number) => {
    if (!lesson || !accessToken) return;
    try {
      setUpdating(true);
      await apiClient.updateProgress({ lesson_id: lesson.id, percent }, accessToken);
    } finally {
      setUpdating(false);
    }
  }, [lesson, accessToken]);

  const next = useCallback(() => {
    setCurrent((c) => {
      const n = Math.min(c + 1, total - 1);
      const pct = Math.round(((n + 1) / total) * 100);
      persistProgress(pct).catch(() => {});
      return n;
    });
  }, [total, persistProgress]);

  const prev = useCallback(() => setCurrent((c) => Math.max(0, c - 1)), []);

  // gating rules per page type
  const canProceed = useCallback(() => {
    const p = pages[current];
    if (!p) return false;
    if (p.kind === "teach") return revealedTeach[p.id] === true;
    if (p.kind === "listen") return listenAnswers[p.id] !== null;
    if (p.kind === "dictation") return (dictationAnswers[p.id] || "").trim().length > 0;
    if (p.kind === "build") return (buildAnswers[p.id]?.length || 0) > 0;
    return true;
  }, [current, pages, revealedTeach, listenAnswers, dictationAnswers, buildAnswers]);

  // keyboard handler (memoized)
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "Enter") {
      e.preventDefault();
      if (canProceed()) next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    }
  }, [canProceed, next, prev]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

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
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="pt-8 pb-8 text-center">
              <p className="text-destructive mb-6 text-sm">{error || "Lesson not found"}</p>
              <Button onClick={() => router.back()} className="gap-2" variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </Protected>
    );
  }

  const p = pages[current];

  return (
    <Protected>
      <Nav />

      <div className="sticky top-0 z-30 border-b backdrop-blur bg-background/90">
        <div className="container mx-auto max-w-6xl px-4 py-3 flex items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="font-semibold">{lesson.title}</div>
          </div>
          <div className="flex items-center gap-4 w-[320px] max-w-[45vw]">
            <Progress value={progressPct} className="h-2 flex-1" />
            <div className="text-xs tabular-nums w-12 text-right">{progressPct}%</div>
            <Badge variant="outline" className="text-xs px-2 py-0.5">
              {current + 1}/{total}
            </Badge>
          </div>
        </div>
      </div>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        <Card className="border-primary/10">
          <CardContent className="p-6 md:p-8 space-y-6">
            <NarratorBar ro={("narration_ro" in p && p.narration_ro) || undefined} />
            {p.kind === "overview" && (
              <div className="prose prose-invert max-w-none">
                {("body_md" in p && p.body_md) ? (
                  <div dangerouslySetInnerHTML={{ __html: (p.body_md as string) || "" }} />
                ) : (
                  <p>Welcome. We’ll learn room words, a mini-rule about “There is/There are”, and practice with short sentences.</p>
                )}
              </div>
            )}
            {p.kind === "teach" && (
              <div className="mx-auto max-w-xl">
                <div
                  key={p.id}  // force remount when the page (word) changes
                  className="group perspective h-56 cursor-pointer select-none"
                  onClick={() => setRevealedTeach((r) => ({ ...r, [p.id]: true }))}
                >
                  <div
                    className={[
                      "relative h-full w-full rounded-2xl border transition-transform duration-500 preserve-3d",
                      revealedTeach[p.id] ? "rotate-y-180" : "",
                    ].join(" ")}
                  >
                    {/* FRONT */}
                    <div className="absolute inset-0 backface-hidden flex items-center justify-center rounded-2xl bg-card">
                      <span className="text-5xl font-bold tracking-tight">{p.item.front}</span>
                    </div>

                    {/* BACK (hidden until revealed to prevent flash) */}
                    <div
                      className={[
                        "absolute inset-0 backface-hidden rotate-y-180 flex items-center justify-center rounded-2xl bg-card",
                        revealedTeach[p.id] ? "" : "opacity-0 pointer-events-none",
                      ].join(" ")}
                    >
                      <span className="text-4xl font-semibold text-green-500">{p.item.back}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => playAudioOrSpeak(p.item.audio_en ?? undefined, p.item.front, "en-US")}
                    className="gap-2"
                  >
                    <Volume2 className="h-4 w-4" />
                    Hear English
                  </Button>
                  {!revealedTeach[p.id] && (
                    <Button size="sm" onClick={() => setRevealedTeach((r) => ({ ...r, [p.id]: true }))}>
                      Show translation
                    </Button>
                  )}
                </div>

                {p.item.ipa || p.item.tip ? (
                  <div className="mt-3 text-xs text-muted-foreground text-center">
                    {p.item.ipa ? <span className="mr-3">IPA: {p.item.ipa}</span> : null}
                    {p.item.tip ? <span>{p.item.tip}</span> : null}
                  </div>
                ) : null}
              </div>
            )}

            {p.kind === "grammar" && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Grammar bite</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {p.points.map((t, i) => (
                    <li key={i} className="text-sm">{t}</li>
                  ))}
                </ul>
              </div>
            )}

            {p.kind === "pattern" && (
              <div className="space-y-4 text-center">
                <div className="text-xl">{p.ex.ro}</div>
                <div className="text-2xl font-semibold">{p.ex.en}</div>
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => playAudioOrSpeak(p.ex.audio_en ?? undefined, p.ex.en, "en-US")}
                    className="gap-2"
                  >
                    <Volume2 className="h-4 w-4" />
                    Play sentence
                  </Button>
                </div>
              </div>
            )}

            {p.kind === "build" && (
              <TokenBuilder
                id={p.id}
                tokens={p.task.tokens}
                value={buildAnswers[p.id] || []}
                onChange={(tokens) => setBuildAnswers((s) => ({ ...s, [p.id]: tokens }))}
              />
            )}

            {p.kind === "listen" && (
              <ListenChoice
                id={p.id}
                task={p.task}
                value={listenAnswers[p.id] ?? null}
                onChange={(idx) => setListenAnswers((s) => ({ ...s, [p.id]: idx }))}
              />
            )}

            {p.kind === "dictation" && (
              <Dictation
                task={p.task}
                value={dictationAnswers[p.id] ?? ""}
                onChange={(t) => setDictationAnswers((s) => ({ ...s, [p.id]: t }))}
              />
            )}

            {p.kind === "review" && (
              <div className="text-center py-8 space-y-3">
                <div className="text-5xl">🎉</div>
                <p>Nice work. Ready to test what you learned?</p>
                <div className="flex gap-3 justify-center">
                  <Button size="lg" onClick={() => router.push(`/quiz/${lesson.id}`)}>Start Quiz</Button>
                  <Button size="lg" variant="outline" onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom dock */}
        <div className="sticky bottom-0 mt-6">
          <div className="rounded-xl border bg-background/90 backdrop-blur px-4 py-3 flex items-center justify-between">
            <Button variant="outline" onClick={prev} disabled={current === 0}>Previous</Button>
            <div className="flex items-center gap-2">
              <Dots total={total} current={current} />
              <Button onClick={next} disabled={!canProceed()} className="gap-2">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground text-right">
            {updating ? "Saving progress…" : "Progress auto-saved"}
          </div>
        </div>
      </main>
    </Protected>
  );
}

/* ───────────────────────────── Subcomponents ───────────────────────────── */

function NarratorBar({ ro }: { ro?: string }) {
  if (!ro) return null;
  const play = () => playAudioOrSpeak(undefined, ro, "ro-RO");
  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
      <div className="text-sm text-muted-foreground">Explicație în română</div>
      <Button variant="outline" size="sm" onClick={play} className="gap-2">
        <Volume2 className="h-4 w-4" /> Ascultă
      </Button>
    </div>
  );
}

function Dots({ total, current }: { total: number; current: number }) {
  return (
    <div className="hidden md:flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`w-2.5 h-2.5 rounded-full ${i === current ? "bg-primary" : "bg-muted"}`}
        />
      ))}
    </div>
  );
}

function TokenBuilder({
  id,
  tokens,
  value,
  onChange,
}: {
  id: string;
  tokens: string[];
  value: string[];
  onChange: (joined: string[]) => void;
}) {
  const selected = value;
  const remaining = tokens.filter((t) => selected.filter((s) => s === t).length < tokens.filter((x) => x === t).length);
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
            key={`rem-${id}-${i}-${t}`}
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
                key={`sel-${id}-${i}-${t}`}
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

function ListenChoice({
  id,
  task,
  value,
  onChange,
}: {
  id: string;
  task: ListenTask;
  value: number | null;
  onChange: (i: number) => void;
}) {
  const play = () => playAudioOrSpeak(task.audio_en ?? undefined, task.options[task.correct_index], "en-US");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border px-3 py-2">
        <div className="text-sm text-muted-foreground">{task.prompt_ro || "Ascultă fraza și alege varianta corectă."}</div>
        <Button variant="outline" size="sm" onClick={play} className="gap-2">
          <Volume2 className="h-4 w-4" /> Play
        </Button>
      </div>
      <div className="grid gap-2">
        {task.options.map((opt, i) => (
          <button
            key={`${id}-opt-${i}`}
            type="button"
            onClick={() => onChange(i)}
            className={`rounded-md border px-3 py-2 text-left transition ${value === i ? "border-primary bg-primary/10" : "hover:bg-muted"}`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function Dictation({
  task,
  value,
  onChange,
}: {
  task: DictationTask;
  value: string;
  onChange: (t: string) => void;
}) {
  const play = () => playAudioOrSpeak(task.audio_en ?? undefined, task.answer, "en-US");
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border px-3 py-2">
        <div className="text-sm text-muted-foreground">Ascultă și tastează propoziția.</div>
        <Button variant="outline" size="sm" onClick={play} className="gap-2">
          <Volume2 className="h-4 w-4" /> Play
        </Button>
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type what you hear…"
        className="w-full rounded-md border bg-transparent px-3 py-2 outline-none"
      />
      <div className="text-xs text-muted-foreground">Tip: poți reda din nou dacă ai nevoie.</div>
    </div>
  );
}
