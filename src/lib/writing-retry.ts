export type WritingReply = { text: string; error: string; retryable?: boolean; retryAfterMs?: number };
export type RetryStatus = { attempt: number; seconds: number };

/** One retry owner for all writing calls, including transport failures. */
export async function requestWithRetry(
  request: () => Promise<WritingReply>,
  active: () => boolean,
  onRetry: (status: RetryStatus | null) => void,
): Promise<WritingReply | null> {
  for (let attempt = 0; attempt <= 3; attempt++) {
    if (!active()) return null;
    onRetry(null);
    let reply: WritingReply;
    try {
      reply = await request();
    } catch {
      reply = { text: "", error: "Couldn't connect to the writing service. Please try again.", retryable: true };
    }
    if (!active()) return null;
    if ((!reply.error && reply.text.trim()) || reply.retryable !== true || attempt === 3) return reply;
    const delay = Math.min(60000, Math.max(4000 * 2 ** attempt, reply.retryAfterMs ?? 0));
    for (let remaining = delay; remaining > 0; remaining -= 1000) {
      if (!active()) return null;
      onRetry({ attempt: attempt + 1, seconds: Math.ceil(remaining / 1000) });
      await new Promise((resolve) => setTimeout(resolve, Math.min(1000, remaining)));
    }
  }
  return null;
}