export type Mood = {
  key: string;
  label: string;
  description: string;
};

export type Track = {
  id: string;
  title: string;
  mood: string;
  prompt: string;
  stream_url: string;
  duration_sec: number;
  source: string;
  created_at: string;
};

export type User = {
  id: string;
  email: string;
  created_at: string;
};

export type Profile = {
  user_id: string;
  full_name: string;
  onboarding_complete: boolean;
  preferred_mood: string;
  daily_focus_minutes: number;
  background_volume: number;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type FocusSessionStatus = "active" | "completed" | "abandoned";

export type FocusSession = {
  id: string;
  user_id: string;
  title: string;
  mood: string;
  duration_minutes: number;
  prompt: string;
  status: FocusSessionStatus;
  started_at: string;
  completed_at: string | null;
};

export type GenerationJob = {
  job_id: string;
  user_id: string;
  mood: string;
  prompt: string;
  prompt_normalized: string;
  model: string;
  status: string;
  duration_sec: number;
  created_at: string;
  completed_at: string | null;
  track: Track | null;
};

export type StartPlaybackResponse = {
  session_id: string;
  track: Track;
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
