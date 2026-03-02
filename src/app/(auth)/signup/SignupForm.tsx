"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignupForm() {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/40 p-4 shadow-2xl backdrop-blur sm:p-6">
      <SignUp
        path="/signup"
        routing="path"
        signInUrl="/login"
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}
