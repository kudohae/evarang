import type { Metadata } from "next";
import { AdminList } from "@/components/admin/AdminList";

export const metadata: Metadata = { title: "관리자 — 에바랑", robots: { index: false } };

export default function AdminPage() {
  return <AdminList />;
}
