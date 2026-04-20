import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

const cookieStore = vi.hoisted(() => ({
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

const fetchMock = vi.hoisted(() => vi.fn());
vi.stubGlobal("fetch", fetchMock);

import { loginAction, signupAction, logoutAction } from "@/lib/server/actions/auth";

function makeResponse(ok: boolean, body: unknown) {
  return {
    ok,
    status: ok ? 200 : 400,
    statusText: ok ? "OK" : "Bad Request",
    json: async () => body,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loginAction", () => {
  it("zod 失敗 → fieldErrors，不打 backend", async () => {
    const fd = new FormData();
    fd.set("email", "not-email");
    fd.set("password", "short");
    const r = await loginAction(null, fd);
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.fieldErrors).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("成功 → set cookies + redirect /app/dashboard", async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse(true, {
        access_token: "a1",
        refresh_token: "r1",
        expires_in: 3600,
        user_id: "u1",
        email: "a@b.com",
      }),
    );
    const fd = new FormData();
    fd.set("email", "a@b.com");
    fd.set("password", "12345678");
    await expect(loginAction(null, fd)).rejects.toThrow("REDIRECT:/app/dashboard");
    expect(cookieStore.set).toHaveBeenCalledWith(
      "mu_access",
      "a1",
      expect.objectContaining({ httpOnly: true }),
    );
    expect(cookieStore.set).toHaveBeenCalledWith(
      "mu_refresh",
      "r1",
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it("Backend 錯 → 回 ok:false + error", async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse(false, { detail: "Invalid credentials" }),
    );
    const fd = new FormData();
    fd.set("email", "a@b.com");
    fd.set("password", "12345678");
    const r = await loginAction(null, fd);
    expect(r).toMatchObject({ ok: false, error: "Invalid credentials" });
  });
});

describe("signupAction", () => {
  it("成功 → redirect", async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse(true, {
        access_token: "a1",
        refresh_token: "r1",
        expires_in: 3600,
        user_id: "u1",
        email: "b@c.com",
      }),
    );
    const fd = new FormData();
    fd.set("email", "b@c.com");
    fd.set("password", "12345678");
    fd.set("full_name", "Rudy");
    await expect(signupAction(null, fd)).rejects.toThrow("REDIRECT:/app/dashboard");
  });
});

describe("logoutAction", () => {
  it("清 cookies + redirect /", async () => {
    cookieStore.get.mockReturnValueOnce({ value: "a1" });
    fetchMock.mockResolvedValueOnce(makeResponse(true, { ok: true }));
    await expect(logoutAction()).rejects.toThrow("REDIRECT:/");
    expect(cookieStore.delete).toHaveBeenCalledWith("mu_access");
    expect(cookieStore.delete).toHaveBeenCalledWith("mu_refresh");
  });
});
