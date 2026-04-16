import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: () => undefined })) }));
vi.mock("@/lib/server/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/api")>("@/lib/server/api");
  return { ...actual, serverFetch: vi.fn() };
});

import { createGenerationJobAction } from "@/lib/server/actions/generation";
import { serverFetch } from "@/lib/server/api";
import { revalidatePath } from "next/cache";

beforeEach(() => vi.clearAllMocks());

describe("createGenerationJobAction", () => {
  it("zod 失敗回 fieldErrors", async () => {
    const r = await createGenerationJobAction({
      mood: "x", prompt: "", duration_sec: 10,
    });
    expect(r).toMatchObject({ ok: false });
  });

  it("成功時 revalidate /app/library + /app/dashboard 並回 track", async () => {
    const fakeJob = {
      job_id: "j1", user_id: "u1", mood: "focus", prompt: "p",
      prompt_normalized: "n", model: "ace-1.5", status: "completed",
      duration_sec: 180, created_at: "2026-01-01", completed_at: "2026-01-01",
      track: { id: "t1", title: "T", mood: "focus", prompt: "p", stream_url: "u",
               duration_sec: 180, source: "ace-1.5", created_at: "2026-01-01" },
    };
    vi.mocked(serverFetch).mockResolvedValueOnce(fakeJob);
    const r = await createGenerationJobAction({
      mood: "focus", prompt: "lofi", duration_sec: 180,
    });
    expect(r).toMatchObject({ ok: true });
    if (r.ok) expect(r.data.track?.id).toBe("t1");
    expect(revalidatePath).toHaveBeenCalledWith("/app/library");
    expect(revalidatePath).toHaveBeenCalledWith("/app/dashboard");
  });

  it("backend 失敗回 error", async () => {
    vi.mocked(serverFetch).mockRejectedValueOnce(new Error("Provider down"));
    const r = await createGenerationJobAction({
      mood: "focus", prompt: "lofi", duration_sec: 180,
    });
    expect(r).toMatchObject({ ok: false, error: "Provider down" });
  });
});
