import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
    },
  })),
}));

import { loginAction, signupAction } from "@/lib/server/actions/auth";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loginAction", () => {
  it("zod 失敗回 fieldErrors，不打 Supabase", async () => {
    const formData = new FormData();
    formData.set("email", "not-email");
    formData.set("password", "short");
    const result = await loginAction(null, formData);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.fieldErrors).toBeDefined();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("成功時 redirect /app/dashboard", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });
    const formData = new FormData();
    formData.set("email", "a@b.com");
    formData.set("password", "12345678");
    await expect(loginAction(null, formData)).rejects.toThrow("REDIRECT:/app/dashboard");
  });

  it("Supabase error 回 ok:false + error", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      error: { message: "Invalid credentials" },
    });
    const formData = new FormData();
    formData.set("email", "a@b.com");
    formData.set("password", "12345678");
    const result = await loginAction(null, formData);
    expect(result).toMatchObject({ ok: false, error: "Invalid credentials" });
  });
});

describe("signupAction", () => {
  it("成功時 redirect", async () => {
    mockSignUp.mockResolvedValueOnce({ error: null });
    const formData = new FormData();
    formData.set("email", "b@c.com");
    formData.set("password", "12345678");
    formData.set("full_name", "Rudy");
    await expect(signupAction(null, formData)).rejects.toThrow("REDIRECT:/app/dashboard");
  });
});
