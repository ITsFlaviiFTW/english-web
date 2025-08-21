"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-store"
import { Button } from "@/components/ui/button"
import { Home, BookOpen, LogOut, Trophy, Zap } from "lucide-react"

export default function Nav() {
  const router = useRouter()
  const { logout, user } = useAuth()

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    /* Enhanced navigation with glass effect and better styling */
    <nav className="sticky top-0 z-50 glass-card border-b border-border/50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="text-2xl font-bold gradient-text">
              Prava
            </Link>

            <div className="hidden md:flex space-x-8">
              <Link
                href="/dashboard"
                className="flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-primary/10"
              >
                <Home size={20} />
                <span className="font-medium">Dashboard</span>
              </Link>

              <Link
                href="/categories"
                className="flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-primary/10"
              >
                <BookOpen size={20} />
                <span className="font-medium">Categories</span>
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {user && (
              /* Enhanced user stats with better styling */
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-accent/10 px-3 py-2 rounded-lg">
                  <Trophy size={18} className="text-accent" />
                  <span className="font-semibold">{user.xp || 0} XP</span>
                </div>
                <div className="flex items-center space-x-2 bg-accent/10 px-3 py-2 rounded-lg">
                  <Zap size={18} className="text-accent" />
                  <span className="font-semibold">{user.streak || 0}</span>
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut size={18} className="mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
