"""
Full Trace: stream the complete token-to-prediction pipeline via NDJSON.

Stages:
  1. tokenize    — token IDs and decoded strings
  2. embedding   — input embedding vectors, norms
  3. layer:N     — hidden states at each layer, norms, cosine to previous layer
  4. output      — logits, top-K predictions
  5. complete    — summary statistics
"""

from __future__ import annotations

import json
import torch
import numpy as np
from typing import Generator
from models.session import session


def stream_full_trace(text: str, top_k: int = 20) -> Generator[str, None, None]:
    """Yield NDJSON lines for each stage of the forward pass."""

    if session.model is None:
        yield json.dumps({"stage": "error", "message": "No model loaded"}) + "\n"
        return

    tokenizer = session.tokenizer
    model = session.model

    # --- Stage 1: Tokenize ---
    inputs = tokenizer(text, return_tensors="pt").to(model.device)
    token_ids = inputs["input_ids"][0].tolist()
    tokens = [tokenizer.decode([tid]) for tid in token_ids]

    yield json.dumps({
        "stage": "tokenize",
        "tokens": tokens,
        "tokenIds": token_ids,
        "numTokens": len(token_ids),
    }) + "\n"

    # --- Stage 2: Input embeddings ---
    embed_table = session._get_embedding_table()
    input_embeds = embed_table[inputs["input_ids"][0]].float().detach().cpu().numpy()
    embed_norms = np.linalg.norm(input_embeds, axis=1).tolist()

    yield json.dumps({
        "stage": "embedding",
        "norms": embed_norms,
        "meanNorm": float(np.mean(embed_norms)),
        "shape": list(input_embeds.shape),
    }) + "\n"

    # --- Forward pass with hidden states ---
    with torch.no_grad():
        outputs = model(**inputs, output_hidden_states=True)

    hidden_states = outputs.hidden_states  # tuple: layer 0 = post-embedding

    prev_hs = None
    for layer_idx, hs in enumerate(hidden_states):
        hs_float = hs[0].float()
        hs_np = hs_float.cpu().numpy()
        norms = np.linalg.norm(hs_np, axis=1).tolist()

        # Cosine similarity to previous layer (per-token mean)
        cos_to_prev = None
        if prev_hs is not None:
            cos = torch.nn.functional.cosine_similarity(prev_hs, hs_float, dim=-1)
            cos_to_prev = float(cos.mean())

        # --- Stage 3: Layer N ---
        yield json.dumps({
            "stage": "layer",
            "layer": layer_idx,
            "norms": norms,
            "meanNorm": float(np.mean(norms)),
            "cosineToPrev": cos_to_prev,
        }) + "\n"

        prev_hs = hs_float

    # --- Stage 4: Output logits and predictions ---
    logits = outputs.logits[0, -1].float()  # logits for last token position
    probs = torch.softmax(logits, dim=-1)
    top_vals, top_idxs = torch.topk(probs, min(top_k, probs.size(0)))

    predictions = []
    for prob, idx in zip(top_vals.tolist(), top_idxs.tolist()):
        predictions.append({
            "token": tokenizer.decode([idx]),
            "tokenId": idx,
            "probability": prob,
            "logit": float(logits[idx]),
        })

    yield json.dumps({
        "stage": "output",
        "topPredictions": predictions,
        "entropyBits": float(-torch.sum(probs * torch.log2(probs + 1e-12))),
        "topProbability": predictions[0]["probability"] if predictions else 0,
    }) + "\n"

    # --- Stage 5: Summary ---
    num_layers = len(hidden_states)
    all_norms = [np.linalg.norm(hs[0].float().cpu().numpy(), axis=1).mean() for hs in hidden_states]

    yield json.dumps({
        "stage": "complete",
        "numLayers": num_layers,
        "numTokens": len(token_ids),
        "normRange": [float(min(all_norms)), float(max(all_norms))],
        "inputText": text,
    }) + "\n"
