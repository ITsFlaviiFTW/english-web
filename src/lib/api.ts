// API types
export type Category = {
  id: number
  slug: string
  title: string
  description?: string
  emoji?: string
  completion_percentage?: number
}

export type Lesson = {
  id: number
  title: string
  difficulty?: string
  category: number
  word_count?: number
}

export type LessonDetail = Lesson & {
  body_md?: string
  flashcards: Array<{
    id: number
    front_text: string
    back_text: string
    audio_url?: string
  }>
  questions: Array<{
    id: number
    prompt: string
    qtype: "mcq" | "tf" | "fill"
    payload: {
      options?: string[]
      blanks?: number
    }
  }>
}

export type MeSummary = {
  username: string
  xp: number
  level: number
  streak?: number
  completedLessons: number
  accuracy?: number
  display_name?: string
  avatar_url?: string
}

export type Quiz = {
  id: number
  user_id: number
  category_id?: number
  total_questions: number
  correct_answers: number
  created_at: string
}

export type QuizQuestion = {
  id: number
  english: string
  romanian: string
  options: string[]
  correct_answer: string
}

export type QuizAttemptResult = {
  score_pct: number
  xp_delta: number
  results: Array<{
    question_id: number
    is_correct: boolean
  }>
}

export type ProgressUpdate = {
  lesson_id: number
  percent: number
}

export type QuizAttempt = {
  lesson_id: number
  answers: Array<{
    question_id: number
    selected: unknown
  }>
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "https://english-api.flavstudios.dev/api/v1"

// --- helpers ---------------------------------------------------------------

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text()
  try {
    return JSON.parse(text) as T
  } catch {
    // Non-JSON (e.g., HTML error page)
    throw new Error(
      `${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 140)}` : ""}`
    )
  }
}

// Generic API helper
export async function api(path: string, init?: RequestInit) {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })

  if (!res.ok) {
    await parseResponse<unknown>(res) // will throw with good message
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

// --- auth ------------------------------------------------------------------

// Use your custom endpoint: POST /auth/login/ -> { access, refresh, user }
export async function login(username: string, password: string) {
  const tokenRes = await fetch(`${API_BASE}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })

  if (!tokenRes.ok) {
    await parseResponse<unknown>(tokenRes)
  }

  const payload = (await tokenRes.json()) as {
    access: string
    refresh: string
    user?: Partial<MeSummary>
  }

  // Optional: fetch /me/ for fresh user data
  let user: Partial<MeSummary> | undefined = payload.user
  try {
    const meRes = await fetch(`${API_BASE}/me/`, {
      headers: { Authorization: `Bearer ${payload.access}` },
    })
    if (meRes.ok) {
      user = await meRes.json()
    }
  } catch {
    // ignore
  }

  return { access: payload.access, refresh: payload.refresh, user }
}

// If you haven't wired SimpleJWT refresh URLs, don't call this yet.
export async function refresh(refreshToken: string) {
  const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
  })
  if (!res.ok) {
    await parseResponse<unknown>(res)
  }
  return (await res.json()) as { access: string }
}

// --- typed client ----------------------------------------------------------

export const apiClient = {
  get: async (path: string, token?: string) => {
    return api(path, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  },

  post: async <T = unknown>(path: string, data: T, token?: string) => {
    return api(path, {
      method: "POST",
      body: JSON.stringify(data),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  },

  put: async <T = unknown>(path: string, data: T, token?: string) => {
    return api(path, {
      method: "PUT",
      body: JSON.stringify(data),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  },

  delete: async (path: string, token?: string) => {
    return api(path, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  },

  // domain-specific helpers
  getLessonDetail: async (lessonId: number, token?: string): Promise<LessonDetail> => {
    return apiClient.get(`/lessons/${lessonId}/`, token)
  },

  updateProgress: async (data: ProgressUpdate, token?: string): Promise<void> => {
    return apiClient.post("/progress/", data, token)
  },

  submitQuizAttempt: async (data: QuizAttempt, token?: string): Promise<QuizAttemptResult> => {
    return apiClient.post("/quiz-attempts/", data, token)
  },

  // Your backend exposes GET /me/
  getMeSummary: async (token: string): Promise<Partial<MeSummary>> => {
    return apiClient.get("/me/", token)
  },
}
