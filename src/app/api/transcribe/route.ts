import { AssemblyAI } from "assemblyai";
import { guard } from "@/lib/server/access";
import type { Transcript } from "@/lib/types";

export const maxDuration = 120;

// Vercel caps request bodies at 4.5 MB; the recorder targets ~48 kbps, so this is ~10 minutes.
const MAX_BYTES = 4_400_000;

let client: AssemblyAI | null = null;

export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  if (!process.env.ASSEMBLYAI_API_KEY) {
    return Response.json({ error: "음성인식 API 키가 서버에 설정되지 않았습니다." }, { status: 500 });
  }

  const audio = Buffer.from(await request.arrayBuffer());
  if (audio.length === 0) return Response.json({ error: "녹음 파일이 비어 있습니다." }, { status: 400 });
  if (audio.length > MAX_BYTES) return Response.json({ error: "녹음 파일이 너무 큽니다." }, { status: 413 });

  client ??= new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
  try {
    const t = await client.transcripts.transcribe({
      audio,
      speech_models: ["universal-3-5-pro", "universal-2"],
      language_code: "en",
      // Keep um / uh / hmm in the transcript; they are evidence for the fluency read.
      disfluencies: true,
      punctuate: true,
      format_text: true,
    });
    if (t.status === "error") {
      // AssemblyAI reports silent audio as an error; treat it as an empty answer.
      if (/no spoken audio|does not appear to contain audio/i.test(t.error ?? "")) {
        return Response.json({ text: "", words: [], audioSeconds: 0 } satisfies Transcript);
      }
      return Response.json({ error: `음성인식 실패: ${t.error}` }, { status: 502 });
    }
    const body: Transcript = {
      text: t.text ?? "",
      words: (t.words ?? []).map((w) => ({ text: w.text, start: w.start, end: w.end, confidence: w.confidence })),
      audioSeconds: t.audio_duration ?? 0,
    };
    return Response.json(body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: `음성인식 서버에 연결하지 못했습니다: ${msg.slice(0, 200)}` }, { status: 502 });
  }
}
