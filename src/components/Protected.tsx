"use client";

import type React from "react";

export default function Protected({ children }: { children: React.ReactNode }) {
  // Placeholder — no auth checks
  return <>{children}</>;
}
