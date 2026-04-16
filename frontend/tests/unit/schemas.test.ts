import { describe, it, expect } from "vitest";
import {
  loginSchema,
  signupSchema,
  composerSchema,
  profileUpdateSchema,
} from "@/lib/validation/schemas";

describe("loginSchema", () => {
  it("接受合法 email + 密碼", () => {
    const result = loginSchema.safeParse({ email: "a@b.com", password: "12345678" });
    expect(result.success).toBe(true);
  });

  it("拒絕無效 email", () => {
    const result = loginSchema.safeParse({ email: "not-email", password: "12345678" });
    expect(result.success).toBe(false);
  });

  it("拒絕短密碼", () => {
    const result = loginSchema.safeParse({ email: "a@b.com", password: "short" });
    expect(result.success).toBe(false);
  });
});

describe("signupSchema", () => {
  it("接受合法 signup", () => {
    const r = signupSchema.safeParse({
      email: "a@b.com",
      password: "12345678",
      full_name: "Rudy",
    });
    expect(r.success).toBe(true);
  });

  it("拒絕過短 full_name", () => {
    const r = signupSchema.safeParse({ email: "a@b.com", password: "12345678", full_name: "R" });
    expect(r.success).toBe(false);
  });
});

describe("composerSchema", () => {
  it("接受合法 composer", () => {
    const r = composerSchema.safeParse({
      title: "Deep work",
      mood: "focus",
      duration_minutes: 50,
      prompt: "lofi piano",
    });
    expect(r.success).toBe(true);
  });

  it("拒絕 duration < 5", () => {
    const r = composerSchema.safeParse({
      title: "Deep work",
      mood: "focus",
      duration_minutes: 4,
      prompt: "lofi",
    });
    expect(r.success).toBe(false);
  });

  it("拒絕 duration > 180", () => {
    const r = composerSchema.safeParse({
      title: "Deep work",
      mood: "focus",
      duration_minutes: 181,
      prompt: "lofi",
    });
    expect(r.success).toBe(false);
  });
});

describe("profileUpdateSchema", () => {
  it("接受空物件（全部 optional）", () => {
    const r = profileUpdateSchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it("拒絕 background_volume > 100", () => {
    const r = profileUpdateSchema.safeParse({ background_volume: 101 });
    expect(r.success).toBe(false);
  });
});
