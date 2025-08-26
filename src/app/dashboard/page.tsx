"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-store"
import { apiClient, type MeSummary, type Category } from "@/lib/api"
import Protected from "@/components/Protected"
import Nav from "@/components/Nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Trophy, Zap, Target } from "lucide-react"

export default function DashboardPage() {
  const { accessToken } = useAuth()
  const [summary, setSummary] = useState<MeSummary | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) return

      try {
        const [summaryData, categoriesData] = await Promise.all([
          apiClient.get("/me/summary/", accessToken),
          apiClient.get("/categories/", accessToken),
        ])

        setSummary(summaryData)
        setCategories(categoriesData.results || categoriesData)
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [accessToken])

  if (loading) {
    return (
      <Protected>
        <Nav />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Protected>
    )
  }

  const currentLevelXP = summary ? (summary.level - 1) * 100 + (summary.level > 1 ? (summary.level - 2) * 20 : 0) : 0
  const nextLevelXP = summary ? summary.level * 100 + (summary.level - 1) * 20 : 100
  const progressPercentage = summary ? ((summary.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100 : 0

  return (
    <Protected>
      <Nav />
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Welcome Section */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold">
            Welcome back, {summary?.display_name || summary?.username}!
          </h1>
          <p className="text-muted-foreground text-lg">Ready to continue your English learning journey?</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Level</CardTitle>
              <Trophy className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Level {summary?.level || 1}</div>
              <div className="space-y-2 mt-2">
                <Progress value={progressPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {summary?.xp || 0} / {nextLevelXP} XP
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Streak</CardTitle>
              <Zap className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.streak || 0} days</div>
              <p className="text-xs text-muted-foreground">Keep it up!</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lessons</CardTitle>
              <BookOpen className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.completedLessons || 0}</div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
              <Target className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.accuracy || 0}%</div>
              <p className="text-xs text-muted-foreground">Quiz average</p>
            </CardContent>
          </Card>
        </div>

        {/* Categories Overview */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Learning Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <Card key={category.id} className="rounded-xl hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{category.emoji || "📚"}</span>
                        <h3 className="font-semibold">{category.title}</h3>
                      </div>
                      <Badge variant="secondary">{category.completion_percentage || 0}%</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
                    <Button asChild size="sm" className="w-full">
                      <Link href={`/categories/${category.slug}`}>Continue Learning</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Quick Quiz</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">Test your knowledge with a random quiz from all categories</p>
              <Button asChild className="w-full">
                <Link href="/quiz/random">Start Random Quiz</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Browse Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">Explore all available learning categories and lessons</p>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/categories">View All Categories</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Protected>
  )
}
