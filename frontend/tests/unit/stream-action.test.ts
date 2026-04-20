import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/api", () => ({
  serverFetch: vi.fn(),
  ApiError: class extends Error {
    status: number;
    constructor(msg: string, status: number) {
      super(msg);
      this.status = status;
    }
  },
  asActionResult: async <T>(fn: () => Promise<T>) => {
    try {
      return { ok: true as const, data: await fn() };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "error" };
    }
  },
}));

import { getStreamUrlAction } from "@/lib/server/actions/stream";
import { serverFetch } from "@/lib/server/api";

beforeEach(() => vi.clearAllMocks());

describe("getStreamUrlAction", () => {
  it("seed → GET /api/stream/seed/:id", async () => {
    vi.mocked(serverFetch).mockResolvedValueOnce({
      url: "https://sup/signed?token=x",
      expires_in: 3600,
    });
    const r = await getStreamUrlAction("seed", "focus_seed_1");
    expect(r).toMatchObject({ ok: true });
    if (r.ok) {
      expect(r.data.url).toContain("signed");
      expect(r.data.expiresIn).toBe(3600);
    }
    expect(serverFetch).toHaveBeenCalledWith("/api/stream/seed/focus_seed_1");
  });

  it("track → GET /api/stream/track/:id", async () => {
    vi.mocked(serverFetch).mockResolvedValueOnce({
      url: "https://sup/signed",
      expires_in: 3600,
    });
    const r = await getStreamUrlAction("track", "t1");
    expect(r).toMatchObject({ ok: true });
    expect(serverFetch).toHaveBeenCalledWith("/api/stream/track/t1");
  });

  it("403 → ok: false", async () => {
    vi.mocked(serverFetch).mockRejectedValueOnce(new Error("Not authorized"));
    const r = await getStreamUrlAction("track", "t1");
    expect(r).toMatchObject({ ok: false, error: "Not authorized" });
  });
});
