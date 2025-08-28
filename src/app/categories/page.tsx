"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-store"
import { apiClient, type Category } from "@/lib/api"
import Protected from "@/components/Protected"
import Nav from "@/components/Nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BookOpen, Play } from "lucide-react"

export default function CategoriesPage() {
  const { accessToken } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accessToken) return
    ;(async () => {
      try {
        const data = await apiClient.get("/categories/", accessToken)
        setCategories(data.results || data)
      } catch (error) {
        console.error("Failed to fetch categories:", error)
      } finally {
        setLoading(false)
      }
    })()
  }, [accessToken])

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

  return (
    <Protected>
      <Nav />
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold">Learning Categories</h1>
          <p className="text-muted-foreground text-lg">
            Choose a category to start learning English vocabulary and phrases
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Card key={category.id} className="rounded-2xl hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{category.emoji || "📚"}</span>
                    <CardTitle className="text-xl">{category.title}</CardTitle>
                  </div>
                  <Badge variant="secondary">{category.completion_percentage || 0}%</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  {category.description || "Learn essential vocabulary and phrases"}
                </p>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{category.completion_percentage || 0}%</span>
                  </div>
                  <Progress value={category.completion_percentage || 0} className="h-2" />
                </div>

                <div className="flex gap-2">
                  <Button asChild className="flex-1">
                    <Link href={`/categories/${category.slug}`}>
                      <BookOpen className="w-4 h-4 mr-2" />
                      Study
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1 bg-transparent">
                    <Link href={`/quiz/category/${category.id}`}>
                      <Play className="w-4 h-4 mr-2" />
                      Quiz
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No categories available</h3>
            <p className="text-muted-foreground">
              {"Categories will appear here once they're added to your learning path."}
            </p>
          </div>
        )}
      </div>
    </Protected>
  )
}
