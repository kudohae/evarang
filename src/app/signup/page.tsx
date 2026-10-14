import type { Metadata } from "next";
import { Suspense } from "react";
import { AccessGate } from "@/components/AccessGate";
import { SignupForm } from "@/components/account/SignupForm";

export const metadata: Metadata = { title: "가입 — 에바랑" };

export default function Page() {
  return (
    <AccessGate>
      <Suspense>
        <SignupForm />
      </Suspense>
    </AccessGate>
  );
}
