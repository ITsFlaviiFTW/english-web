"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { apiClient } from "@/lib/api"
import { useAuth } from "@/lib/auth-store"
import { ArrowLeft, CheckCircle, XCircle, Trophy, Zap, RotateCcw } from "lucide-react"

interface QuizAnswer {
  question_id: number
  selected: QuestionAnswer | null
}

interface QuestionAnswer {
  index?: number
  value?: boolean
  text?: string
}

interface Question {
  id: number
  prompt: string
  qtype: "mcq" | "tf" | "fill"
  payload: {
    options?: string[]
    blanks?: number
  }
}

interface LessonDetail {
  id: number
  title: string
  questions: Question[]
}

interface QuizAttemptResult {
  score_pct: number
  xp_delta: number
  results: {
    question_id: number
    is_correct: boolean
  }[]
}

export default function QuizPage() {
  const [lesson, setLesson] = useState<LessonDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<QuizAttemptResult | null>(null)
  const [showResults, setShowResults] = useState(false)
  const router = useRouter()
  const params = useParams()
  const lessonId = Number.parseInt(params.lessonId as string)
  const { accessToken, logout, user } = useAuth()

  useEffect(() => {
    if (!accessToken) {
      router.push("/login")
      return
    }

    const fetchLesson = async () => {
      try {
        const data = await apiClient.get(`/lessons/${lessonId}/`, accessToken)
        setLesson(data)
        // Initialize answers array
        setAnswers(
          data.questions.map((q: Question) => ({
            question_id: q.id,
            selected: null,
          })),
        )
      } catch (err) {
        setError("Failed to load quiz")
        console.error("Quiz error:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLesson()
  }, [router, lessonId, accessToken])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const updateAnswer = (questionId: number, selected: QuestionAnswer) => {
    setAnswers((prev) => prev.map((answer) => (answer.question_id === questionId ? { ...answer, selected } : answer)))
  }

  const getCurrentAnswer = (questionId: number) => {
    return answers.find((a) => a.question_id === questionId)?.selected
  }

  const canProceed = () => {
    if (!lesson) return false
    const currentQ = lesson.questions[currentQuestion]
    const currentAnswer = getCurrentAnswer(currentQ.id)
    return currentAnswer !== null && currentAnswer !== undefined
  }

  const handleNext = () => {
    if (!lesson) return
    if (currentQuestion < lesson.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const handleSubmit = async () => {
    if (!lesson || !accessToken) return

    setIsSubmitting(true)
    try {
      const result = await apiClient.post(
        "/quiz-attempts/",
        {
          lesson_id: lesson.id,
          answers: answers.filter((a) => a.selected !== null),
        },
        accessToken,
      )
      setResult(result)
      setShowResults(true)
    } catch (err) {
      setError("Failed to submit quiz")
      console.error("Quiz submission error:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderQuestion = (question: Question) => {
    const currentAnswer = getCurrentAnswer(question.id)

    switch (question.qtype) {
      case "mcq":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{question.prompt}</h3>
            <RadioGroup
              value={currentAnswer?.index?.toString() || ""}
              onValueChange={(value) => updateAnswer(question.id, { index: Number.parseInt(value) })}
            >
              {question.payload.options?.map((option: string, optionIndex: number) => (
                <div key={optionIndex} className="flex items-center space-x-2">
                  <RadioGroupItem value={optionIndex.toString()} id={`option-${optionIndex}`} />
                  <Label htmlFor={`option-${optionIndex}`} className="cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )

      case "tf":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{question.prompt}</h3>
            <RadioGroup
              value={currentAnswer?.value?.toString() || ""}
              onValueChange={(value) => updateAnswer(question.id, { value: value === "true" })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="true" />
                <Label htmlFor="true" className="cursor-pointer">
                  True
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="false" />
                <Label htmlFor="false" className="cursor-pointer">
                  False
                </Label>
              </div>
            </RadioGroup>
          </div>
        )

      case "fill":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{question.prompt}</h3>
            <Input
              placeholder="Type your answer here..."
              value={currentAnswer?.text || ""}
              onChange={(e) => updateAnswer(question.id, { text: e.target.value })}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Fill in the blank
              {question.payload.blanks !== undefined && question.payload.blanks > 1 ? "s" : ""}
            </p>
          </div>
        )

      default:
        return <div>Unknown question type</div>
    }
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
            <p className="text-muted-foreground">Loading quiz...</p>
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
              <p className="text-destructive mb-4">{error || "Quiz not found"}</p>
              <Button onClick={() => router.back()}>Go Back</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (showResults && result) {
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

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            {/* Results Header */}
            <Card className="mb-8 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
              <CardContent className="pt-6 text-center">
                <div className="mb-4">
                  <Trophy className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h2 className="text-3xl font-serif font-bold mb-2">Quiz Complete!</h2>
                  <p className="text-muted-foreground">Great job on completing the quiz</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{result.score_pct}%</div>
                    <div className="text-sm text-muted-foreground">Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-secondary flex items-center justify-center gap-1">
                      <Zap className="h-5 w-5" />+{result.xp_delta}
                    </div>
                    <div className="text-sm text-muted-foreground">XP Gained</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {result.results.filter((r) => r.is_correct).length}/{result.results.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Correct</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Question Results */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Question Results</CardTitle>
                <CardDescription>Review your answers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lesson.questions.map((question, index) => {
                    const questionResult = result.results.find((r) => r.question_id === question.id)
                    const isCorrect = questionResult?.is_correct || false

                    return (
                      <div
                        key={question.id}
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
                              Question {index + 1}: {question.prompt}
                            </p>
                            <Badge variant={isCorrect ? "default" : "destructive"}>
                              {isCorrect ? "Correct" : "Incorrect"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => router.push(`/lessons/${lesson.id}`)} variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Lesson
              </Button>
              <Button onClick={() => router.push("/dashboard")} className="gap-2">
                <Trophy className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <Button
                onClick={() => {
                  setShowResults(false)
                  setResult(null)
                  setCurrentQuestion(0)
                  setAnswers(
                    lesson.questions.map((q) => ({
                      question_id: q.id,
                      selected: null,
                    })),
                  )
                }}
                variant="outline"
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Retake Quiz
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const currentQ = lesson.questions[currentQuestion]
  const progress = ((currentQuestion + 1) / lesson.questions.length) * 100

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
        <div className="max-w-2xl mx-auto">
          {/* Navigation */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={() => router.push(`/lessons/${lesson.id}`)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Lesson
            </Button>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-serif font-bold">Quiz: {lesson.title}</h2>
              <Badge variant="outline">
                {currentQuestion + 1} of {lesson.questions.length}
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Question */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Question {currentQuestion + 1}</CardTitle>
              <CardDescription>
                {currentQ.qtype === "mcq" && "Choose the correct answer"}
                {currentQ.qtype === "tf" && "Select true or false"}
                {currentQ.qtype === "fill" && "Fill in the blank"}
              </CardDescription>
            </CardHeader>
            <CardContent>{renderQuestion(currentQ)}</CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button onClick={handlePrevious} disabled={currentQuestion === 0} variant="outline">
              Previous
            </Button>

            <div className="flex gap-2">
              {currentQuestion === lesson.questions.length - 1 ? (
                <Button onClick={handleSubmit} disabled={!canProceed() || isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Quiz"}
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={!canProceed()}>
                  Next
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
