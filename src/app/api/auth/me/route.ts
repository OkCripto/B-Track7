import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  MISSING_PRIMARY_EMAIL_MESSAGE,
  resolveAppUserFromClerk,
} from "@/lib/auth/clerkSupabaseUser";

export async function GET() {
  const authObject = await auth();
  if (!authObject.userId) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  try {
    const appUser = await resolveAppUserFromClerk(authObject);
    return NextResponse.json(
      {
        user: {
          id: appUser.id,
          email: appUser.email,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to resolve authenticated user.";
    const status =
      message === MISSING_PRIMARY_EMAIL_MESSAGE
        ? 400
        : message === "Unauthorized"
          ? 401
          : 500;
    return NextResponse.json(
      { user: null, error: { message } },
      { status }
    );
  }
}
