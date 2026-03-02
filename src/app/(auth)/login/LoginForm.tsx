"use client";

import { SignIn } from "@clerk/nextjs";

export default function LoginForm() {
  return (
    <SignIn
      path="/login"
      routing="path"
      signUpUrl="/signup"
      fallbackRedirectUrl="/dashboard"
    />
  );
}
