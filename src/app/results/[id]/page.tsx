import type { Metadata } from "next";
import { AccessGate } from "@/components/AccessGate";
import { ReportApp } from "@/components/report/ReportApp";

export const metadata: Metadata = { title: "평가 결과 — 에바랑" };

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AccessGate>
      <ReportApp id={id} />
    </AccessGate>
  );
}
