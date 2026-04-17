"use client";

import { useEffect, useState } from "react";
import { useModel } from "@/context/ModelContext";
import { Check, Download, FolderOpen, HardDrive, Loader2, Search, Trash2, X } from "lucide-react";
import type { CacheInfo, CachedRepo, LocalModelInspection } from "@/types/model";

// Preset model catalogue. `size` is the on-disk weights footprint after
// download. `minRam` is the minimum system RAM recommended to run the model in
// its native precision without paging to swap (Apple Silicon / modern Linux
// numbers; GPUs with sufficient VRAM may allow lower). The remaining fields
// are the canonical architecture specs published by the model's authors —
// shown in the selected-model detail panel so users can compare models
// without loading them.
//
// The live list is served by the backend from `backend/config/models.md`, a
// user-editable markdown file. `FALLBACK_PRESETS` below is only used if the
// backend is unreachable or the markdown parse fails — the frontend never
// ends up empty.
interface PresetModel {
  id: string;
  name: string;
  size: string;
  minRam: string;
  architecture: string;
  params: string;
  nativeDtype: string;
  hiddenSize: number;
  numLayers: number;
  numHeads: number;
  vocabSize: number;
  contextLength: number;
  organisation: string;
  releaseYear: number;
  description: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePreset(raw: any): PresetModel | null {
  if (!raw || typeof raw !== "object") return null;
  // Accept either snake_case (from the markdown) or camelCase (future-proofing).
  const pick = (snake: string, camel: string) => raw[snake] ?? raw[camel];
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? raw.id ?? "Unnamed model"),
    size: String(raw.size ?? ""),
    minRam: String(pick("min_ram", "minRam") ?? ""),
    architecture: String(raw.architecture ?? ""),
    params: String(raw.params ?? ""),
    nativeDtype: String(pick("native_dtype", "nativeDtype") ?? "unknown"),
    hiddenSize: Number(pick("hidden_size", "hiddenSize") ?? 0),
    numLayers: Number(pick("num_layers", "numLayers") ?? 0),
    numHeads: Number(pick("num_heads", "numHeads") ?? 0),
    vocabSize: Number(pick("vocab_size", "vocabSize") ?? 0),
    contextLength: Number(pick("context_length", "contextLength") ?? 0),
    organisation: String(raw.organisation ?? ""),
    releaseYear: Number(pick("release_year", "releaseYear") ?? 0),
    description: String(raw.description ?? ""),
  };
}

const FALLBACK_PRESETS: PresetModel[] = [
  {
    id: "openai-community/gpt2",
    name: "GPT-2 (124M)",
    size: "~500 MB",
    minRam: "8 GB",
    architecture: "GPT-2",
    params: "124 M",
    nativeDtype: "float32",
    hiddenSize: 768,
    numLayers: 12,
    numHeads: 12,
    vocabSize: 50257,
    contextLength: 1024,
    organisation: "OpenAI",
    releaseYear: 2019,
    description:
      "The original small GPT-2. Fast, well-understood, the de facto reference model for mechanistic interpretability work. Tied input/output embeddings. BPE tokenizer.",
  },
  {
    id: "Qwen/Qwen3-0.6B",
    name: "Qwen3 0.6B",
    size: "~1.2 GB",
    minRam: "16 GB",
    architecture: "Qwen3",
    params: "0.6 B",
    nativeDtype: "bfloat16",
    hiddenSize: 1024,
    numLayers: 28,
    numHeads: 16,
    vocabSize: 151936,
    contextLength: 32768,
    organisation: "Alibaba",
    releaseYear: 2025,
    description:
      "Alibaba's smallest Qwen 3 dense model. Multilingual, strong reasoning for its size, native bf16. Good stress test for anisotropy / isotropy work at small scale.",
  },
  {
    id: "meta-llama/Llama-3.2-1B",
    name: "Llama 3.2 1B",
    size: "~2.4 GB",
    minRam: "16 GB",
    architecture: "Llama",
    params: "1.2 B",
    nativeDtype: "bfloat16",
    hiddenSize: 2048,
    numLayers: 16,
    numHeads: 32,
    vocabSize: 128256,
    contextLength: 131072,
    organisation: "Meta",
    releaseYear: 2024,
    description:
      "Meta's small Llama 3.2 base. Long context window (128k), grouped-query attention, native bf16. Useful for tracing how a modern production architecture builds up geometry.",
  },
  {
    id: "meta-llama/Llama-3.2-3B",
    name: "Llama 3.2 3B",
    size: "~6.4 GB",
    minRam: "16 GB",
    architecture: "Llama",
    params: "3.2 B",
    nativeDtype: "bfloat16",
    hiddenSize: 3072,
    numLayers: 28,
    numHeads: 24,
    vocabSize: 128256,
    contextLength: 131072,
    organisation: "Meta",
    releaseYear: 2024,
    description:
      "Larger Llama 3.2. Same architecture family as the 1B, deeper and wider. A useful point of comparison for layer-count effects on representation geometry.",
  },
  {
    id: "mistralai/Mistral-7B-v0.3",
    name: "Mistral 7B",
    size: "~14 GB",
    minRam: "24 GB",
    architecture: "Mistral",
    params: "7.2 B",
    nativeDtype: "bfloat16",
    hiddenSize: 4096,
    numLayers: 32,
    numHeads: 32,
    vocabSize: 32768,
    contextLength: 32768,
    organisation: "Mistral AI",
    releaseYear: 2024,
    description:
      "Mistral's flagship 7B base. Sliding-window attention, grouped-query attention, native bf16. Tight fit on a 24 GB Mac; prefer to run with nothing else open.",
  },
];

