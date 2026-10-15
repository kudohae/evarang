import type { Metadata } from "next";
import { AccessGate } from "@/components/AccessGate";
import { StoriesApp } from "@/components/practice/StoriesApp";

export const metadata: Metadata = { title: "스토리뱅크 — 에바랑" };

export default function StoriesPage() {
  return (
    <AccessGate>
      <StoriesApp />
    </AccessGate>
  );
}
