"use client";

import { useState } from "react";
import { HelpCircle, X } from "lucide-react";

export default function HelpDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-slate hover:text-burgundy transition-colors"
        title="Help"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setOpen(false)}>
          <div
            className="bg-ivory border border-parchment-dark rounded-lg shadow-editorial-lg max-w-md w-full mx-4 p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="font-display text-display-md">Help</h2>
              <button onClick={() => setOpen(false)} className="text-slate hover:text-burgundy">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 font-sans text-body-sm text-slate">
              <section>
                <h3 className="font-display text-heading-sm font-semibold mb-2">Getting Started</h3>
                <ol className="list-decimal list-inside space-y-1 text-caption">
                  <li>Start the Python backend (<code className="bg-parchment px-1 rounded">cd backend && python main.py</code>)</li>
                  <li>Load a model from the model selector</li>
                  <li>Choose an operation from the tab groups</li>
                </ol>
              </section>

              <section>
                <h3 className="font-display text-heading-sm font-semibold mb-2">Tab Groups</h3>
                <dl className="space-y-2 text-caption">
                  <div>
                    <dt className="font-semibold">Inspect</dt>
                    <dd className="ml-4">Examine individual weight matrices: embedding table, projection head, weight comparison, attention patterns.</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Trace</dt>
                    <dd className="ml-4">Follow data through the model pipeline: token trajectories, layer probes, full trace, manifold formation.</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Critique</dt>
                    <dd className="ml-4">Theoretical and analytical instruments: vocabulary topology, isotropy analysis, cross-model anatomy, precision degradation.</dd>
                  </div>
                </dl>
              </section>

              <section>
                <h3 className="font-display text-heading-sm font-semibold mb-2">Operations</h3>
                <dl className="space-y-2 text-caption">
                  <div>
                    <dt className="font-semibold">Embedding Table</dt>
                    <dd className="ml-4">Extract and visualise the input embedding matrix. Shows vocabulary size, hidden dimension, norm distribution, effective rank, and isotropy score. PCA projects a sample of tokens into 3D.</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Token Trajectory</dt>
                    <dd className="ml-4">Trace a word or phrase through all transformer layers. Shows how the representation changes layer by layer, with cosine similarities between consecutive layers and norm profiles.</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Vocabulary Map</dt>
                    <dd className="ml-4">Project a large sample of vocabulary tokens into 3D to visualise the global topology of the embedding space. Search and highlight specific tokens to see where they sit in the geometry.</dd>
                  </div>
                </dl>
              </section>

              <section>
                <h3 className="font-display text-heading-sm font-semibold mb-2">Keyboard Shortcuts</h3>
                <p className="text-caption text-slate/60">Coming soon.</p>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
