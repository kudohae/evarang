import { GoogleGenAI } from "@google/genai";

// 3.8 Flash kept every filler in testing; Flash-Lite dropped the occasional "hmm" but has a larger free quota.
const MODELS = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];

const PROMPT = `Transcribe this English speech verbatim.
Keep every filler (um, uh, er, hmm), false start, repetition, self-correction and grammar mistake exactly as spoken. Do not correct, complete or tidy anything.
Use normal punctuation. Output only the transcript. If there is no speech, output nothing.`;

let client: GoogleGenAI | null = null;

export function geminiSttConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function geminiTranscribe(audio: Buffer, mimeType: string): Promise<string> {
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  let last: unknown;
  for (const model of MODELS) {
    try {
      const res = await client.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [{ inlineData: { mimeType: mimeType.split(";")[0] || "audio/webm", data: audio.toString("base64") } }, { text: PROMPT }],
          },
        ],
      });
      return (res.text ?? "").trim();
    } catch (e) {
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}
