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
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/vector-lab.svg"
                  alt=""
                  width={40}
                  height={40}
                  className="mt-1 shrink-0"
                />
                <div>
                  <h2 className="font-display text-display-md">{APP_NAME}</h2>
                  <p className="font-sans text-caption text-slate mt-0.5">{APP_TAGLINE}</p>
                  <p className="font-sans text-caption text-slate/70 mt-1">
                    Part of the{" "}
                    <a
                      href="https://vector-lab-tools.github.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-burgundy hover:underline"
                    >
                      Vector Lab
                    </a>
                  </p>
                </div>
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
                The{" "}
                <a
                  href="https://vector-lab-tools.github.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-burgundy hover:underline"
                >
                  Vector Lab
                </a>{" "}
                is a family of research instruments for vector methods on vector theory.
              </p>
              <p className="text-xs">
                Sibling instruments:{" "}
                <a href="https://github.com/vector-lab-tools/manifoldscope" target="_blank" rel="noopener noreferrer" className="hover:underline">Manifoldscope</a>,{" "}
                <a href="https://github.com/vector-lab-tools/theoryscope" target="_blank" rel="noopener noreferrer" className="hover:underline">Theoryscope</a>,{" "}
                <a href="https://github.com/vector-lab-tools/manifold-atlas" target="_blank" rel="noopener noreferrer" className="hover:underline">Manifold Atlas</a>,{" "}
                <a href="https://github.com/vector-lab-tools/LLMbench" target="_blank" rel="noopener noreferrer" className="hover:underline">LLMbench</a>.
              </p>
            </div>

            <hr className="my-4 border-parchment-dark" />

            <div className="font-sans text-caption text-slate">
              <a
                href="https://github.com/vector-lab-tools/vectorscope"
                target="_blank"
                rel="noopener noreferrer"
                className="text-burgundy hover:underline"
              >
                github.com/vector-lab-tools/vectorscope
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
