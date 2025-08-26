"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-store";
import { login, api } from "@/lib/api";
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

  const pwdChecks = useMemo(() => {
    const minLen = form.password.length >= 8;
    const hasUpper = /[A-Z]/.test(form.password);
    const hasSpecial = /[^A-Za-z0-9]/.test(form.password);
    const notSimilarToUser =
      !!form.username && !form.password.toLowerCase().includes(form.username.toLowerCase());
    return {
      rules: { minLen, hasUpper, hasSpecial, notSimilarToUser },
      requiredPass: minLen && hasUpper && hasSpecial,
    };
  }, [form.password, form.username]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNonFieldError("");
    setFieldErrors({});

    if (form.password !== form.confirm) {
      setFieldErrors((prev) => ({ ...prev, password: ["Passwords do not match."] }));
      return;
    }
    if (!pwdChecks.requiredPass) {
      setFieldErrors((prev) => ({
        ...prev,
        password: ["Password must be at least 8 characters, include an uppercase letter and a special character."],
      }));
      return;
    }

    setLoading(true);
    try {
      await api("/auth/register/", {
        method: "POST",
        body: JSON.stringify({ username: form.username, email: form.email, password: form.password }),
      });

      const r = await login(form.username, form.password);
      loginWithTokens(r.access, r.refresh, r.user);
      router.replace("/dashboard");
    } catch (err) {
      // Our api() throws Error(message). Try to pull structured errors if present.
      const message = err instanceof Error ? err.message : "Registration failed";
      // If DRF returned a JSON body, our api() already tried to parse; we only have message.
      // Optionally, detect common DRF phrases and map to fields:
      const fe: FieldErrors = {};
      if (/username/i.test(message)) fe.username = [message];
      if (/email/i.test(message)) fe.email = [message];
      if (/password/i.test(message)) fe.password = [message];

      if (Object.keys(fe).length) setFieldErrors(fe);
      else setNonFieldError(message);
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
            className={cn("h-12", fieldErrors.username && "border-destructive focus-visible:ring-destructive")}
          />
          {fieldErrors.username && (
            <ul className="mt-1 text-sm text-destructive list-disc list-inside">
              {fieldErrors.username.map((m, i) => <li key={i}>{m}</li>)}
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
            className={cn("h-12", fieldErrors.email && "border-destructive focus-visible:ring-destructive")}
          />
          {fieldErrors.email && (
            <ul className="mt-1 text-sm text-destructive list-disc list-inside">
              {fieldErrors.email.map((m, i) => <li key={i}>{m}</li>)}
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
                : pwdChecks.requiredPass && form.password.length > 0
                ? "border-green-500 focus-visible:ring-green-500"
                : ""
            )}
          />
          <div className="mt-2 grid grid-cols-1 gap-1 text-sm">
            <Criteria ok={!!pwdChecks.rules.minLen} text="At least 8 characters" />
            <Criteria ok={!!pwdChecks.rules.hasUpper} text="At least one uppercase letter" />
            <Criteria ok={!!pwdChecks.rules.hasSpecial} text="At least one special character (!@#$%^&*)" />
            <Criteria ok={!!pwdChecks.rules.notSimilarToUser} text="Not too similar to username" />
          </div>
          {fieldErrors.password && (
            <ul className="mt-2 text-sm text-destructive list-disc list-inside">
              {fieldErrors.password.map((m, i) => <li key={i}>{m}</li>)}
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

        <Button type="submit" className="w-full h-12" disabled={loading || !pwdChecks.requiredPass}>
          {loading ? "Creating account..." : "Create Account"}
        </Button>

        {nonFieldError && (
          <Alert variant="destructive">
            <AlertDescription>{nonFieldError}</AlertDescription>
          </Alert>
        )}
      </form>

      <div className="text-center text-sm text-muted-foreground">
        Already have an account{" "}
        <Link href="/login" className="text-primary hover:underline">Sign in</Link>
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
