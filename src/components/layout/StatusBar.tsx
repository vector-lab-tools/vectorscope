"use client";

import { useModel } from "@/context/ModelContext";
import { HardDrive } from "lucide-react";

export default function StatusBar() {
  const { backendStatus } = useModel();

  return (
    <footer className="border-t border-parchment-dark bg-card px-6 py-2 flex items-center justify-between">
      <div className="flex items-center gap-4 font-sans text-caption text-slate">
        {backendStatus.model && (
          <>
            <span>
              {backendStatus.model.architecture} | {backendStatus.model.numLayers} layers |{" "}
              {backendStatus.model.hiddenSize}d | {backendStatus.model.vocabSize.toLocaleString()} tokens
            </span>
            <span className="text-parchment-dark">|</span>
            <span>
              {backendStatus.model.dtype} | {backendStatus.model.weightTied ? "weight-tied" : "separate lm_head"}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 font-sans text-caption text-slate">
        <HardDrive className="w-3 h-3" />
        <span>{Math.round(backendStatus.availableMemoryMb / 1024 * 10) / 10} GB free</span>
      </div>
    </footer>
  );
}
