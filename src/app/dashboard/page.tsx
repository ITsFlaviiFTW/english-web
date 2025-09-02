// src/app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Protected from "@/components/Protected";
import Nav from "@/components/Nav";
import { useAuth } from "@/lib/auth-store";
import { apiClient, type MeSummary, type Category } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Play, Trophy, Target, Zap, Clock } from "lucide-react";

type LessonListItem = {
  id: number;
  title: string;
  difficulty?: string | null;
  category: number;
  word_count?: number | null;
};

type DashCategory = Category & {
  wordsCount: number;
  estimatedTime: string; // e.g. '15 min'
  lessonsCount: number;
  isUnlocked: boolean;
};

export default function DashboardPage() {
  const { accessToken, user } = useAuth();
  const [summary, setSummary] = useState<MeSummary | null>(null);
  const [cats, setCats] = useState<DashCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // ----- load data -----
  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        const [summaryData, categoriesData] = await Promise.all([
          apiClient.get("/me/summary/", accessToken),
          apiClient.get("/categories/", accessToken),
        ]);

        setSummary(summaryData as MeSummary);

        const categories: Category[] =
          (categoriesData?.results as Category[]) ?? (categoriesData as Category[]) ?? [];

        // fetch lessons per category to compute words/time (best effort)
        const lessonLists = await Promise.all(
          categories.map(async (c) => {
            try {
              const resp = await apiClient.get(`/categories/${c.slug}/lessons/`, accessToken);
              const list: LessonListItem[] = (resp?.results as LessonListItem[]) ?? [];
              return list;
            } catch {
              return [] as LessonListItem[];
            }
          })
        );

        const enriched: DashCategory[] = categories.map((c, idx) => {
          const lessons = lessonLists[idx] ?? [];
          const wordsCount = lessons.reduce((sum, l) => sum + (l.word_count ?? 0), 0);

          // super simple read-time heuristic: baseline 5 min + ~1 min per 12 words
          const minutes = Math.max(5, Math.round(5 + wordsCount / 12));
          const estimatedTime = `${minutes} min`;

          // gate by previous category completion; always unlock the first one
          const prevPct = idx > 0 ? categories[idx - 1].completion_percentage ?? 0 : 100;
          const isUnlocked = idx === 0 || prevPct >= 60;

          return {
            ...c,
            lessonsCount: lessons.length,
            wordsCount,
            estimatedTime,
            isUnlocked,
          };
        });

        setCats(enriched);
      } catch (e) {
        console.error("Failed to fetch dashboard data", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

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

  const displayName =
    summary?.display_name?.trim() ||
    summary?.username?.trim() ||
    user?.display_name?.trim() ||
    user?.username?.trim() ||
    "friend";

  // Level progress calc (kept from your existing code)
  const currentLevelXP = summary ? (summary.level - 1) * 100 + (summary.level > 1 ? (summary.level - 2) * 20 : 0) : 0;
  const nextLevelXP = summary ? summary.level * 100 + (summary.level - 1) * 20 : 100;
  const levelPct = summary ? Math.min(100, Math.max(0, ((summary.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100)) : 0;

  return (
    <Protected>
      <Nav />
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Welcome */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold">Bun venit, {displayName}! 👋</h1>
          <p className="text-muted-foreground text-lg">Hai să continuăm învățarea astăzi.</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Nivel</CardTitle>
              <Trophy className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Level {summary?.level ?? 1}</div>
              <div className="space-y-2 mt-2">
                <Progress value={levelPct} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {summary?.xp ?? 0} / {nextLevelXP} XP
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Streak</CardTitle>
              <Zap className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.streak ?? 0} zile</div>
              <p className="text-xs text-muted-foreground">Ține-o tot așa!</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Lecții</CardTitle>
              <BookOpen className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.completedLessons ?? 0}</div>
              <p className="text-xs text-muted-foreground">completate</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Acuratețe</CardTitle>
              <Target className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.accuracy ?? 0}%</div>
              <p className="text-xs text-muted-foreground">media la quiz</p>
            </CardContent>
          </Card>
        </div>

        {/* Learning path (categories as tracks) */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Parcursul tău de învățare
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cats.map((c, idx) => (
                <Card
                  key={c.id}
                  className={`transition-all ${c.isUnlocked ? "hover:shadow-md" : "opacity-70"}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">{c.emoji || "📚"}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{c.title}</h3>
                            {!c.isUnlocked && (
                              <Badge variant="secondary" className="text-xs">🔒 Blocat</Badge>
                            )}
                          </div>
                          {c.description && (
                            <p className="text-sm text-muted-foreground">{c.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-2">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {c.estimatedTime}
                            </span>
                            <span>{c.wordsCount} cuvinte</span>
                            <Badge variant="outline" className="text-xs">
                              {c.lessonsCount} lecții
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="w-56 hidden md:block">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Progres</span>
                          <span>{c.completion_percentage ?? 0}%</span>
                        </div>
                        <Progress value={c.completion_percentage ?? 0} className="h-2" />
                      </div>

                      <div className="flex gap-2">
                        {c.isUnlocked ? (
                          <>
                            <Button asChild className="min-w-[120px]">
                              <Link href={`/categories/${c.slug}`}>
                                {((c.completion_percentage ?? 0) > 0) ? "Continuă" : "Începe"}
                              </Link>
                            </Button>
                            <Button asChild variant="outline">
                              <Link href={`/quiz/category/${c.id}`}>
                                <Play className="h-4 w-4 mr-1" /> Quiz
                              </Link>
                            </Button>
                          </>
                        ) : (
                          <Button disabled className="min-w-[180px]">
                            Completează categoria anterioară
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="rounded-2xl">
            <CardHeader><CardTitle>Quiz aleatoriu</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">Testează-ți cunoștințele din toate categoriile.</p>
              <Button asChild className="w-full">
                <Link href="/quiz/random">Start</Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader><CardTitle>Toate categoriile</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">Răsfoiește toate categoriile și lecțiile.</p>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/categories">Deschide</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Protected>
  );
}
