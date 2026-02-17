"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SignupForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const supabaseReady =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!supabaseReady) {
      setError("Missing Supabase environment variables.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      setError("Please enter an email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsLoading(false);
        return;
      }

      if (data.user && !data.session) {
        setMessage("Check your email to confirm your account.");
        setIsLoading(false);
        return;
      }

      setMessage("Account created! Redirecting...");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError("Unable to sign up. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setMessage(null);

    if (!supabaseReady) {
      setError("Missing Supabase environment variables.");
      return;
    }

    setIsGoogleLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setIsGoogleLoading(false);
        return;
      }

      setMessage("Redirecting to Google...");
    } catch (err) {
      setError("Unable to start Google sign-up. Please try again.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const isAnyLoading = isLoading || isGoogleLoading;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-500">
          Get started
        </p>
        <h2 className="text-3xl font-semibold text-slate-900">
          Create your account
        </h2>
        <p className="text-sm text-slate-600">
          Start tracking expenses, assets, and trends today.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        <button
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          type="button"
          onClick={handleGoogleSignUp}
          disabled={isAnyLoading || !supabaseReady}
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M23.49 12.27c0-.82-.07-1.6-.2-2.36H12v4.47h6.46a5.53 5.53 0 0 1-2.4 3.63v3.02h3.88c2.27-2.1 3.55-5.2 3.55-8.76Z"
              fill="#4285F4"
            />
            <path
              d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.88-3.02c-1.08.72-2.46 1.15-4.06 1.15-3.13 0-5.78-2.12-6.73-4.98H1.26v3.12A12 12 0 0 0 12 24Z"
              fill="#34A853"
            />
            <path
              d="M5.27 14.25A7.2 7.2 0 0 1 4.9 12c0-.78.13-1.54.37-2.25V6.63H1.26A12 12 0 0 0 0 12c0 1.94.46 3.78 1.26 5.37l4.01-3.12Z"
              fill="#FBBC05"
            />
            <path
              d="M12 4.77c1.76 0 3.34.6 4.58 1.78l3.44-3.44C17.94 1.19 15.23 0 12 0 7.27 0 3.17 2.71 1.26 6.63l4.01 3.12C6.22 6.88 8.87 4.77 12 4.77Z"
              fill="#EA4335"
            />
          </svg>
          <span>
            {isGoogleLoading ? "Connecting to Google..." : "Continue with Google"}
          </span>
        </button>
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          <span>or</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="password"
          >
            Password
          </label>
          <input
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a secure password"
            required
          />
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        <button
          className="flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
          type="submit"
          disabled={isAnyLoading || !supabaseReady}
        >
          {isLoading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        Already have an account?{" "}
        <Link className="font-semibold text-indigo-600" href="/login">
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}
