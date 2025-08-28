"use client"

import Protected from "@/components/Protected"
import Nav from "@/components/Nav"

export default function QuizCategoryPlaceholder() {
  return (
    <Protected>
      <Nav />
      <div className="max-w-2xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Category Quiz — coming soon</h1>
        <p className="text-muted-foreground">Working on category-wide quizzes. Stay tuned!</p>
      </div>
    </Protected>
  )
}
