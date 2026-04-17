"""
Preset model catalogue loader.

Reads the preset list from `backend/config/models.md` — a human-editable
markdown file containing a single fenced YAML block with a top-level
`models:` list. The file can carry arbitrary prose around the block (for
documentation); the parser only cares about the first ```yaml fence.

The list is intentionally *not* validated against a strict schema here —
missing or oddly-typed fields are surfaced to the frontend as-is so the
user can see what needs fixing after editing the file. We only guarantee
that (a) the return value is a list, and (b) non-dict entries are dropped.

Fields use snake_case to match the rest of the HTTP API. The frontend
converts to camelCase for its own types.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Dict, List

import yaml

PRESETS_PATH = Path(__file__).parent / "models.md"

# Keep one small fallback so the picker is never empty even if the markdown
# file is missing or malformed — usually because the user has just
# hand-edited it and typo'd something. Better to show GPT-2 than a blank.
FALLBACK_PRESETS: List[Dict[str, Any]] = [
    {
        "id": "openai-community/gpt2",
        "name": "GPT-2 (124M)",
        "size": "~500 MB",
        "min_ram": "8 GB",
        "architecture": "GPT-2",
        "params": "124 M",
        "native_dtype": "float32",
        "hidden_size": 768,
        "num_layers": 12,
        "num_heads": 12,
        "vocab_size": 50257,
        "context_length": 1024,
        "organisation": "OpenAI",
        "release_year": 2019,
        "description": (
            "The original small GPT-2. Fast, well-understood, the de facto "
            "reference model for mechanistic interpretability work. Tied "
            "input/output embeddings. BPE tokenizer."
        ),
    },
]

YAML_FENCE_RE = re.compile(r"```ya?ml\s*\n(.*?)\n```", re.DOTALL | re.IGNORECASE)


def _parse_models_md(text: str) -> List[Dict[str, Any]]:
    """Extract the first ```yaml block and parse its `models:` list."""
    match = YAML_FENCE_RE.search(text)
    if not match:
        raise ValueError("No ```yaml fenced block found in models.md")
    data = yaml.safe_load(match.group(1))
    if not isinstance(data, dict):
        raise ValueError("YAML block did not parse to a mapping")
    models = data.get("models")
    if not isinstance(models, list):
        raise ValueError("YAML block missing a top-level `models:` list")
    # Drop anything that didn't parse as a mapping, and trim whitespace on
    # folded-scalar description strings so the UI doesn't show trailing newlines.
    cleaned: List[Dict[str, Any]] = []
    for m in models:
        if not isinstance(m, dict):
            continue
        desc = m.get("description")
        if isinstance(desc, str):
            m["description"] = desc.strip()
        cleaned.append(m)
    return cleaned


def load_presets() -> Dict[str, Any]:
    """
    Load the preset catalogue.

    Returns a dict with:
        presets: list[dict]    — the model entries, never empty on success
        source:  str           — "markdown" or "fallback"
        path:    str           — absolute path to models.md
        error:   str | None    — parse error message if we used the fallback
    """
    result: Dict[str, Any] = {
        "presets": FALLBACK_PRESETS,
        "source": "fallback",
        "path": str(PRESETS_PATH),
        "error": None,
    }
    try:
        text = PRESETS_PATH.read_text(encoding="utf-8")
        presets = _parse_models_md(text)
        if not presets:
            raise ValueError("Parsed zero valid model entries")
        result["presets"] = presets
        result["source"] = "markdown"
    except FileNotFoundError:
        result["error"] = f"models.md not found at {PRESETS_PATH}"
    except Exception as exc:
        result["error"] = f"{type(exc).__name__}: {exc}"
    return result
