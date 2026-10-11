import { afterEach, describe, expect, it, vi } from "vitest";
import { requestWithRetry } from "./writing-retry";

afterEach(() => vi.useRealTimers());
describe("writing recovery", () => {
  it("retries returned transient errors three times with visible backoff", async () => {
    vi.useFakeTimers();
    const request = vi.fn().mockResolvedValue({ text: "", error: "Busy", retryable: true });
    const status = vi.fn();
    const result = requestWithRetry(request, () => true, status);
    await vi.runAllTimersAsync();
    expect((await result)?.error).toBe("Busy");
    expect(request).toHaveBeenCalledTimes(4);
    expect(status).toHaveBeenCalledWith({ attempt: 3, seconds: 16 });
  });
  it("recovers a thrown transport error without repeating successful work", async () => {
    vi.useFakeTimers();
    const request = vi.fn().mockRejectedValueOnce(new Error("Network")).mockResolvedValue({ text: "Recovered", error: "" });
    const result = requestWithRetry(request, () => true, vi.fn());
    await vi.runAllTimersAsync();
    expect((await result)?.text).toBe("Recovered");
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("does not retry terminal errors", async () => {
    const request = vi.fn().mockResolvedValue({ text: "", error: "Access denied", retryable: false });
    await requestWithRetry(request, () => true, vi.fn());
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("stops during backoff before making another request", async () => {
    vi.useFakeTimers();
    let active = true;
    const request = vi.fn().mockResolvedValue({ text: "", error: "Busy", retryable: true });
    const result = requestWithRetry(request, () => active, (status) => { if (status) active = false; });
    await vi.runAllTimersAsync();
    expect(await result).toBeNull();
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("honors the service retry-after interval", async () => {
    vi.useFakeTimers();
    const request = vi.fn().mockResolvedValueOnce({ text: "", error: "Busy", retryable: true, retryAfterMs: 20000 }).mockResolvedValue({ text: "Done", error: "" });
    const status = vi.fn();
    const result = requestWithRetry(request, () => true, status);
    await vi.advanceTimersByTimeAsync(19000);
    expect(request).toHaveBeenCalledTimes(1);
    await vi.runAllTimersAsync();
    expect((await result)?.text).toBe("Done");
    expect(status).toHaveBeenCalledWith({ attempt: 1, seconds: 20 });
  });
});