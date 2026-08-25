import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  customFetch,
  setAuthTokenGetter,
} from "../../../../lib/api-client-react/src/custom-fetch";

function response(
  status: number,
  body: unknown,
  headers: Record<string, string> = { "content-type": "application/json" },
): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers,
  });
}

describe("customFetch Clerk token handling", () => {
  beforeEach(() => {
    setAuthTokenGetter(null);
  });

  afterEach(() => {
    setAuthTokenGetter(null);
    vi.unstubAllGlobals();
  });

  it("normalizes token getter failures as authentication errors", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    setAuthTokenGetter(vi.fn().mockRejectedValue(new Error("session is still loading")));

    const error = await customFetch("/api/inbox").catch((cause) => cause);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 401,
      message: "HTTP 401 Unauthorized: Clerk token unavailable",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes the Clerk token once after a 401 and retries successfully", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(401, { error: "Unauthorized" }))
      .mockResolvedValueOnce(response(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const getToken = vi.fn((options?: { skipCache?: boolean }) =>
      Promise.resolve(options?.skipCache ? "fresh-token" : "stale-token"),
    );
    setAuthTokenGetter(getToken);

    await expect(customFetch<{ ok: boolean }>("/api/inbox")).resolves.toEqual({
      ok: true,
    });

    expect(getToken).toHaveBeenNthCalledWith(1);
    expect(getToken).toHaveBeenNthCalledWith(2, { skipCache: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryHeaders = (fetchMock.mock.calls[1]?.[1] as RequestInit)
      .headers as Headers;
    expect(retryHeaders.get("authorization")).toBe("Bearer fresh-token");
  });

  it("surfaces the second 401 after exactly one refresh attempt", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(401, { error: "Unauthorized" }))
      .mockResolvedValueOnce(response(401, { error: "Still unauthorized" }));
    vi.stubGlobal("fetch", fetchMock);
    const getToken = vi
      .fn()
      .mockResolvedValueOnce("stale-token")
      .mockResolvedValueOnce("fresh-token");
    setAuthTokenGetter(getToken);

    const error = await customFetch("/api/inbox").catch((cause) => cause);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getToken).toHaveBeenCalledTimes(2);
  });

  it("leaves network failures as their original errors", async () => {
    const networkError = new TypeError("Failed to fetch");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(networkError));

    await expect(customFetch("/api/inbox")).rejects.toBe(networkError);
  });
});