const BACKEND_URL = "http://localhost:8000";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseCacheInfo(raw: any): CacheInfo {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const repos: CachedRepo[] = (raw.repos || []).map((r: any) => ({
    repoId: r.repo_id,
    sizeBytes: r.size_bytes,
    lastAccessed: r.last_accessed,
    lastModified: r.last_modified,
    nbFiles: r.nb_files,
    refs: r.refs || [],
  }));
  return {
    cachePath: raw.cache_path,
    totalSizeBytes: raw.total_size_bytes,
    repoCount: raw.repo_count,
    repos,
  };
}

interface ModelLoaderProps {
  /**
   * Called after a successful load. The page uses this to close the
   * "change model" overlay once the new model is live.
   */
  onLoaded?: () => void;
  /**
   * Called when the user hits the close button on the overlay. Only
   * rendered when provided, so the inline "no model loaded" view stays
   * unadorned.
   */
  onClose?: () => void;
}

export default function ModelLoader({ onLoaded, onClose }: ModelLoaderProps = {}) {
  const { backendStatus, loadModel, unloadModel } = useModel();
  const [customModelId, setCustomModelId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cache, setCache] = useState<CacheInfo | null>(null);
  // Select-then-confirm: clicking a preset row highlights it and shows the
  // detail panel; loading only happens when the user clicks the explicit
  // Load button. Prevents accidental multi-GB downloads from stray clicks.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Presets are served by the backend from backend/config/models.md. We
  // start from the hardcoded fallback so the UI isn't empty during the
  // first fetch, then overwrite once /presets responds.
  const [presets, setPresets] = useState<PresetModel[]>(FALLBACK_PRESETS);
  const [presetSource, setPresetSource] = useState<"markdown" | "fallback">("fallback");
  const [presetError, setPresetError] = useState<string | null>(null);

  // Local-directory flow: user pastes an absolute path, we inspect it, then
  // load the same path through the existing /load endpoint (HuggingFace
  // Transformers already handles local paths — the inspect step is a pre-
  // flight validator that reads config.json and surfaces what's about to
  // load, so a 10-minute weight load doesn't fail on an obvious typo).
  const [localPath, setLocalPath] = useState("");
  const [localInspection, setLocalInspection] = useState<LocalModelInspection | null>(null);
  const [localInspecting, setLocalInspecting] = useState(false);
  const [localPanelOpen, setLocalPanelOpen] = useState(false);

  // Fetch the preset catalogue whenever the backend (re)connects.
  useEffect(() => {
    if (backendStatus.status !== "connected") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/presets`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const parsed = (data.presets || [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((p: any) => parsePreset(p))
          .filter((p: PresetModel | null): p is PresetModel => p !== null && !!p.id);
        if (parsed.length > 0) {
          setPresets(parsed);
          setPresetSource(data.source === "markdown" ? "markdown" : "fallback");
          setPresetError(typeof data.error === "string" ? data.error : null);
        }
      } catch {
        // Backend unreachable — keep FALLBACK_PRESETS, don't surface noise.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [backendStatus.status]);

  // Pull the cache on mount and whenever the backend reconnects, so the "Cached"
  // badges refresh after a download completes.
  useEffect(() => {
    if (backendStatus.status !== "connected") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/cache`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCache(parseCacheInfo(data));
      } catch {
        // backend might be mid-restart; cache panel stays absent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [backendStatus.status, backendStatus.model?.modelId]);

  const cachedSet = new Set((cache?.repos ?? []).map(r => r.repoId));

  const refreshCache = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/cache`);
      if (!res.ok) return;
      const data = await res.json();
      setCache(parseCacheInfo(data));
    } catch {
      // ignore
    }
  };

  const handleDownload = async (modelId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const preset = presets.find(p => p.id === modelId);
    const sizeStr = preset ? ` (${preset.size})` : "";
    const ok = window.confirm(
      `Download ${modelId}${sizeStr} from HuggingFace Hub into ~/.cache/huggingface/hub/?\n\n` +
      `This only fetches the weights to disk — the model is not loaded into memory. ` +
      `You can load it later with one click. Download time depends on your connection; ` +
      `multi-gigabyte models may take several minutes.`
    );
    if (!ok) return;

    setDownloadingId(modelId);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/cache/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_id: modelId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Download failed");
      }
      await refreshCache();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const repo = cache?.repos.find(r => r.repoId === modelId);
    const sizeStr = repo ? ` (${(repo.sizeBytes / 1e9).toFixed(2)} GB)` : "";
    const ok = window.confirm(
      `Delete ${modelId}${sizeStr} from the HuggingFace cache?\n\n` +
      `This removes the downloaded weights from ~/.cache/huggingface/hub/ ` +
      `to reclaim disk space. You can re-download later by loading the model again.`
    );
    if (!ok) return;

    try {
      const res = await fetch(`${BACKEND_URL}/cache/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_id: modelId }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || "Failed to delete model");
        return;
      }
      setError(null);
      await refreshCache();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete model");
    }
  };

  const handleInspectLocal = async () => {
    const path = localPath.trim();
    if (!path) return;
    setLocalInspecting(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/local-model/inspect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const data: LocalModelInspection = await res.json();
      setLocalInspection(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Inspect failed");
    } finally {
      setLocalInspecting(false);
    }
  };

  const handleLoadLocal = async () => {
    if (!localInspection?.ok) return;
    await handleLoad(localInspection.path);
  };

  const handleLoad = async (modelId: string) => {
    // Download warning for the custom-ID path (which has no detail panel).
    // Preset downloads are already explicit in the selected-model card,
    // so we skip the extra modal there.
    const isCached = cachedSet.has(modelId);
    const isPreset = presets.some(p => p.id === modelId);
    if (!isCached && !isPreset) {
      const ok = window.confirm(
        `${modelId} is not in your local cache.\n\n` +
        `Loading will download the weights from HuggingFace Hub into ~/.cache/huggingface/hub/. ` +
        `Depending on your connection and model size this can take seconds to many minutes.\n\n` +
        `Continue?`
      );
      if (!ok) return;
    }

    setLoading(true);
    setLoadingId(modelId);
    setError(null);
    try {
      await loadModel(modelId);
      setSelectedId(null);
      onLoaded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load model");
    } finally {
      setLoading(false);
      setLoadingId(null);
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

  // The full chooser is used both inline (when no model is loaded) and as a
  // modal (when the user clicks the model name in the Header to swap). The
  // "Currently loaded" hint and the unload button below only render in the
  // latter case.

  return (
    <div className="card-editorial p-6 max-w-2xl mx-auto mt-12 relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate hover:text-burgundy transition-colors"
          aria-label="Close model picker"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      )}
      <h2 className="font-display text-display-md text-ink mb-1">
        {backendStatus.model ? "Change model" : "Load a model"}
      </h2>
      {backendStatus.model && (
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="font-sans text-caption text-slate flex-1">
            Currently loaded: <span className="font-mono text-[11px]">{backendStatus.model.modelId}</span>.
            Loading a new model automatically unloads the current one.
          </p>
          <button
            onClick={async () => {
              await unloadModel();
              onLoaded?.();
            }}
            className="btn-editorial-ghost px-2 py-1 text-[11px] shrink-0"
            title="Unload without loading a different model"
          >
            <X className="w-3 h-3 mr-1 inline-block" />
            Unload
          </button>
        </div>
      )}
      {cache && (
        <p className="font-sans text-caption text-slate/70 mb-4">
          <HardDrive className="w-3 h-3 inline-block mr-1 -mt-0.5" />
          Cache: {cache.repoCount} model{cache.repoCount === 1 ? "" : "s"},{" "}
          {(cache.totalSizeBytes / 1e9).toFixed(2)} GB on disk at{" "}
          <code className="text-[10px] bg-cream px-1 rounded-sm">{cache.cachePath}</code>
        </p>
      )}
      {!cache && <div className="mb-4" />}

      {error && (
        <div className="bg-error-50 border border-error-500/20 text-error-600 px-4 py-2 rounded-sm mb-4 font-sans text-body-sm">
          {error}
        </div>
      )}

      {presetError && (
        <div className="bg-warning-50 border border-warning-500/30 text-warning-700 px-4 py-2 rounded-sm mb-4 font-sans text-caption">
          <strong>Preset list fell back to built-in defaults.</strong>{" "}
          <code className="text-[11px] bg-cream px-1 rounded-sm">backend/config/models.md</code>{" "}
          did not parse: {presetError}. Fix the file and reopen this panel.
        </div>
      )}

      {/* Column headers — make the abbreviations legible at a glance */}
      <div className="flex items-center justify-between px-4 pb-1.5 font-sans text-[10px] uppercase tracking-wider text-slate/60">
        <span>Model</span>
        <div className="flex items-center gap-3">
          <span title="Approximate download / on-disk size of the weights">Download size</span>
          <span className="text-parchment-dark">|</span>
          <span title="Minimum system RAM recommended to run the model in fp16/bf16 precision">
            Min RAM
          </span>
          <span className="text-parchment-dark">|</span>
          <span title="Load into memory (enabled once the model is cached)">Load</span>
          <span className="w-6 text-right" title="Download / delete">·</span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {presets.map(model => {
          const isCached = cachedSet.has(model.id);
          const isThisLoading = loadingId === model.id;
          const isThisDownloading = downloadingId === model.id;
          const isSelected = selectedId === model.id;
          const anyBusy = loading || !!downloadingId;
          return (
            <div
              key={model.id}
              className={`w-full flex items-center justify-between px-4 py-3 border rounded-sm transition-colors ${
                isSelected
                  ? "bg-burgundy/5 border-burgundy/40 ring-1 ring-burgundy/20"
                  : "bg-cream/50 hover:bg-cream border-parchment"
              }`}
            >
              <button
                onClick={() => setSelectedId(isSelected ? null : model.id)}
                disabled={anyBusy}
                className="flex items-center gap-3 flex-1 text-left disabled:opacity-50"
                title={
                  isSelected
                    ? "Click again to deselect"
                    : isCached
                    ? "Cached locally — click to select, then Load"
                    : "Click to select and view details"
                }
              >
                {isThisLoading ? (
                  <Loader2 className="w-4 h-4 text-burgundy animate-spin" />
                ) : isThisDownloading ? (
                  <Loader2 className="w-4 h-4 text-slate animate-spin" />
                ) : isCached ? (
                  <Check className="w-4 h-4 text-green-700" />
                ) : (
                  <Download className="w-4 h-4 text-slate" />
                )}
                <span className="font-sans text-body-sm font-medium text-ink">{model.name}</span>
                {isThisDownloading ? (
                  <span className="font-sans text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-burgundy/10 text-burgundy">
                    Downloading…
                  </span>
                ) : isCached ? (
                  <span className="font-sans text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-green-700/10 text-green-800">
                    Cached
                  </span>
                ) : (
                  <span className="font-sans text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-parchment text-slate">
                    Not downloaded
                  </span>
                )}
                <span className="font-sans text-[10px] uppercase tracking-wider text-slate/60">
                  {model.params} · {model.nativeDtype}
                </span>
              </button>
              <div className="flex items-center gap-3 font-sans text-caption text-slate">
                <span title="Approximate download / on-disk size of the weights">{model.size}</span>
                <span className="text-parchment-dark">|</span>
                <span title="Minimum system RAM recommended to run this model in fp16/bf16 precision without swap thrash">
                  {model.minRam} RAM
                </span>
                <span className="text-parchment-dark">|</span>
                {/* Per-row Load — the primary action when the weights are
                    cached. Shortcut path that skips the detail panel. */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleLoad(model.id);
                  }}
                  disabled={!isCached || anyBusy}
                  className={
                    isCached
                      ? "btn-editorial-primary px-3 py-1 text-[11px] min-w-[72px]"
                      : "px-3 py-1 text-[11px] min-w-[72px] rounded-sm border border-parchment-dark bg-parchment/40 text-slate/50 cursor-not-allowed"
                  }
                  title={
                    !isCached
                      ? "Download the model first to enable Load"
                      : `Load ${model.name} into memory`
                  }
                  aria-label={`Load ${model.id}`}
                >
                  {isThisLoading ? (
                    <span className="flex items-center gap-1 justify-center">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading…
                    </span>
                  ) : (
                    "Load"
                  )}
                </button>
                {isCached ? (
                  <button
                    onClick={e => handleDelete(model.id, e)}
                    disabled={anyBusy}
                    className="w-6 h-6 flex items-center justify-center text-slate/60 hover:text-red-700 hover:bg-red-50 rounded-sm transition-colors disabled:opacity-30"
                    title={`Delete ${model.name} from cache to reclaim disk`}
                    aria-label={`Delete ${model.id} from cache`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={e => handleDownload(model.id, e)}
                    disabled={anyBusy}
                    className="w-6 h-6 flex items-center justify-center text-slate/60 hover:text-burgundy hover:bg-burgundy/5 rounded-sm transition-colors disabled:opacity-30"
                    title={`Download ${model.name} (${model.size}) to cache, without loading into memory`}
                    aria-label={`Download ${model.id} to cache`}
                  >
                    {isThisDownloading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected-model detail panel — tech specs + explicit Load button */}
      {selectedId && (() => {
        const m = presets.find(p => p.id === selectedId);
        if (!m) return null;
        const isCached = cachedSet.has(m.id);
        const isThisLoading = loadingId === m.id;
        return (
          <div className="mb-6 border border-burgundy/30 bg-burgundy/5 rounded-sm p-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="font-sans text-body-sm font-semibold text-ink">{m.name}</div>
                <div className="font-mono text-[11px] text-slate">{m.id}</div>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="text-slate/60 hover:text-slate"
                aria-label="Clear selection"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="font-sans text-caption text-slate mb-3 leading-relaxed">{m.description}</p>

            {/* Two-column spec grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-sans text-caption text-slate mb-3">
              <div className="flex justify-between"><span>Architecture</span><span className="text-ink">{m.architecture}</span></div>
              <div className="flex justify-between"><span>Parameters</span><span className="text-ink">{m.params}</span></div>
              <div className="flex justify-between" title="Precision declared by the model's authors. Vectorscope honours this on load, except for fp32 models on MPS/CUDA where it down-casts to fp16 to save memory.">
                <span>Native precision</span>
                <span className="font-mono text-[11px] text-ink">{m.nativeDtype}</span>
              </div>
              <div className="flex justify-between"><span>Hidden size</span><span className="text-ink">{m.hiddenSize.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Layers</span><span className="text-ink">{m.numLayers}</span></div>
              <div className="flex justify-between"><span>Attention heads</span><span className="text-ink">{m.numHeads}</span></div>
              <div className="flex justify-between"><span>Vocabulary</span><span className="text-ink">{m.vocabSize.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Context length</span><span className="text-ink">{m.contextLength.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Released</span><span className="text-ink">{m.organisation}, {m.releaseYear}</span></div>
              <div className="flex justify-between"><span>On disk</span><span className="text-ink">{m.size}</span></div>
            </div>

            {m.nativeDtype === "float32" && (
              <p className="font-sans text-caption text-slate/70 mb-3">
                <strong>Note on precision:</strong> {m.name} ships in float32. On MPS/CUDA devices
                Vectorscope down-casts it to float16 on load to halve the memory footprint, so the
                Settings panel will show the loaded dtype as <code className="font-mono text-[11px] bg-cream px-1 rounded-sm">float16</code>{" "}
                even though the native precision is <code className="font-mono text-[11px] bg-cream px-1 rounded-sm">float32</code>.
                bf16 models (Qwen, Llama, Mistral) are loaded at native precision.
              </p>
            )}

            {!isCached && (
              <p className="font-sans text-caption text-burgundy/80 mb-3">
                This model is not yet downloaded. You can either <strong>download</strong> it now to
                cache for later use, or go straight to <strong>Download and load</strong> to fetch
                the weights and load them into memory in one step (<strong>{m.size}</strong> from
                HuggingFace Hub).
              </p>
            )}

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleLoad(m.id)}
                disabled={loading || !!downloadingId}
                className="btn-editorial-primary text-body-sm"
              >
                {isThisLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading…
                  </span>
                ) : isCached ? (
                  "Load model"
                ) : (
                  `Download and load (${m.size})`
                )}
              </button>
              {!isCached && (
                <button
                  onClick={() => handleDownload(m.id)}
                  disabled={loading || !!downloadingId}
                  className="btn-editorial-ghost text-body-sm"
                  title="Download weights to the cache without loading into memory"
                >
                  {downloadingId === m.id ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Downloading…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Download className="w-3.5 h-3.5" />
                      Download only
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => setSelectedId(null)}
                disabled={loading || !!downloadingId}
                className="btn-editorial-ghost text-body-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        );
      })()}

      <p className="font-sans text-caption text-slate/70 mb-3">
        Models marked <em>Will download</em> are fetched from HuggingFace Hub the first time you
        load them and cached to disk. Depending on connection speed and model size, first load can
        take anywhere from a few seconds to several minutes. After that the model lives in your
        cache and loads instantly.
      </p>

      <p className="font-sans text-caption text-slate/60 mb-3">
        {presetSource === "markdown" ? (
          <>
            Preset list loaded from{" "}
            <code className="text-[10px] bg-cream px-1 rounded-sm">backend/config/models.md</code>
            . Edit that file and restart the backend to add or remove presets.
          </>
        ) : (
          <>
            Using built-in preset list (backend catalogue unavailable). When the backend is
            running, presets come from{" "}
            <code className="text-[10px] bg-cream px-1 rounded-sm">backend/config/models.md</code>
            .
          </>
        )}
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="HuggingFace model ID (e.g. Qwen/Qwen3-0.6B)..."
          value={customModelId}
          onChange={e => setCustomModelId(e.target.value)}
          className="input-editorial flex-1"
        />
        <button
          onClick={() => customModelId.trim() && handleLoad(customModelId.trim())}
          disabled={!customModelId.trim() || loading}
          className="btn-editorial-ghost disabled:opacity-40 disabled:cursor-not-allowed"
          title={
            customModelId.trim()
              ? `Load ${customModelId.trim()} (may trigger download)`
              : "Type a HuggingFace model ID above to enable"
          }
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load custom"}
        </button>
      </div>

      {/* Locally-trained or fine-tuned models */}
      <div className="mt-5 pt-4 border-t border-parchment/60">
        <button
          onClick={() => setLocalPanelOpen(o => !o)}
          className="flex items-center gap-2 font-sans text-caption text-slate hover:text-burgundy transition-colors"
          aria-expanded={localPanelOpen}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Load a locally-trained or fine-tuned model</span>
          <span className="text-slate/50 text-[10px]">
            {localPanelOpen ? "▾" : "▸"}
          </span>
        </button>

        {localPanelOpen && (
          <div className="mt-3 space-y-3 border border-parchment rounded-sm p-3 bg-cream/30">
            <p className="font-sans text-caption text-slate/70">
              Point at a directory on disk containing a{" "}
              <code className="text-[10px] bg-cream px-1 rounded-sm">config.json</code> and model
              weights (safetensors or pytorch_model.bin, single or sharded). Your own checkpoints,
              institutional fine-tunes, or HuggingFace cache snapshots all work. Adapter-only
              directories (LoRA) are detected and rejected — merge the adapter into the base model
              first.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="/absolute/path/to/my-model"
                value={localPath}
                onChange={e => {
                  setLocalPath(e.target.value);
                  // Invalidate the previous inspection if the path changed.
                  if (localInspection && e.target.value.trim() !== localInspection.path) {
                    setLocalInspection(null);
                  }
                }}
                className="input-editorial flex-1 font-mono text-[11px]"
              />
              <button
                onClick={handleInspectLocal}
                disabled={!localPath.trim() || localInspecting}
                className="btn-editorial-ghost disabled:opacity-40 disabled:cursor-not-allowed"
                title="Validate the directory and show what's about to load"
              >
                {localInspecting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-1">
                    <Search className="w-3.5 h-3.5" />
                    Inspect
                  </span>
                )}
              </button>
            </div>

            {localInspection && <LocalInspectionPanel inspection={localInspection} />}

            {localInspection?.ok && (
              <div className="flex gap-2">
                <button
                  onClick={handleLoadLocal}
                  disabled={loading || !!downloadingId}
                  className="btn-editorial-primary text-body-sm"
                >
                  {loadingId === localInspection.path ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Loading…
                    </span>
                  ) : (
                    `Load ${localInspection.modelName}`
                  )}
                </button>
                <button
                  onClick={() => {
                    setLocalInspection(null);
                    setLocalPath("");
                  }}
                  disabled={loading}
                  className="btn-editorial-ghost text-body-sm"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}

        <p className="font-sans text-caption text-slate/70 mt-3">
          <span className="font-sans text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-slate/10 text-slate mr-1.5">
            Also planned
          </span>
          Alternative model sources (ModelScope, institutional mirrors via{" "}
          <code className="text-[10px] bg-cream px-1 rounded-sm">HF_ENDPOINT</code>).
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LocalInspectionPanel — spec card + warnings/errors for a /local-model/inspect
// result. Split out so the main ModelLoader component stays readable.
// ---------------------------------------------------------------------------

function LocalInspectionPanel({ inspection }: { inspection: LocalModelInspection }) {
  const c = inspection.config;
  const sizeGb = inspection.sizeBytes / 1e9;

  return (
    <div
      className={
        "rounded-sm border p-3 " +
        (inspection.ok
          ? "border-green-700/30 bg-green-50/40"
          : "border-red-400/40 bg-red-50/40")
      }
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-sans text-body-sm font-semibold text-ink">
            {inspection.modelName || "model"}
          </div>
          <div className="font-mono text-[10px] text-slate break-all">{inspection.path}</div>
        </div>
        <span
          className={
            "font-mono text-[10px] px-1.5 py-0.5 rounded-sm " +
            (inspection.ok
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-700")
          }
        >
          {inspection.ok ? "loadable" : "not loadable"}
        </span>
      </div>

      {inspection.errors.length > 0 && (
        <ul className="list-disc pl-5 mb-2 space-y-0.5 font-sans text-[11px] text-red-700">
          {inspection.errors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}

      {inspection.warnings.length > 0 && (
        <ul className="list-disc pl-5 mb-2 space-y-0.5 font-sans text-[11px] text-amber-700">
          {inspection.warnings.map((warn, i) => (
            <li key={i}>{warn}</li>
          ))}
        </ul>
      )}

      {c && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-sans text-[11px] text-slate">
          <div className="flex justify-between">
            <span>Architecture</span>
            <span className="text-ink font-mono text-[10px]">
              {c.modelType ?? "–"}
              {c.architectures.length > 0 ? ` (${c.architectures[0]})` : ""}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Native dtype</span>
            <span className="text-ink font-mono text-[10px]">
              {inspection.nativeDtype ?? c.torchDtype ?? "unknown"}
            </span>
          </div>
          {c.hiddenSize !== null && (
            <div className="flex justify-between">
              <span>Hidden size</span>
              <span className="text-ink">{c.hiddenSize.toLocaleString()}</span>
            </div>
          )}
          {c.numLayers !== null && (
            <div className="flex justify-between">
              <span>Layers</span>
              <span className="text-ink">{c.numLayers}</span>
            </div>
          )}
          {c.numHeads !== null && (
            <div className="flex justify-between">
              <span>Attention heads</span>
              <span className="text-ink">{c.numHeads}</span>
            </div>
          )}
          {c.vocabSize !== null && (
            <div className="flex justify-between">
              <span>Vocabulary</span>
              <span className="text-ink">{c.vocabSize.toLocaleString()}</span>
            </div>
          )}
          {c.contextLength !== null && (
            <div className="flex justify-between">
              <span>Context length</span>
              <span className="text-ink">{c.contextLength.toLocaleString()}</span>
            </div>
          )}
          {inspection.sizeBytes > 0 && (
            <div className="flex justify-between">
              <span>On disk</span>
              <span className="text-ink">
                {sizeGb >= 1 ? `${sizeGb.toFixed(2)} GB` : `${(inspection.sizeBytes / 1e6).toFixed(1)} MB`}
              </span>
            </div>
          )}
          {inspection.weights.length > 0 && (
            <div className="flex justify-between col-span-2">
              <span>Weight files</span>
              <span className="text-ink font-mono text-[10px]">
                {inspection.weights.join(", ")}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
