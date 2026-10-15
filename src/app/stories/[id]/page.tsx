import type { Metadata } from "next";
import { AccessGate } from "@/components/AccessGate";
import { StoryView } from "@/components/practice/StoryView";

export const metadata: Metadata = { title: "이야기 — 에바랑" };

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AccessGate>
      <StoryView id={id} />
    </AccessGate>
  );
}
