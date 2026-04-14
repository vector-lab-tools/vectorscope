"use client";

import { useState } from "react";
import { useModel } from "@/context/ModelContext";
import { Download, X, Loader2 } from "lucide-react";

const PRESET_MODELS = [
  { id: "openai-community/gpt2", name: "GPT-2 (124M)", size: "~500 MB", tier: "8 GB" },
  { id: "Qwen/Qwen3-0.6B", name: "Qwen3 0.6B", size: "~1.2 GB", tier: "16 GB" },
  { id: "meta-llama/Llama-3.2-1B", name: "Llama 3.2 1B", size: "~2.4 GB", tier: "16 GB" },
  { id: "meta-llama/Llama-3.2-3B", name: "Llama 3.2 3B", size: "~6.4 GB", tier: "16 GB" },
  { id: "mistralai/Mistral-7B-v0.3", name: "Mistral 7B", size: "~14 GB", tier: "24 GB" },
];

export default function ModelLoader() {
  const { backendStatus, loadModel, unloadModel } = useModel();
  const [customModelId, setCustomModelId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoad = async (modelId: string) => {
    setLoading(true);
    setError(null);
    try {
      await loadModel(modelId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load model");
    } finally {
      setLoading(false);
    }
  };

  if (backendStatus.status === "disconnected") {
    return (
      <div className="card-editorial p-6 max-w-2xl mx-auto mt-12">
        <h2 className="font-display text-display-md text-ink mb-3">Backend not connected</h2>
        <p className="font-body text-body-md text-slate mb-4">
          Vectorscope requires a Python backend running locally. Start it with:
        </p>
        <pre className="bg-cream px-4 py-3 rounded-sm font-sans text-body-sm text-ink overflow-x-auto">
          cd backend && python -m venv .venv && source .venv/bin/activate{"\n"}
          pip install -r requirements.txt{"\n"}
          python main.py
        </pre>
      </div>
    );
  }

  if (backendStatus.model) {
    return (
      <div className="card-editorial p-4 max-w-2xl mx-auto mt-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-sans text-body-sm font-medium text-ink">
              {backendStatus.model.modelId}
            </span>
            <span className="font-sans text-caption text-slate ml-3">
              {backendStatus.model.hiddenSize}d, {backendStatus.model.numLayers} layers,{" "}
              {backendStatus.model.vocabSize.toLocaleString()} tokens
            </span>
          </div>
          <button
            onClick={unloadModel}
            className="btn-editorial-ghost px-3 py-1.5 text-caption"
          >
            <X className="w-3 h-3 mr-1" />
            Unload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-editorial p-6 max-w-2xl mx-auto mt-12">
      <h2 className="font-display text-display-md text-ink mb-4">Load a model</h2>

      {error && (
        <div className="bg-error-50 border border-error-500/20 text-error-600 px-4 py-2 rounded-sm mb-4 font-sans text-body-sm">
          {error}
        </div>
      )}

      <div className="space-y-2 mb-6">
        {PRESET_MODELS.map(model => (
          <button
            key={model.id}
            onClick={() => handleLoad(model.id)}
            disabled={loading}
            className="w-full flex items-center justify-between px-4 py-3 bg-cream/50 hover:bg-cream border border-parchment rounded-sm transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <Download className="w-4 h-4 text-slate" />
              <span className="font-sans text-body-sm font-medium text-ink">{model.name}</span>
            </div>
            <div className="flex items-center gap-3 font-sans text-caption text-slate">
              <span>{model.size}</span>
              <span className="text-parchment-dark">|</span>
              <span>min {model.tier}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Or enter a HuggingFace model ID..."
          value={customModelId}
          onChange={e => setCustomModelId(e.target.value)}
          className="input-editorial flex-1"
        />
        <button
          onClick={() => customModelId && handleLoad(customModelId)}
          disabled={!customModelId || loading}
          className="btn-editorial-primary"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load"}
        </button>
      </div>
    </div>
  );
}
