"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";
import { VERSION, APP_NAME, APP_TAGLINE } from "@/lib/version";

export default function AboutDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-slate hover:text-burgundy transition-colors"
        title="About Vectorscope"
      >
        <Info className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setOpen(false)}>
          <div
            className="bg-ivory border border-parchment-dark rounded-lg shadow-editorial-lg max-w-sm w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-display text-display-md">{APP_NAME}</h2>
                <p className="font-sans text-caption text-slate mt-0.5">{APP_TAGLINE}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate hover:text-burgundy">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 font-sans text-caption text-slate">
              <div className="flex justify-between">
                <span>Version</span>
                <span className="font-mono">{VERSION}</span>
              </div>
              <div className="flex justify-between">
                <span>Author</span>
                <span>David M. Berry</span>
              </div>
              <div className="flex justify-between">
                <span>Affiliation</span>
                <span>University of Sussex</span>
              </div>
              <div className="flex justify-between">
                <span>Licence</span>
                <span>MIT</span>
              </div>
            </div>

            <hr className="my-4 border-parchment-dark" />

            <div className="font-sans text-caption text-slate space-y-2">
              <p>
                Part of the <strong>Vector Lab</strong>, a family of research instruments for the critical study of AI vector media.
              </p>
              <p className="text-xs">
                Companion tools: Manifold Atlas (comparative embedding geometry), LLMbench (comparative close reading of LLM outputs).
              </p>
            </div>

            <hr className="my-4 border-parchment-dark" />

            <div className="font-sans text-caption text-slate">
              <a
                href="https://github.com/dmberry/vectorscope"
                target="_blank"
                rel="noopener noreferrer"
                className="text-burgundy hover:underline"
              >
                github.com/dmberry/vectorscope
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
