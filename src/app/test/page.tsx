import type { Metadata } from "next";
import { AccessGate } from "@/components/AccessGate";
import { ExamApp } from "@/components/exam/ExamApp";

export const metadata: Metadata = { title: "시험 — 에바랑" };

export default function TestPage() {
  return (
    <AccessGate>
      <ExamApp />
    </AccessGate>
  );
}
