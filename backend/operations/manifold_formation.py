"""
Manifold Formation: extract PCA projections of hidden states at every layer
to show how the embedding space transforms through depth.

Returns 3D coordinates at each layer so the frontend can animate between them.
"""

from __future__ import annotations

import torch
import numpy as np
from sklearn.decomposition import PCA
from models.session import session


def get_manifold_formation(text: str, sample_tokens: int = 0) -> dict:
    """
    Compute PCA-3D projections of token representations at every layer.

    If text is short (< ~20 tokens), projects the actual token representations.
    If sample_tokens > 0, also samples from the vocabulary for context.
    """
    if session.model is None:
        raise ValueError("No model loaded")

    tokenizer = session.tokenizer
    model = session.model

    inputs = tokenizer(text, return_tensors="pt").to(model.device)
    token_ids = inputs["input_ids"][0].tolist()
    tokens = [tokenizer.decode([tid]) for tid in token_ids]
    seq_len = len(token_ids)

    with torch.no_grad():
        outputs = model(**inputs, output_hidden_states=True)

    hidden_states = outputs.hidden_states  # tuple of (batch, seq_len, hidden_dim)
    num_layers = len(hidden_states)

    # Fit a single PCA on the concatenation of all layers
    # so the projections are in the same coordinate space
    all_vectors = []
    for hs in hidden_states:
        all_vectors.append(hs[0].float().cpu().numpy())
    stacked = np.vstack(all_vectors)  # (num_layers * seq_len, hidden_dim)

    # Replace NaN/Inf with 0 for PCA stability
    stacked = np.nan_to_num(stacked, nan=0.0, posinf=0.0, neginf=0.0)

    pca = PCA(n_components=3)
    pca.fit(stacked)

    # Project each layer
    layers = []
    for layer_idx, hs in enumerate(hidden_states):
        hs_np = hs[0].float().cpu().numpy()
        hs_np = np.nan_to_num(hs_np, nan=0.0, posinf=0.0, neginf=0.0)
        coords = pca.transform(hs_np)  # (seq_len, 3)
        norms = np.linalg.norm(hs_np, axis=1)

        # Pairwise cosine similarity between token positions
        norm_safe = np.maximum(norms, 1e-12)
        normed = hs_np / norm_safe[:, None]
        cos_matrix = normed @ normed.T
        mean_cos = float(np.mean(cos_matrix[np.triu_indices(seq_len, k=1)])) if seq_len > 1 else 1.0

        layers.append({
            "layer": layer_idx,
            "coords3d": coords.tolist(),
            "norms": norms.tolist(),
            "meanNorm": float(np.mean(norms)),
            "meanCosSim": mean_cos,
        })

    # Variance explained by PCA
    var_explained = pca.explained_variance_ratio_.tolist()

    return {
        "inputText": text,
        "tokens": tokens,
        "tokenIds": token_ids,
        "numLayers": num_layers,
        "seqLen": seq_len,
        "layers": layers,
        "pcaVarianceExplained": var_explained,
    }
