import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/server/actions/generation", () => ({
  createGenerationJobAction: vi.fn(async () => ({
    ok: true,
    data: {
      track: {
        id: "t1",
        title: "Generated",
        mood: "focus",
        prompt: "p",
        stream_url: "u",
        duration_sec: 180,
        source: "ace-1.5",
        created_at: "2026-01-01",
      },
    },
  })),
}));
vi.mock("@/lib/server/actions/focus-session", () => ({
  createFocusSessionAction: vi.fn(async () => ({ ok: true, data: { id: "s1" } })),
}));
vi.mock("@/lib/server/actions/playback", () => ({
  startPlaybackAction: vi.fn(async () => ({ ok: true, data: { session_id: "ps1", track: {} } })),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/stores/player-store", () => ({
  usePlayerStore: { getState: () => ({ playTrack: vi.fn(), setPlaybackSession: vi.fn() }) },
}));

import { ComposerForm } from "@/components/features/composer/composer-form";
import { createGenerationJobAction } from "@/lib/server/actions/generation";

const moods = [{ key: "focus", label: "Focus", description: "x" }];

beforeEach(() => vi.clearAllMocks());

describe("ComposerForm", () => {
  it("送出 generate 時呼叫 createGenerationJobAction", async () => {
    const user = userEvent.setup();
    render(<ComposerForm moods={moods} defaultMood="focus" />);
    await user.type(screen.getByLabelText(/prompt/i), "lofi piano");
    await user.click(screen.getByRole("button", { name: /generate/i }));
    expect(createGenerationJobAction).toHaveBeenCalledWith(
      expect.objectContaining({ mood: "focus", prompt: expect.stringContaining("lofi") }),
    );
  });
});
