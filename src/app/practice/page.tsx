import type { Metadata } from "next";
import { AccessGate } from "@/components/AccessGate";
import { PracticeApp } from "@/components/practice/PracticeApp";

export const metadata: Metadata = { title: "맞춤형 연습 — 에바랑" };

export default function PracticePage() {
  return (
    <AccessGate>
      <PracticeApp />
    </AccessGate>
  );
}
