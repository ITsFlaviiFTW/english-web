"use client";

export function RadioGroup({ children }: { children?: React.ReactNode }) {
  // Placeholder wrapper
  return <div className="grid gap-2">{children}</div>;
}

export function RadioGroupItem() {
  // Placeholder — no actual input to keep it minimal
  return null;
}
