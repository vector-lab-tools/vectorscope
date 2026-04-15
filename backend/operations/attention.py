"""
Attention Inspector: extract attention patterns at a given layer.

Returns attention weights for all heads at a specified layer,
or all layers for a specified head.
"""

from __future__ import annotations

import torch
import numpy as np
from models.session import session


def get_attention_at_layer(text: str, layer: int) -> dict:
    """Extract attention patterns for all heads at a specific layer."""
    if session.model is None:
        raise ValueError("No model loaded")

    tokenizer = session.tokenizer
    model = session.model

    inputs = tokenizer(text, return_tensors="pt").to(model.device)
    token_ids = inputs["input_ids"][0].tolist()
    tokens = [tokenizer.decode([tid]) for tid in token_ids]

    num_layers = session.info.num_layers if session.info else 12

    if layer < 0 or layer >= num_layers:
        raise ValueError(f"Layer {layer} out of range [0, {num_layers - 1}]")

    with torch.no_grad():
        outputs = model(**inputs, output_attentions=True)

    # outputs.attentions is a tuple of (batch, num_heads, seq_len, seq_len)
    attn = outputs.attentions[layer][0]  # (num_heads, seq_len, seq_len)
    attn_np = attn.float().cpu().numpy()

    num_heads = attn_np.shape[0]
    seq_len = attn_np.shape[1]

    # Per-head statistics
    head_stats = []
    for h in range(num_heads):
        head_attn = attn_np[h]
        # Entropy of attention distribution per query position
        entropies = -np.sum(head_attn * np.log2(head_attn + 1e-12), axis=-1)
        head_stats.append({
            "head": h,
            "meanEntropy": float(np.mean(entropies)),
            "maxAttention": float(np.max(head_attn)),
            "diagonalMean": float(np.mean(np.diag(head_attn)[:seq_len])),
        })

    # Mean attention across all heads
    mean_attn = np.mean(attn_np, axis=0)

    return {
        "inputText": text,
        "tokens": tokens,
        "tokenIds": token_ids,
        "layer": layer,
        "numHeads": num_heads,
        "seqLen": seq_len,
        "attentionWeights": attn_np.tolist(),  # [num_heads, seq_len, seq_len]
        "meanAttention": mean_attn.tolist(),    # [seq_len, seq_len]
        "headStats": head_stats,
    }


def get_attention_head_across_layers(text: str, head: int) -> dict:
    """Extract attention patterns for a single head across all layers."""
    if session.model is None:
        raise ValueError("No model loaded")

    tokenizer = session.tokenizer
    model = session.model

    inputs = tokenizer(text, return_tensors="pt").to(model.device)
    token_ids = inputs["input_ids"][0].tolist()
    tokens = [tokenizer.decode([tid]) for tid in token_ids]

    with torch.no_grad():
        outputs = model(**inputs, output_attentions=True)

    num_layers = len(outputs.attentions)
    num_heads = outputs.attentions[0].shape[1]

    if head < 0 or head >= num_heads:
        raise ValueError(f"Head {head} out of range [0, {num_heads - 1}]")

    layers_data = []
    for layer_idx, layer_attn in enumerate(outputs.attentions):
        head_attn = layer_attn[0, head].float().cpu().numpy()  # (seq_len, seq_len)
        entropies = -np.sum(head_attn * np.log2(head_attn + 1e-12), axis=-1)
        layers_data.append({
            "layer": layer_idx,
            "attention": head_attn.tolist(),
            "meanEntropy": float(np.mean(entropies)),
            "maxAttention": float(np.max(head_attn)),
        })

    return {
        "inputText": text,
        "tokens": tokens,
        "tokenIds": token_ids,
        "head": head,
        "numLayers": num_layers,
        "numHeads": num_heads,
        "layers": layers_data,
    }
