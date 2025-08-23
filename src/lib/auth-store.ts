// src/lib/auth-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type User = {
  id: number;                 // <-- make optional
  username: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
  xp?: number;
  streak?: number;
};

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  loginWithTokens: (access: string, refresh: string, user?: User) => void;
  logout: () => void;
  init: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),

      loginWithTokens: (access, refresh, user) => {
        set({
          accessToken: access,
          refreshToken: refresh,
          user: user ?? null,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        });
      },

      init: () => {
        const s = get();
        if (s.accessToken) set({ isAuthenticated: true });
      },
    }),
    {
      name: "auth-storage",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
        if (state?.accessToken) state.isAuthenticated = true;
      },
    },
  ),
);
