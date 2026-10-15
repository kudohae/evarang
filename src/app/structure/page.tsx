import type { Metadata } from "next";
import { AccessGate } from "@/components/AccessGate";
import { StructureApp } from "@/components/practice/StructureApp";

export const metadata: Metadata = { title: "문장 구조화 연습 — 에바랑" };

export default function StructurePage() {
  return (
    <AccessGate>
      <StructureApp />
    </AccessGate>
  );
}
