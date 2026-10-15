import type { Metadata } from "next";
import { AccessGate } from "@/components/AccessGate";
import { NotesApp } from "@/components/practice/NotesApp";

export const metadata: Metadata = { title: "첨삭노트 — 에바랑" };

export default function NotesPage() {
  return (
    <AccessGate>
      <NotesApp />
    </AccessGate>
  );
}
