"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Protected from "@/components/Protected"
import Nav from "@/components/Nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-store"
import { apiClient, type LessonDetail } from "@/lib/api"
import { ArrowLeft, BookOpen, Play, ChevronLeft, ChevronRight, Volume2 } from "lucide-react"
import ReactMarkdown from "react-markdown"

export default function LessonPage() {
  const router = useRouter()
  const params = useParams()
  const lessonId = Number(params.id as string)
  const { accessToken } = useAuth()

  const [lesson, setLesson] = useState<LessonDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [currentFlashcard, setCurrentFlashcard] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [progress, setProgress] = useState([50])

  useEffect(() => {
    if (!accessToken || Number.isNaN(lessonId)) return
    ;(async () => {
      try {
        const data = await apiClient.getLessonDetail(lessonId, accessToken)
        data.flashcards ||= []
        data.questions ||= []
        setLesson(data)
      } catch (err) {
        console.error("Failed to load lesson:", err)
        setError("Failed to load lesson")
      } finally {
        setIsLoading(false)
      }
    })()
  }, [lessonId, accessToken])

  const nextFlashcard = () => {
    if (!lesson || lesson.flashcards.length === 0) return
    setCurrentFlashcard((prev) => (prev + 1) % lesson.flashcards.length)
    setIsFlipped(false)
  }

  const prevFlashcard = () => {
    if (!lesson || lesson.flashcards.length === 0) return
    setCurrentFlashcard((prev) => (prev - 1 + lesson.flashcards.length) % lesson.flashcards.length)
    setIsFlipped(false)
  }

  // No-op for now; we'll wire this later.
  const handleProgressUpdate = async () => {
    console.log("Progress update (no-op):", progress[0])
  }

  if (isLoading) {
    return (
      <Protected>
        <Nav />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Protected>
    )
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
    )
  }

  const currentCard = lesson.flashcards[currentFlashcard]

  return (
    <Protected>
      <Nav />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-bold">{lesson.title}</h2>
            {lesson.difficulty && <Badge variant="outline">{lesson.difficulty}</Badge>}
          </div>
          {lesson.word_count ? (
            <p className="text-sm text-muted-foreground">{lesson.word_count} words</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Lesson Content
                </CardTitle>
                <CardDescription>Read through the core content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{lesson.body_md || ""}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>

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
                <Button onClick={handleProgressUpdate} className="w-full">
                  Update Progress
                </Button>
              </CardContent>
            </Card>
          </div>

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
                    onClick={() => setIsFlipped((f) => !f)}
                    role="button"
                    aria-label="Flip flashcard"
                  >
                    <div className="absolute inset-0 flex items-center justify-center p-6">
                      <div className="text-center">
                        <p className="text-lg font-medium mb-2">
                          {isFlipped ? currentCard?.back_text : currentCard?.front_text}
                        </p>
                        {currentCard?.audio_url && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gap-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              const a = new Audio(currentCard.audio_url!)
                              a.play().catch(() => {})
                            }}
                          >
                            <Volume2 className="h-4 w-4" />
                            Play Audio
                          </Button>
                        )}
                      </div>
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
                    <Button onClick={() => setIsFlipped((f) => !f)} variant="ghost">
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

            {lesson.questions.length > 0 && (
              <Card className="bg-gradient-to-r from-secondary/10 to-primary/10 border-secondary/20">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <h3 className="text-lg font-bold mb-2">Ready for the Quiz?</h3>
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
    </Protected>
  )
}
