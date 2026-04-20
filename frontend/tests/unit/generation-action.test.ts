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
  createGenerationJobAction,
  pollGenerationJobAction,
} from "@/lib/server/actions/generation";
import { serverFetch } from "@/lib/server/api";

beforeEach(() => vi.clearAllMocks());

describe("createGenerationJobAction", () => {
  it("zod 失敗", async () => {
    const r = await createGenerationJobAction({ mood: "x", prompt: "", duration_sec: 10 });
    expect(r).toMatchObject({ ok: false });
  });

  it("成功 → POST /api/generation/jobs，回 jobId + durationSec", async () => {
    vi.mocked(serverFetch).mockResolvedValueOnce({
      id: "backend-job-1",
      duration_sec: 180,
      status: "pending",
      track: null,
    });
    const r = await createGenerationJobAction({
      mood: "focus",
      prompt: "lofi",
      duration_sec: 180,
    });
    expect(r).toMatchObject({ ok: true });
    if (r.ok) {
      expect(r.data.jobId).toBe("backend-job-1");
      expect(r.data.durationSec).toBe(180);
    }
    expect(serverFetch).toHaveBeenCalledWith(
      "/api/generation/jobs",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("backend 錯誤 → ok: false", async () => {
    vi.mocked(serverFetch).mockRejectedValueOnce(new Error("Provider down"));
    const r = await createGenerationJobAction({ mood: "focus", prompt: "x", duration_sec: 180 });
    expect(r).toMatchObject({ ok: false, error: "Provider down" });
  });
});

describe("pollGenerationJobAction", () => {
  it("pending → 回 pending", async () => {
    vi.mocked(serverFetch).mockResolvedValueOnce({ status: "pending", track: null });
    const r = await pollGenerationJobAction("job-1");
    expect(r).toMatchObject({ ok: true });
    if (r.ok) expect(r.data.status).toBe("pending");
  });

  it("completed → 回 track", async () => {
    vi.mocked(serverFetch).mockResolvedValueOnce({
      status: "completed",
      track: {
        id: "t1",
        title: "T",
        mood: "focus",
        prompt: "p",
        storage_path: "users/u1/t1.mp3",
        duration_sec: 180,
        source: "ace-1.5",
        is_public: false,
        published_at: null,
        created_at: "2026-01-01",
      },
    });
    const r = await pollGenerationJobAction("job-1");
    expect(r).toMatchObject({ ok: true });
    if (r.ok) {
      expect(r.data.status).toBe("completed");
      expect(r.data.track?.storage_path).toBe("users/u1/t1.mp3");
    }
  });

  it("backend error → 回 ok: false", async () => {
    vi.mocked(serverFetch).mockRejectedValueOnce(new Error("404"));
    const r = await pollGenerationJobAction("job-1");
    expect(r).toMatchObject({ ok: false });
  });
});
