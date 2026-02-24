function trimCodeFence(value: string): string {
  const fencedMatch = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  return value;
}

export function stripMarkdownFences(text: string): string {
  return trimCodeFence(text.trim());
}

export function safeParseJson<T = unknown>(
  text: string,
  context = "JSON payload",
): T {
  const normalized = stripMarkdownFences(text);
  try {
    return JSON.parse(normalized) as T;
  } catch (error) {
    const snippet = normalized.slice(0, 200);
    throw new Error(
      `${context} is not valid JSON. Snippet: ${snippet}`,
      error instanceof Error ? { cause: error } : undefined,
    );
  }
}

