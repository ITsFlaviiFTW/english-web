"use client"

import Protected from "@/components/Protected"
import Nav from "@/components/Nav"

export default function QuizLessonPlaceholder() {
  return (
    <Protected>
      <Nav />
      <div className="max-w-2xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Quiz — coming soon</h1>
        <p className="text-muted-foreground">
          This quiz will be unlocked once the quiz API is live. For now, explore lessons and flashcards. 🚀
        </p>
      </div>
    </Protected>
  )
}
