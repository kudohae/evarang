import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessGate } from "@/components/AccessGate";
import { AccountPage } from "@/components/account/AccountPage";

export const metadata: Metadata = { title: "내 정보 — 에바랑" };

export default function Page() {
  return (
    <AccessGate>
      <Suspense>
        <AccountPage />
      </Suspense>
    </AccessGate>
  );
}
