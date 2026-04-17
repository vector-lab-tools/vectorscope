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
      <div className="flex items-center gap-4 font-sans text-caption text-slate">
        <div className="flex items-center gap-2">
          <HardDrive className="w-3 h-3" />
          <span>{Math.round(backendStatus.availableMemoryMb / 1024 * 10) / 10} GB free</span>
        </div>
        {/* Vector Lab family mark — small, in the footer, linking home */}
        <a
          href="https://vector-lab-tools.github.io"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-slate/70 hover:text-slate transition-colors"
          title="Part of the Vector Lab"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/vector-lab-mark.svg"
            alt=""
            width={14}
            height={14}
            className="opacity-80"
          />
          <span className="text-[10px]">Vector Lab</span>
        </a>
      </div>
    </footer>
  );
}
