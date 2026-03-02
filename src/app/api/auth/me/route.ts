import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { api } from "../../../../../convex/_generated/api";
import { createAuthedConvexClient } from "@/lib/convex/server";

export async function GET() {
  const authObject = await auth();
  if (!authObject.userId) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const user = await currentUser();
  const client = await createAuthedConvexClient();
  if (!client) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  await client.mutation(api.users.ensure_current_user, {
    email: user?.primaryEmailAddress?.emailAddress,
  });

  return NextResponse.json(
    {
      user: {
        id: authObject.userId,
        email: user?.primaryEmailAddress?.emailAddress ?? null,
      },
    },
    { status: 200 }
  );
}
