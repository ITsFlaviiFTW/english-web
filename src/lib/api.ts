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

async function throwErrorFromResponse(res: Response): Promise<never> {
  const raw = await res.text()
  try {
    const data = raw ? JSON.parse(raw) : {}
    let msg = ""

    if (typeof data === "string") msg = data
    else if (data.detail) msg = String(data.detail)
    else if (data.non_field_errors) msg = (data.non_field_errors as string[]).join(" ")
    else if (data.password) msg = Array.isArray(data.password) ? data.password.join(" ") : String(data.password)
    else if (data.username) msg = Array.isArray(data.username) ? data.username.join(" ") : String(data.username)
    else if (Object.keys(data).length) msg = JSON.stringify(data)

    throw new Error(`${res.status} ${res.statusText}${msg ? ` — ${msg}` : ""}`)
  } catch {
    throw new Error(`${res.status} ${res.statusText}${raw ? ` — ${raw.slice(0, 140)}` : ""}`)
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
    await throwErrorFromResponse(res) // always throws
  }
  const txt = await res.text()
  return txt ? JSON.parse(txt) : null
}

// --- auth ------------------------------------------------------------------

export async function login(username: string, password: string) {
  const tokenRes = await fetch(`${API_BASE}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })

  if (!tokenRes.ok) {
    await throwErrorFromResponse(tokenRes) // fix: don't call missing parseResponse
  }

  const payload = (await tokenRes.json()) as {
    access: string
    refresh: string
    user?: Partial<MeSummary>
  }

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

export async function refresh(refreshToken: string) {
  const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
  })
  if (!res.ok) {
    await throwErrorFromResponse(res) // fix: don't call missing parseResponse
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

  getLessonDetail: async (lessonId: number, token?: string): Promise<LessonDetail> => {
    return apiClient.get(`/lessons/${lessonId}/`, token)
  },

  updateProgress: async (data: ProgressUpdate, token?: string): Promise<void> => {
    return apiClient.post("/progress/", data, token)
  },

  submitQuizAttempt: async (data: QuizAttempt, token?: string): Promise<QuizAttemptResult> => {
    return apiClient.post("/quiz-attempts/", data, token)
  },

  getMeSummary: async (token: string): Promise<Partial<MeSummary>> => {
    return apiClient.get("/me/", token)
  },
}
