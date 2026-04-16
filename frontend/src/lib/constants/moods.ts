import type { Mood } from "@/types/api";

export const MOODS: Mood[] = [
  { key: "focus", label: "Focus", description: "Deep concentration without vocal clutter" },
  { key: "calm", label: "Calm", description: "Gentle ambient textures for light work" },
  { key: "sleep", label: "Sleep", description: "Low-energy background for winding down" },
  { key: "rainy", label: "Rainy", description: "Rain textures with warm instrumental loops" },
  {
    key: "happy_chill",
    label: "Happy Chill",
    description: "Bright lo-fi energy without distraction",
  },
  {
    key: "night_drive",
    label: "Night Drive",
    description: "Late-night groove with soft momentum",
  },
];

export const MOOD_KEYS = MOODS.map((m) => m.key);

export const PROMPT_BASES: Record<string, string> = {
  focus: "instrumental lofi for concentration",
  calm: "gentle lofi with soft textures",
  sleep: "slow tempo sleepy lofi, no sharp transients",
  rainy: "rain ambience and vinyl noise",
  happy_chill: "warm major-key chill lofi",
  night_drive: "night urban lofi groove",
};

export function normalizePrompt(mood: string, userPrompt: string): string {
  const base = PROMPT_BASES[mood] ?? "instrumental lofi";
  const cleaned = userPrompt.trim().replace(/\s+/g, " ");
  return `${base}; ${cleaned}; no vocal; seamless background loop`;
}
