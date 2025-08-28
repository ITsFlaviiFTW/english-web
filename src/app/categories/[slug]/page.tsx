"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-store"
import { apiClient, type Category, type Lesson } from "@/lib/api"
import Protected from "@/components/Protected"
import Nav from "@/components/Nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Play, ArrowLeft, Clock } from "lucide-react"

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const { accessToken } = useAuth()
  const [category, setCategory] = useState<Category | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accessToken || !slug) return
    ;(async () => {
      try {
        const [categoryData, lessonsData] = await Promise.all([
          apiClient.get(`/categories/${slug}/`, accessToken),
          apiClient.get(`/categories/${slug}/lessons/`, accessToken),
        ])
        setCategory(categoryData)
        setLessons(lessonsData.results || lessonsData)
      } catch (error) {
        console.error("Failed to fetch category data:", error)
      } finally {
        setLoading(false)
      }
    })()
  }, [accessToken, slug])

  if (loading) {
    return (
      <Protected>
        <Nav />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Protected>
    )
  }

  if (!category) {
    return (
      <Protected>
        <Nav />
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Category not found</h1>
            <Button asChild>
              <Link href="/categories">Back to Categories</Link>
            </Button>
          </div>
        </div>
      </Protected>
    )
  }

  return (
    <Protected>
      <Nav />
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/categories">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
        </div>

        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            <span className="text-6xl">{category.emoji || "📚"}</span>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">{category.title}</h1>
              <Badge variant="secondary" className="mt-2">
                {category.completion_percentage || 0}% Complete
              </Badge>
            </div>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {category.description || "Learn essential vocabulary and phrases for this category"}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href={`/quiz/category/${category.id}`}>
              <Play className="w-4 h-4 mr-2" />
              Start Quiz
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href={`/categories/${category.slug}/flashcards`}>
              <BookOpen className="w-4 h-4 mr-2" />
              Flashcards
            </Link>
          </Button>
        </div>

        {/* Lessons List */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Lessons ({lessons.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lessons.map((lesson, index) => (
                <Card key={lesson.id} className="rounded-xl hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold">{lesson.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {lesson.difficulty && (
                              <Badge variant="outline" className="text-xs">
                                {lesson.difficulty}
                              </Badge>
                            )}
                            {lesson.word_count && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {lesson.word_count} words
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button asChild>
                        <Link href={`/lessons/${lesson.id}`}>Start Lesson</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {lessons.length === 0 && (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No lessons available</h3>
                <p className="text-muted-foreground">Lessons for this category will appear here once they are added.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Protected>
  )
}
