import type { SeedTrack, Track } from "@/types/api";

/**
 * Seed → Track adapter。Seed 是共享資源，所以 profile_id 為空。
 * 前端播放器把兩者都當 Track 處理（用 source 區分）。
 */
export function seedToTrack(s: SeedTrack): Track {
  return {
    id: s.id,
    profile_id: "",
    title: s.title,
    mood: s.mood,
    prompt: s.prompt,
    storage_path: s.storage_path,
    duration_sec: s.duration_sec,
    source: "seed",
    is_public: true,
    published_at: null,
    created_at: new Date().toISOString(),
  };
}
