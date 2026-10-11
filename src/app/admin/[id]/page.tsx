import type { Metadata } from "next";
import { AdminRecord } from "@/components/admin/AdminRecord";

export const metadata: Metadata = { title: "기록 — 에바랑", robots: { index: false } };

export default async function AdminRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminRecord id={id} />;
}
