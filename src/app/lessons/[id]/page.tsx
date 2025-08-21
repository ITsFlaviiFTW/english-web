"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-store"
import { apiClient, type LessonDetail } from "@/lib/api"
import { ArrowLeft, BookOpen, Play, RotateCcw, ChevronLeft, ChevronRight, Volume2 } from "lucide-react"
import ReactMarkdown from "react-markdown"

export default function LessonPage() {
  const [lesson, setLesson] = useState<LessonDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [currentFlashcard, setCurrentFlashcard] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [progress, setProgress] = useState([50])
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false)

  const router = useRouter()
  const params = useParams()
  const lessonId = Number.parseInt(params.id as string)

  // pull what we need from the auth store
  const isAuthenticated = useAuth((s) => s.isAuthenticated)
  const accessToken = useAuth((s) => s.accessToken)
  const logout = useAuth((s) => s.logout)

  // redirect unauthenticated users
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login")
    }
  }, [isAuthenticated, router])

  // fetch lesson once we have a token
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return

    let alive = true
    ;(async () => {
      try {
        const data = await apiClient.get(`/lessons/${lessonId}/`, accessToken)
        if (!alive) return
        setLesson(data)
      } catch (err) {
        setError("Failed to load lesson")
        console.error("Lesson error:", err)
      } finally {
        if (alive) setIsLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [isAuthenticated, accessToken, lessonId])

  const handleLogout = () => {
    logout()
    router.replace("/login")
  }

  const handleProgressUpdate = async () => {
    if (!lesson || !accessToken) return
    setIsUpdatingProgress(true)
    try {
      await apiClient.updateProgress({ lesson_id: lesson.id, percent: progress[0] }, accessToken)
    } catch (err) {
      console.error("Progress update error:", err)
    } finally {
      setIsUpdatingProgress(false)
    }
  }

  const nextFlashcard = () => {
    if (!lesson) return
    setCurrentFlashcard((prev) => (prev + 1) % lesson.flashcards.length)
    setIsFlipped(false)
  }

  const prevFlashcard = () => {
    if (!lesson) return
    setCurrentFlashcard((prev) => (prev - 1 + lesson.flashcards.length) % lesson.flashcards.length)
    setIsFlipped(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-serif font-bold text-primary">English Learning</h1>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading lesson...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-serif font-bold text-primary">English Learning</h1>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="text-destructive mb-4">{error || "Lesson not found"}</p>
              <Button onClick={() => router.back()}>Go Back</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const currentCard = lesson.flashcards[currentFlashcard]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-serif font-bold text-primary">English Learning</h1>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Lesson Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-serif font-bold">{lesson.title}</h2>
            <Badge variant="outline">{lesson.difficulty}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Lesson Content */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Lesson Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{lesson.body_md}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            {/* Progress Tracking */}
            <Card>
              <CardHeader>
                <CardTitle>Mark Your Progress</CardTitle>
                <CardDescription>How much of this lesson have you completed?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{progress[0]}%</span>
                  </div>
                  <Slider value={progress} onValueChange={setProgress} max={100} step={10} className="w-full" />
                </div>
                <Button onClick={handleProgressUpdate} disabled={isUpdatingProgress} className="w-full">
                  {isUpdatingProgress ? "Updating..." : "Update Progress"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Flashcards */}
          <div className="space-y-6">
            {lesson.flashcards.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Flashcards</CardTitle>
                  <CardDescription>
                    {currentFlashcard + 1} of {lesson.flashcards.length}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    className="relative h-48 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg border-2 border-dashed border-primary/20 cursor-pointer transition-all duration-300 hover:shadow-md"
                    onClick={() => setIsFlipped(!isFlipped)}
                  >
                    <div className="absolute inset-0 flex items-center justify-center p-6">
                      <div className="text-center">
                        <p className="text-lg font-medium mb-2">
                          {isFlipped ? currentCard?.back_text : currentCard?.front_text}
                        </p>
                        {currentCard?.audio_url && (
                          <Button variant="ghost" size="sm" className="gap-2">
                            <Volume2 className="h-4 w-4" />
                            Play Audio
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2">
                      <RotateCcw className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={prevFlashcard}
                      disabled={lesson.flashcards.length <= 1}
                      className="gap-2 bg-transparent"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button onClick={() => setIsFlipped(!isFlipped)} variant="ghost">
                      {isFlipped ? "Show Front" : "Show Back"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={nextFlashcard}
                      disabled={lesson.flashcards.length <= 1}
                      className="gap-2 bg-transparent"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quiz CTA */}
            {lesson.questions.length > 0 && (
              <Card className="bg-gradient-to-r from-secondary/10 to-primary/10 border-secondary/20">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <h3 className="text-lg font-serif font-bold mb-2">Ready for the Quiz?</h3>
                    <p className="text-muted-foreground mb-4">
                      Test your knowledge with {lesson.questions.length} questions
                    </p>
                    <Button size="lg" onClick={() => router.push(`/quiz/${lesson.id}`)} className="gap-2">
                      <Play className="h-4 w-4" />
                      Start Quiz
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
