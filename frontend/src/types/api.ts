export type Mood = {
  key: string;
  label: string;
  description: string;
};

export type Track = {
  id: string;
  profile_id: string;
  title: string;
  mood: string;
  prompt: string;
  storage_path: string;
  duration_sec: number;
  source: string;
  is_public: boolean;
  published_at: string | null;
  created_at: string;
};

export type CommunityTrack = Track & { creator: string };

export type SeedTrack = {
  id: string;
  mood: string;
  title: string;
  prompt: string;
  storage_path: string;
  duration_sec: number;
};

export type User = {
  id: string;
  email: string;
  created_at: string;
};

export type Profile = {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  onboarding_complete: boolean;
  preferred_mood: string;
  daily_focus_minutes: number;
  background_volume: number;
  track_limit: number;
  plan: string;
  stripe_customer_id: string | null;
  stripe_current_period_end: string | null;
  created_at: string;
};

export type FocusSessionStatus = "active" | "completed" | "abandoned";

export type FocusSession = {
  id: string;
  profile_id: string;
  title: string;
  mood: string;
  duration_minutes: number;
  prompt: string;
  status: FocusSessionStatus;
  started_at: string;
  completed_at: string | null;
};

export type GenerationJob = {
  id: string;
  profile_id: string;
  mood: string;
  prompt: string;
  prompt_normalized: string;
  model: string;
  status: "pending" | "completed" | "failed";
  duration_sec: number;
  track_id: string | null;
  provider_job_id: string | null;
  ace_task_id: string | null;
  created_at: string;
  completed_at: string | null;
  track: Track | null;
};

export type StartPlaybackResponse = {
  session_id: string;
  track: SeedTrack;
};

export type StreamUrl = {
  url: string;
  expires_in: number;
};

export type BillingUrl = { url: string };

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
