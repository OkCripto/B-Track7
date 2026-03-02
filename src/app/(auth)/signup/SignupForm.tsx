"use client";

import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function SignupForm() {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/40 p-4 shadow-2xl backdrop-blur sm:p-6">
      <SignUp
        path="/signup"
        routing="path"
        signInUrl="/login"
        fallbackRedirectUrl="/dashboard"
        appearance={{
          baseTheme: dark,
          elements: {
            card: "border border-white/10 bg-transparent shadow-none",
            rootBox: "mx-auto w-full",
            formButtonPrimary:
              "bg-white text-black hover:bg-white/90 focus-visible:ring-emerald-300/20",
            footerActionLink: "text-white",
            socialButtonsBlockButton:
              "border border-white/15 bg-white/5 text-white/80 hover:bg-white/10",
          },
        }}
      />
    </div>
  );
}
