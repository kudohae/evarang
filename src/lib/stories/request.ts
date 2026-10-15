"use client";

import { postFeedback, runOnLadder } from "@/lib/feedback/ladder";
import type { StoryContent, StoryRequest } from "@/lib/stories/schema";

/** Creates a story on the model ladder (the member's own key first). */
export async function generateStory(req: Omit<StoryRequest, "model">, available: string[]): Promise<{ story: StoryContent; modelId: string }> {
  return runOnLadder(available, "full", async (modelId, mayHandOff) => {
    const res = await postFeedback<{ story: StoryContent }>("/api/stories/generate", { ...req, model: modelId }, () => mayHandOff);
    return { story: res.story, modelId };
  });
}
