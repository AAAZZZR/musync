import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "u1", email: "a@b.com", user_metadata: { full_name: "Test" } } },
      })),
      getSession: vi.fn(async () => ({
        data: { session: { access_token: "fake-token" } },
      })),
    },
  })),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: {
      findUnique: vi.fn(async () => ({ id: "p1", userId: "u1", email: "a@b.com" })),
    },
    track: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => ({
        id: "t1",
        title: args.data.title,
        mood: args.data.mood,
        prompt: args.data.prompt,
        streamUrl: args.data.streamUrl,
        durationSec: args.data.durationSec,
        source: args.data.source,
        createdAt: new Date(),
      })),
    },
    generationJob: {
      create: vi.fn(async () => ({ id: "j1" })),
    },
  },
}));
vi.mock("@/lib/server/api", () => ({
  serverFetch: vi.fn(),
  ApiError: class extends Error {
    status: number;
    constructor(msg: string, status: number) {
      super(msg);
      this.status = status;
    }
  },
}));

import { createGenerationJobAction } from "@/lib/server/actions/generation";
import { serverFetch } from "@/lib/server/api";
import { revalidatePath } from "next/cache";

beforeEach(() => vi.clearAllMocks());

describe("createGenerationJobAction", () => {
  it("zod 失敗回 fieldErrors", async () => {
    const r = await createGenerationJobAction({
      mood: "x",
      prompt: "",
      duration_sec: 10,
    });
    expect(r).toMatchObject({ ok: false });
  });

  it("成功時 revalidate 並回 track", async () => {
    vi.mocked(serverFetch).mockResolvedValueOnce({
      job_id: "j1",
      mood: "focus",
      prompt: "p",
      prompt_normalized: "n",
      model: "ace-1.5",
      status: "completed",
      duration_sec: 180,
      created_at: "2026-01-01",
      completed_at: "2026-01-01",
      track: {
        id: "t1",
        title: "T",
        mood: "focus",
        prompt: "p",
        stream_url: "u",
        duration_sec: 180,
        source: "ace-1.5",
        created_at: "2026-01-01",
      },
    });
    const r = await createGenerationJobAction({
      mood: "focus",
      prompt: "lofi",
      duration_sec: 180,
    });
    expect(r).toMatchObject({ ok: true });
    if (r.ok) expect(r.data.track).not.toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/app/library");
    expect(revalidatePath).toHaveBeenCalledWith("/app/dashboard");
  });

  it("backend 失敗回 error", async () => {
    vi.mocked(serverFetch).mockRejectedValueOnce(new Error("Provider down"));
    const r = await createGenerationJobAction({
      mood: "focus",
      prompt: "lofi",
      duration_sec: 180,
    });
    expect(r).toMatchObject({ ok: false, error: "Provider down" });
  });
});
