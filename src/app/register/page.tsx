"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-store";
import { login, api, ApiError } from "@/lib/api";
import AuthCard from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

type FieldErrors = {
  username?: string[];
  email?: string[];
  password?: string[];
  non_field_errors?: string[];
};

export default function RegisterPage() {
  const router = useRouter();
  const { loginWithTokens } = useAuth();

  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [nonFieldError, setNonFieldError] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Client-side password checks
  const pwdChecks = useMemo<{
    rules: { minLen: boolean; notAllDigits: boolean; notSimilarToUser: boolean };
    allPass: boolean;
  }>(() => {
    const rules = {
      minLen: form.password.length >= 8,
      notAllDigits: !/^\d+$/.test(form.password),
      notSimilarToUser:
        !!form.username && !form.password.toLowerCase().includes(form.username.toLowerCase()),
    };
    return { rules, allPass: Object.values(rules).every(Boolean) };
  }, [form.password, form.username]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNonFieldError("");
    setFieldErrors({});

    if (form.password !== form.confirm) {
      setFieldErrors((prev) => ({ ...prev, password: ["Passwords do not match."] }));
      return;
    }

    setLoading(true);
    try {
      await api("/auth/register/", {
        method: "POST",
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
        }),
      });

      const r = await login(form.username, form.password);
      loginWithTokens(r.access, r.refresh);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const d = (err.data || {}) as Record<string, string[] | string>;
        const fe: FieldErrors = {};
        for (const k of Object.keys(d)) {
          const val = d[k];
          fe[k as keyof FieldErrors] = Array.isArray(val) ? (val as string[]) : [String(val)];
        }
        if (Object.keys(fe).length) setFieldErrors(fe);
        else setNonFieldError(err.message);
      } else {
        setNonFieldError(err instanceof Error ? err.message : "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Join Prava today">
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
            className={cn(
              "h-12",
              fieldErrors.username && "border-destructive focus-visible:ring-destructive"
            )}
          />
          {fieldErrors.username && (
            <ul className="mt-1 text-sm text-destructive list-disc list-inside">
              {fieldErrors.username.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            className={cn(
              "h-12",
              fieldErrors.email && "border-destructive focus-visible:ring-destructive"
            )}
          />
          {fieldErrors.email && (
            <ul className="mt-1 text-sm text-destructive list-disc list-inside">
              {fieldErrors.email.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            className={cn(
              "h-12 transition-colors",
              fieldErrors.password
                ? "border-destructive focus-visible:ring-destructive"
                : pwdChecks.allPass && form.password.length > 0
                ? "border-green-500 focus-visible:ring-green-500"
                : ""
            )}
          />

          {/* Live criteria */}
          <div className="mt-2 grid grid-cols-1 gap-1 text-sm">
            <Criteria ok={!!pwdChecks.rules.minLen} text="At least 8 characters" />
            <Criteria ok={!!pwdChecks.rules.notAllDigits} text="Not all numbers" />
            <Criteria ok={!!pwdChecks.rules.notSimilarToUser} text="Not too similar to username" />
          </div>

          {/* Backend field errors */}
          {fieldErrors.password && (
            <ul className="mt-2 text-sm text-destructive list-disc list-inside">
              {fieldErrors.password.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>
          <Input
            id="confirm"
            type="password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            required
            className="h-12"
          />
        </div>

        <Button type="submit" className="w-full h-12" disabled={loading}>
          {loading ? "Creating account..." : "Create Account"}
        </Button>

        {/* Non-field errors at the bottom */}
        {nonFieldError && (
          <Alert variant="destructive">
            <AlertDescription>{nonFieldError}</AlertDescription>
          </Alert>
        )}
      </form>

      <div className="text-center text-sm text-muted-foreground">
        Already have an account{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </AuthCard>
  );
}

function Criteria({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className={cn("flex items-center gap-2", ok ? "text-green-600" : "text-muted-foreground")}>
      {ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
      <span>{text}</span>
    </div>
  );
}
