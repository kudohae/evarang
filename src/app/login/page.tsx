import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessGate } from "@/components/AccessGate";
import { LoginForm } from "@/components/account/LoginForm";

export const metadata: Metadata = { title: "로그인 — 에바랑" };

export default function Page() {
  return (
    <AccessGate>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AccessGate>
  );
}
