import type { Metadata } from "next";
import { AccessGate } from "@/components/AccessGate";
import { SessionView } from "@/components/practice/SessionView";

export const metadata: Metadata = { title: "연습 기록 — 에바랑" };

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AccessGate>
      <SessionView id={id} />
    </AccessGate>
  );
}
