"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import type { TokenTrajectoryResult } from "@/types/model";
import { projectPCA3D } from "@/lib/geometry/pca";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const BACKEND_URL = "http://localhost:8000";

export default function TokenTrajectory() {
  const [text, setText] = useState("justice");
  const [result, setResult] = useState<TokenTrajectoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/token-trajectory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to trace token trajectory");
      }
      const data: TokenTrajectoryResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [text]);

  // PCA project the first token's vector at each layer into 3D
  const trajectoryCoords = useMemo(() => {
    if (!result) return null;
    // Collect the first token's hidden state at each layer
    const vectors = result.layers.map((l) => l.vectors[0]);
    if (vectors.length < 3) return null;
    return projectPCA3D(vectors);
  }, [result]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Controls */}
      <div className="card-editorial p-6">
        <div className="flex items-center gap-4">
          <label className="font-sans text-caption text-slate">
            Input text
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
              className="input-editorial ml-2 w-64"
              placeholder="Enter a word or phrase..."
            />
          </label>
          <button
            onClick={run}
            disabled={loading}
            className="btn-editorial-primary"
          >
            {loading ? "Tracing..." : "Trace"}
          </button>
          {error && <span className="text-red-600 font-sans text-caption">{error}</span>}
        </div>
      </div>

      {result && (
        <>
          {/* Token info */}
          <div className="card-editorial p-4">
            <div className="flex items-center gap-4 font-sans text-caption">
              <span className="text-slate">Tokens:</span>
              {result.tokens.map((t, i) => (
                <span key={i} className="bg-parchment px-2 py-1 rounded font-mono text-sm">
                  {t}
                  <span className="text-slate ml-1">({result.tokenIds[i]})</span>
                </span>
              ))}
              <span className="text-slate ml-4">{result.layers.length} layers</span>
            </div>
          </div>

          {/* 3D trajectory */}
          {trajectoryCoords && (
            <div className="card-editorial p-4">
              <h3 className="font-heading text-heading-sm mb-4">
                Token Trajectory through Layers (PCA → 3D)
              </h3>
              <Plot
                data={[
                  // Trajectory line
                  {
                    type: "scatter3d",
                    mode: "lines+markers",
                    x: trajectoryCoords.map((c) => c[0]),
                    y: trajectoryCoords.map((c) => c[1]),
                    z: trajectoryCoords.map((c) => c[2]),
                    text: result.layers.map((l) => `Layer ${l.layer}`),
                    hovertemplate: "<b>%{text}</b><br>norm: %{marker.color:.2f}<extra></extra>",
                    marker: {
                      size: 5,
                      color: result.layers.map((l) => l.norms[0]),
                      colorscale: [
                        [0, "#F5F0E8"],
                        [1, "#5B2333"],
                      ],
                      colorbar: { title: "Norm", thickness: 15 },
                    },
                    line: {
                      color: "#A67F6F",
                      width: 3,
                    },
                  },
                  // Start marker
                  {
                    type: "scatter3d",
                    mode: "markers+text",
                    x: [trajectoryCoords[0][0]],
                    y: [trajectoryCoords[0][1]],
                    z: [trajectoryCoords[0][2]],
                    text: ["Input"],
                    textposition: "top center",
                    marker: { size: 10, color: "#5B8C5A", symbol: "diamond" },
                    showlegend: false,
                  },
                  // End marker
                  {
                    type: "scatter3d",
                    mode: "markers+text",
                    x: [trajectoryCoords[trajectoryCoords.length - 1][0]],
                    y: [trajectoryCoords[trajectoryCoords.length - 1][1]],
                    z: [trajectoryCoords[trajectoryCoords.length - 1][2]],
                    text: ["Output"],
                    textposition: "top center",
                    marker: { size: 10, color: "#5B2333", symbol: "diamond" },
                    showlegend: false,
                  },
                ]}
                layout={{
                  height: 550,
                  margin: { l: 0, r: 0, t: 0, b: 0 },
                  paper_bgcolor: "transparent",
                  plot_bgcolor: "transparent",
                  scene: {
                    xaxis: { title: "PC1", gridcolor: "#E8E0D4", zerolinecolor: "#D4C9B8" },
                    yaxis: { title: "PC2", gridcolor: "#E8E0D4", zerolinecolor: "#D4C9B8" },
                    zaxis: { title: "PC3", gridcolor: "#E8E0D4", zerolinecolor: "#D4C9B8" },
                    bgcolor: "transparent",
                  },
                  font: { family: "Inter, sans-serif", color: "#4A4A4A" },
                  showlegend: false,
                }}
                config={{ displayModeBar: true, displaylogo: false }}
                style={{ width: "100%" }}
              />
            </div>
          )}

          {/* Layer similarity chart */}
          {result.layerSimilarities.length > 0 && (
            <div className="card-editorial p-4">
              <h3 className="font-heading text-heading-sm mb-4">
                Layer-to-Layer Cosine Similarity
              </h3>
              <Plot
                data={[
                  {
                    type: "scatter",
                    mode: "lines+markers",
                    x: result.layerSimilarities.map((_, i) => `${i} \u2192 ${i + 1}`),
                    y: result.layerSimilarities,
                    marker: { color: "#5B2333", size: 6 },
                    line: { color: "#A67F6F", width: 2 },
                  },
                ]}
                layout={{
                  height: 250,
                  margin: { l: 50, r: 20, t: 10, b: 60 },
                  paper_bgcolor: "transparent",
                  plot_bgcolor: "transparent",
                  xaxis: { title: "Layer Transition", gridcolor: "#E8E0D4" },
                  yaxis: { title: "Cosine Similarity", gridcolor: "#E8E0D4", range: [0, 1.05] },
                  font: { family: "Inter, sans-serif", color: "#4A4A4A" },
                }}
                config={{ displayModeBar: false }}
                style={{ width: "100%" }}
              />
            </div>
          )}

          {/* Norm profile */}
          <div className="card-editorial p-4">
            <h3 className="font-heading text-heading-sm mb-4">Norm Profile across Layers</h3>
            <Plot
              data={[
                {
                  type: "scatter",
                  mode: "lines+markers",
                  x: result.layers.map((l) => l.layer),
                  y: result.layers.map((l) => l.norms[0]),
                  marker: { color: "#5B2333", size: 6 },
                  line: { color: "#A67F6F", width: 2 },
                },
              ]}
              layout={{
                height: 250,
                margin: { l: 50, r: 20, t: 10, b: 40 },
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent",
                xaxis: { title: "Layer", gridcolor: "#E8E0D4" },
                yaxis: { title: "Norm", gridcolor: "#E8E0D4" },
                font: { family: "Inter, sans-serif", color: "#4A4A4A" },
              }}
              config={{ displayModeBar: false }}
              style={{ width: "100%" }}
            />
          </div>
        </>
      )}
    </div>
  );
}
