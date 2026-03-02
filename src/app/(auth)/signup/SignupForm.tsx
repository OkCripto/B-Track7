"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignupForm() {
  return (
    <SignUp
      path="/signup"
      routing="path"
      signInUrl="/login"
      fallbackRedirectUrl="/dashboard"
    />
  );
}
