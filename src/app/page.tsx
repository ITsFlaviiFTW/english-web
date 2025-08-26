"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Users, Trophy, Zap } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const { hydrated, isAuthenticated } = useAuth()

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      router.replace("/dashboard")
    }
  }, [hydrated, isAuthenticated, router])

  // Optional: while store hydrates, show nothing (avoid flash)
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl md:text-8xl font-bold mb-8 gradient-text">Prava</h1>
          <p className="text-2xl md:text-3xl text-foreground/90 mb-6 max-w-2xl mx-auto font-medium">
            Conversational English for Romanian speakers
          </p>
          <p className="text-lg text-muted-foreground mb-16 max-w-3xl mx-auto leading-relaxed">
            Master English conversation with interactive lessons, vocabulary practice, and personalized quizzes designed
            specifically for Romanian speakers.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button
              asChild
              size="lg"
              className="text-lg px-10 py-7 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
            >
              <Link href="/register">Start Learning</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-lg px-10 py-7 rounded-xl glass-card hover:bg-card/60 bg-transparent"
            >
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-20 gradient-text">Why Choose Prava?</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center rounded-2xl glass-card hover:bg-card/90 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/10">
              <CardHeader className="pb-4">
                <BookOpen className="w-16 h-16 text-primary mx-auto mb-6" />
                <CardTitle className="text-xl">Interactive Lessons</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Learn with flashcards, audio pronunciation, and structured lessons
                </p>
              </CardContent>
            </Card>

            <Card className="text-center rounded-2xl glass-card hover:bg-card/90 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/10">
              <CardHeader className="pb-4">
                <Users className="w-16 h-16 text-primary mx-auto mb-6" />
                <CardTitle className="text-xl">Romanian Focus</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Designed specifically for Romanian speakers with familiar translations
                </p>
              </CardContent>
            </Card>

            <Card className="text-center rounded-2xl glass-card hover:bg-card/90 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/10">
              <CardHeader className="pb-4">
                <Trophy className="w-16 h-16 text-primary mx-auto mb-6" />
                <CardTitle className="text-xl">Track Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Earn XP, level up, and see your improvement over time
                </p>
              </CardContent>
            </Card>

            <Card className="text-center rounded-2xl glass-card hover:bg-card/90 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/10">
              <CardHeader className="pb-4">
                <Zap className="w-16 h-16 text-primary mx-auto mb-6" />
                <CardTitle className="text-xl">Daily Streaks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Build consistent learning habits with daily practice streaks
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
