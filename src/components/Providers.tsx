"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/Toast";
import { MicrophoneProvider } from "@/lib/capture/useMicrophone";

/** Site-wide client state that outlives a page: the microphone and the toasts. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <MicrophoneProvider>
      <ToastProvider>{children}</ToastProvider>
    </MicrophoneProvider>
  );
}
