import { timingSafeEqual } from "node:crypto";

export class UnauthorizedCronRequestError extends Error {
  readonly status = 401;

  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedCronRequestError";
  }
}

function safeTokenCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function assertCronAuth(request: Request): { ok: true } {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    throw new Error("Missing CRON_SECRET environment variable.");
  }

  const authorizationHeader = request.headers.get("authorization");
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    throw new UnauthorizedCronRequestError();
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();
  if (!token || !safeTokenCompare(token, cronSecret)) {
    throw new UnauthorizedCronRequestError();
  }

  return { ok: true };
}

