"""
Local model directory inspection.

Validates a directory as a loadable HuggingFace-format model checkpoint and
reports the architecture metadata without actually loading the weights. The
frontend uses the result to show a detail panel before the user commits to a
load, so they can see what they're about to load into memory.

A directory is considered valid if it contains a `config.json` and at least
one weights file (safetensors or pytorch_model.bin, single-file or sharded).
LoRA adapters (adapter_config.json + adapter_model.safetensors) are recognised
but not loadable as standalone causal-LMs; we surface that as a soft warning
so users know to point at the merged checkpoint instead.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from safetensors import safe_open


# HuggingFace architectures use two config-key conventions. Modern
# Llama/Qwen/Mistral: hidden_size, num_hidden_layers, num_attention_heads.
# Older GPT-2-style: n_embd, n_layer, n_head. We accept either and normalise.
CONFIG_KEY_ALIASES: Dict[str, tuple] = {
    "hiddenSize": ("hidden_size", "n_embd", "d_model"),
    "numLayers": ("num_hidden_layers", "n_layer"),
    "numHeads": ("num_attention_heads", "n_head"),
    "vocabSize": ("vocab_size",),
    "contextLength": ("max_position_embeddings", "n_positions", "n_ctx"),
    "modelType": ("model_type",),
    "torchDtype": ("torch_dtype",),
    "tieWordEmbeddings": ("tie_word_embeddings",),
}

# We treat these as *required* for a loadable causal-LM checkpoint (after
# alias resolution): model_type plus a width and depth. Missing any of these
# produces a blocking error.
REQUIRED_NORMALISED_KEYS = ("modelType", "hiddenSize", "numLayers")


def _resolve(config: Dict[str, Any], normalised_key: str) -> Any:
    for alias in CONFIG_KEY_ALIASES.get(normalised_key, ()):
        if alias in config:
            return config[alias]
    return None

# Filenames we know how to load. Presence of any of these is sufficient.
WEIGHT_FILES = (
    "model.safetensors",
    "model.safetensors.index.json",
    "pytorch_model.bin",
    "pytorch_model.bin.index.json",
)

# LoRA / adapter markers — we detect these so we can warn the user rather than
# silently trying to load them as a full causal-LM.
ADAPTER_MARKERS = ("adapter_config.json", "adapter_model.safetensors", "adapter_model.bin")


def _find_weights(root: Path) -> List[str]:
    """Return the weight-file names found directly in `root`."""
    return [name for name in WEIGHT_FILES if (root / name).is_file()]


def _find_adapters(root: Path) -> List[str]:
    return [name for name in ADAPTER_MARKERS if (root / name).is_file()]


def _total_weight_size(root: Path) -> int:
    """Approximate total on-disk size of all weight files (single or sharded)."""
    total = 0
    for entry in root.iterdir():
        if not entry.is_file():
            continue
        name = entry.name
        if (
            name.endswith(".safetensors")
            or name == "pytorch_model.bin"
            or (name.startswith("pytorch_model-") and name.endswith(".bin"))
        ):
            try:
                total += entry.stat().st_size
            except OSError:
                pass
    return total


def _detect_native_dtype(root: Path) -> Optional[str]:
    """Peek at the first safetensors shard's header to read the weights dtype."""
    candidates: List[Path] = []
    single = root / "model.safetensors"
    if single.is_file():
        candidates.append(single)
    idx = root / "model.safetensors.index.json"
    if idx.is_file():
        try:
            data = json.loads(idx.read_text())
            shard = next(iter(set(data.get("weight_map", {}).values())), None)
            if shard:
                candidates.append(root / shard)
        except Exception:
            pass

    for path in candidates:
        try:
            with safe_open(str(path), framework="pt") as f:
                for key in f.keys():
                    ds = f.get_slice(key).get_dtype()
                    return {
                        "F32": "float32",
                        "F16": "float16",
                        "BF16": "bfloat16",
                        "F64": "float64",
                    }.get(ds, ds.lower())
        except Exception:
            continue
    return None


