"use client";

import { ModelProvider } from "@/context/ModelContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <ModelProvider>{children}</ModelProvider>;
}
