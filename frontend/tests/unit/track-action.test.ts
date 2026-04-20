import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
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

import {
  deleteTrackAction,
  publishTrackAction,
  unpublishTrackAction,
} from "@/lib/server/actions/track";
import { serverFetch } from "@/lib/server/api";

beforeEach(() => vi.clearAllMocks());

describe("deleteTrackAction", () => {
  it("DELETE /api/tracks/:id 成功", async () => {
    vi.mocked(serverFetch).mockResolvedValueOnce({ id: "t1" });
    const r = await deleteTrackAction("t1");
    expect(r).toMatchObject({ ok: true });
    expect(serverFetch).toHaveBeenCalledWith(
      "/api/tracks/t1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("backend 錯 → ok: false", async () => {
    vi.mocked(serverFetch).mockRejectedValueOnce(new Error("Not your track"));
    const r = await deleteTrackAction("t1");
    expect(r).toMatchObject({ ok: false, error: "Not your track" });
  });
});

describe("publishTrackAction", () => {
  it("publish → POST /:id/publish 回 isPublic=true", async () => {
    vi.mocked(serverFetch).mockResolvedValueOnce({
      id: "t1",
      is_public: true,
      published_at: "2026-01-01",
    });
    const r = await publishTrackAction("t1");
    expect(r).toMatchObject({ ok: true });
    if (r.ok) {
      expect(r.data.isPublic).toBe(true);
      expect(r.data.publishedAt).toBe("2026-01-01");
    }
  });

  it("backend 403 → 回 error", async () => {
    vi.mocked(serverFetch).mockRejectedValueOnce(new Error("Not your track"));
    const r = await publishTrackAction("t1");
    expect(r).toMatchObject({ ok: false });
  });
});

describe("unpublishTrackAction", () => {
  it("unpublish → POST /:id/unpublish 回 isPublic=false", async () => {
    vi.mocked(serverFetch).mockResolvedValueOnce({
      id: "t1",
      is_public: false,
      published_at: null,
    });
    const r = await unpublishTrackAction("t1");
    expect(r).toMatchObject({ ok: true });
    if (r.ok) {
      expect(r.data.isPublic).toBe(false);
      expect(r.data.publishedAt).toBeNull();
    }
  });
});
