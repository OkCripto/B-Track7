import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

function requireConvexUrl() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_CONVEX_URL");
  }
  return url;
}

export async function createAuthedConvexClient() {
  const authObject = await auth();
  if (!authObject.userId) {
    return null;
  }

  const token = await authObject.getToken({ template: "convex" });
  if (!token) {
    throw new Error("Missing Clerk Convex token. Configure JWT template named 'convex'.");
  }

  const client = new ConvexHttpClient(requireConvexUrl());
  client.setAuth(token);
  return client;
}

export function createConvexClient() {
  return new ConvexHttpClient(requireConvexUrl());
}
