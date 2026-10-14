import { AssemblyAI } from "assemblyai";
import { apiError } from "@/lib/server/api-error";
import { guard } from "@/lib/server/access";
import { geminiSttConfigured, geminiTranscribe } from "@/lib/server/gemini-stt";
import type { FallbackReason, TranscribeResponse } from "@/lib/types";

export const maxDuration = 120;

// Vercel caps request bodies at 4.5 MB; the recorder targets ~48 kbps, so this is ~10 minutes.
const MAX_BYTES = 4_400_000;

// The SDK only surfaces the error text, so credit exhaustion is recognised by wording.
const CREDIT_WORDS = /balance|credit|insufficient|payment|billing|top[\s-]?up|upgrade|quota|free (tier|trial)|paid plan|limit (reached|exceeded)/i;
const SILENT = /no spoken audio|does not appear to contain audio/i;

let client: AssemblyAI | null = null;
// Once credits are gone, skip the doomed AssemblyAI round trip for a while.
let skipPrimaryUntil = 0;

class PrimaryFailed extends Error {
  constructor(readonly reason: FallbackReason, message: string) {
    super(message);
  }
}

async function assembly(audio: Buffer): Promise<TranscribeResponse> {
  if (!process.env.ASSEMBLYAI_API_KEY) throw new PrimaryFailed("unavailable", "no key");
  if (Date.now() < skipPrimaryUntil) throw new PrimaryFailed("credits", "skipped after earlier credit error");
  client ??= new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
  let t;
  try {
    t = await client.transcripts.transcribe({
      audio,
      speech_models: ["universal-3-5-pro", "universal-2"],
      language_code: "en",
      // Keep um / uh / hmm in the transcript; they are evidence for the fluency read.
      disfluencies: true,
      punctuate: true,
      format_text: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new PrimaryFailed(CREDIT_WORDS.test(msg) ? "credits" : "unavailable", msg);
  }
  if (t.status === "error") {
    if (SILENT.test(t.error ?? "")) return { text: "", words: [], audioSeconds: 0, engine: "assemblyai" };
    throw new PrimaryFailed(CREDIT_WORDS.test(t.error ?? "") ? "credits" : "unavailable", t.error ?? "");
  }
  return {
    text: t.text ?? "",
    words: (t.words ?? []).map((w) => ({ text: w.text, start: w.start, end: w.end, confidence: w.confidence })),
    audioSeconds: t.audio_duration ?? 0,
    engine: "assemblyai",
  };
}

export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;

  const audio = Buffer.from(await request.arrayBuffer());
  if (audio.length === 0) return apiError(400, "녹음 파일이 비어 있습니다.", { kind: "invalid" });
  if (audio.length > MAX_BYTES) return apiError(413, "녹음 파일이 너무 큽니다.", { kind: "invalid" });

  try {
    return Response.json(await assembly(audio));
  } catch (e) {
    if (!(e instanceof PrimaryFailed)) throw e;
    if (e.reason === "credits") skipPrimaryUntil = Date.now() + 10 * 60 * 1000;
    console.warn(`AssemblyAI failed (${e.reason}): ${e.message}`);
    if (!geminiSttConfigured()) {
      return apiError(502, e.reason === "credits" ? "음성인식 이용 한도를 모두 썼고, 보조 음성인식도 설정되어 있지 않습니다." : `음성인식에 실패했습니다: ${e.message.slice(0, 200)}`);
    }
    try {
      const text = await geminiTranscribe(audio, request.headers.get("content-type") ?? "audio/webm");
      // Gemini returns no word timings; the browser estimates them from the recording's loudness.
      const body: TranscribeResponse = { text, words: [], audioSeconds: 0, engine: "gemini", approxTiming: true, fallback: e.reason };
      return Response.json(body);
    } catch (g) {
      const msg = g instanceof Error ? g.message : String(g);
      return apiError(502, `음성인식과 보조 음성인식이 모두 실패했습니다: ${msg.slice(0, 200)}`);
    }
  }
}
