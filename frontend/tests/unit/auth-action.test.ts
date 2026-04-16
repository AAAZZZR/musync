import { describe, it, expect, vi, beforeEach } from "vitest";

// 自動 mock；redirect 必須 throw 才能模擬 Next 真實行為
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
}));

const cookieStore = { set: vi.fn(), get: vi.fn(), delete: vi.fn() };
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

vi.mock("@/lib/server/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/api")>("@/lib/server/api");
  return {
    ...actual,
    serverFetch: vi.fn(),
  };
});

import { loginAction, signupAction } from "@/lib/server/actions/auth";
import { serverFetch } from "@/lib/server/api";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loginAction", () => {
  it("zod 失敗回 fieldErrors，不打 backend", async () => {
    const formData = new FormData();
    formData.set("email", "not-email");
    formData.set("password", "short");
    const result = await loginAction(null, formData);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.fieldErrors).toBeDefined();
    expect(serverFetch).not.toHaveBeenCalled();
  });

  it("成功時設 cookie 並 redirect /app/dashboard", async () => {
    vi.mocked(serverFetch).mockResolvedValueOnce({
      access_token: "tok_x",
      token_type: "bearer",
      user: { id: "u1", email: "a@b.com", created_at: "2026-01-01" },
    });

    const formData = new FormData();
    formData.set("email", "a@b.com");
    formData.set("password", "12345678");

    await expect(loginAction(null, formData)).rejects.toThrow("REDIRECT:/app/dashboard");
    expect(cookieStore.set).toHaveBeenCalledWith(
      "musync_token", "tok_x",
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" })
    );
  });

  it("backend 401 回 ok:false + error", async () => {
    vi.mocked(serverFetch).mockRejectedValueOnce(new Error("Invalid credentials"));
    const formData = new FormData();
    formData.set("email", "a@b.com");
    formData.set("password", "12345678");
    const result = await loginAction(null, formData);
    expect(result).toMatchObject({ ok: false, error: "Invalid credentials" });
  });
});

describe("signupAction", () => {
  it("成功時設 cookie 並 redirect", async () => {
    vi.mocked(serverFetch).mockResolvedValueOnce({
      access_token: "tok_y",
      token_type: "bearer",
      user: { id: "u2", email: "b@c.com", created_at: "2026-01-01" },
    });
    const formData = new FormData();
    formData.set("email", "b@c.com");
    formData.set("password", "12345678");
    formData.set("full_name", "Rudy");
    await expect(signupAction(null, formData)).rejects.toThrow("REDIRECT:/app/dashboard");
    expect(cookieStore.set).toHaveBeenCalled();
  });
});