def inspect_local_model(path: str) -> Dict[str, Any]:
    """
    Validate `path` as a HuggingFace-format model directory and report
    architecture metadata.

    Returns:
        {
          ok:            bool         — True iff directory is loadable
          path:          str          — resolved absolute path
          errors:        list[str]    — blocking validation failures
          warnings:      list[str]    — non-blocking notes (e.g. adapter-only)
          config:        dict | None  — relevant subset of config.json fields
          weights:       list[str]    — weight-file names found
          sizeBytes:     int          — summed weight-file sizes on disk
          nativeDtype:   str | None   — peeked from the safetensors header
          modelName:     str          — directory name, used as display label
        }
    """
    result: Dict[str, Any] = {
        "ok": False,
        "path": path,
        "errors": [],
        "warnings": [],
        "config": None,
        "weights": [],
        "sizeBytes": 0,
        "nativeDtype": None,
        "modelName": "",
    }

    if not path or not path.strip():
        result["errors"].append("Path is empty.")
        return result

    root = Path(path).expanduser()
    try:
        root = root.resolve()
    except Exception as exc:
        result["errors"].append(f"Could not resolve path: {exc}")
        return result

    result["path"] = str(root)
    result["modelName"] = root.name

    if not root.exists():
        result["errors"].append(f"Directory does not exist: {root}")
        return result
    if not root.is_dir():
        result["errors"].append(f"Path is not a directory: {root}")
        return result

    # Config check
    config_path = root / "config.json"
    if not config_path.is_file():
        # Useful hint: maybe user pointed at the parent of a single-snapshot
        # HuggingFace cache (e.g. .../snapshots/<hash>/).
        snapshots = root / "snapshots"
        if snapshots.is_dir():
            candidates = [p for p in snapshots.iterdir() if p.is_dir()]
            if len(candidates) == 1:
                result["warnings"].append(
                    f"No config.json at the top level, but a single snapshot was "
                    f"found at {candidates[0]}. Try pointing at that directory directly."
                )
        result["errors"].append(
            "No config.json found. This does not look like a HuggingFace model directory."
        )
        return result

    # Parse config
    try:
        config = json.loads(config_path.read_text())
    except Exception as exc:
        result["errors"].append(f"config.json could not be parsed: {exc}")
        return result

    # Present a normalised config subset to the frontend, resolving the
    # GPT-2 (n_embd/n_layer/n_head) vs modern (hidden_size/num_hidden_layers
    # /num_attention_heads) key aliases.
    normalised = {key: _resolve(config, key) for key in CONFIG_KEY_ALIASES}
    normalised["architectures"] = config.get("architectures", [])
    result["config"] = normalised

    missing = [k for k in REQUIRED_NORMALISED_KEYS if normalised.get(k) in (None, "")]
    if missing:
        pretty = ", ".join(missing)
        result["errors"].append(
            f"config.json is missing required fields after alias resolution: {pretty}. "
            f"This may not be a causal-LM checkpoint."
        )

    # Weights check
    weights = _find_weights(root)
    adapters = _find_adapters(root)
    result["weights"] = weights

    if not weights:
        if adapters:
            result["errors"].append(
                "No full-model weight files found, only a LoRA / adapter checkpoint "
                f"({', '.join(adapters)}). Merge the adapter into a base model first, "
                "or load the base model and apply the adapter in a separate step."
            )
        else:
            result["errors"].append(
                "No model weights found. Expected one of: "
                + ", ".join(WEIGHT_FILES)
            )

    if adapters and weights:
        result["warnings"].append(
            "Adapter files were found alongside full-model weights. The full weights "
            "will be loaded; the adapter will be ignored."
        )

    result["sizeBytes"] = _total_weight_size(root)
    result["nativeDtype"] = _detect_native_dtype(root)

    # Tokenizer presence is optional but nice to flag
    has_tokenizer = any(
        (root / name).is_file()
        for name in ("tokenizer.json", "tokenizer_config.json", "vocab.json", "spiece.model")
    )
    if not has_tokenizer:
        result["warnings"].append(
            "No tokenizer files found in this directory. Loading may fall back to "
            "a remote tokenizer from the HuggingFace Hub."
        )

    result["ok"] = not result["errors"]
    return result
