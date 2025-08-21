import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface AuthCardProps {
  title: string
  children: React.ReactNode
}

export default function AuthCard({ title, children }: AuthCardProps) {
  return (
    /* Enhanced auth card with better background and glass effect */
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-md rounded-2xl shadow-2xl glass-card border-border/50">
        <CardHeader className="text-center pb-8 pt-8">
          <CardTitle className="text-3xl font-bold gradient-text mb-3">Prava</CardTitle>
          <p className="text-muted-foreground text-lg">{title}</p>
        </CardHeader>
        <CardContent className="space-y-6 pb-8">{children}</CardContent>
      </Card>
    </div>
  )
}
