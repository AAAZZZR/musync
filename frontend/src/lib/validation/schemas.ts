import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  full_name: z.string().min(2).max(80),
});

export const composerSchema = z.object({
  title: z.string().min(2).max(80),
  mood: z.string().min(3).max(30),
  duration_minutes: z.coerce.number().int().min(5).max(180),
  prompt: z.string().min(1).max(180),
});

export const profileUpdateSchema = z.object({
  full_name: z.string().min(2).max(80).optional(),
  preferred_mood: z.string().min(3).max(30).optional(),
  daily_focus_minutes: z.coerce.number().int().min(15).max(480).optional(),
  background_volume: z.coerce.number().int().min(0).max(100).optional(),
  onboarding_complete: z.boolean().optional(),
});

export const generationSchema = z.object({
  mood: z.string().min(3).max(30),
  prompt: z.string().min(1).max(180),
  duration_sec: z.coerce.number().int().min(30).max(900).default(180),
  title: z.string().max(80).optional(),
});

export const focusSessionSchema = z.object({
  title: z.string().min(2).max(80),
  mood: z.string().min(3).max(30),
  duration_minutes: z.coerce.number().int().min(5).max(180),
  prompt: z.string().min(1).max(180),
});

export const playbackStartSchema = z.object({
  mood: z.string().min(3).max(30),
  prompt: z.string().min(1).max(180),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ComposerInput = z.infer<typeof composerSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type GenerationInput = z.infer<typeof generationSchema>;
export type FocusSessionInput = z.infer<typeof focusSessionSchema>;
export type PlaybackStartInput = z.infer<typeof playbackStartSchema>;
