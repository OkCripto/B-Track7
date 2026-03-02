"use client";

import { SignIn } from "@clerk/nextjs";

export default function LoginForm() {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/40 p-4 shadow-2xl backdrop-blur sm:p-6">
      <SignIn
        path="/login"
        routing="path"
        signUpUrl="/signup"
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}
