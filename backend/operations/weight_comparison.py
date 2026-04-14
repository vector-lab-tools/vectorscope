"""
Weight Comparison: compare input embedding table vs output lm_head.
"""

import torch
import numpy as np
from models.session import session


def get_weight_comparison(sample_size: int = 2000) -> dict:
    """Compare input embeddings vs output unembedding weights."""
    if session.model is None:
        raise ValueError("No model loaded")

    embed_weight = session._get_embedding_table()
    lm_head_weight = session._get_lm_head_weight()

    if lm_head_weight is None:
        raise ValueError("No lm_head found — cannot compare")

    vocab_size, hidden_dim = embed_weight.shape
    weight_tied = embed_weight.data_ptr() == lm_head_weight.data_ptr()

    if weight_tied:
        return {
            "weightTied": True,
            "shape": [vocab_size, hidden_dim],
            "message": "Input and output weights are tied (same tensor). No comparison possible.",
        }

    # Sample tokens
    sample_n = min(sample_size, vocab_size)
    sample_indices = np.random.choice(vocab_size, sample_n, replace=False)

    with torch.no_grad():
        embed_sample = embed_weight[sample_indices].float()
        head_sample = lm_head_weight[sample_indices].float()

        # Per-token cosine similarity between input and output representations
        embed_normed = embed_sample / (embed_sample.norm(dim=1, keepdim=True) + 1e-10)
        head_normed = head_sample / (head_sample.norm(dim=1, keepdim=True) + 1e-10)
        cosine_sims = (embed_normed * head_normed).sum(dim=1).cpu().numpy()

        # Norms
        embed_norms = embed_sample.norm(dim=1).cpu().numpy()
        head_norms = head_sample.norm(dim=1).cpu().numpy()

    tokenizer = session.tokenizer
    sample_tokens = [tokenizer.decode([int(i)]) for i in sample_indices]

    # Sort by cosine similarity to find most/least aligned tokens
    sorted_idx = np.argsort(cosine_sims)
    most_different = [{"token": sample_tokens[i], "cosine": float(cosine_sims[i])} for i in sorted_idx[:20]]
    most_similar = [{"token": sample_tokens[i], "cosine": float(cosine_sims[i])} for i in sorted_idx[-20:][::-1]]

    return {
        "weightTied": False,
        "shape": [vocab_size, hidden_dim],
        "sampleTokens": sample_tokens,
        "cosineSimilarities": cosine_sims.tolist(),
        "embedNorms": embed_norms.tolist(),
        "headNorms": head_norms.tolist(),
        "stats": {
            "meanCosine": float(np.mean(cosine_sims)),
            "stdCosine": float(np.std(cosine_sims)),
            "minCosine": float(np.min(cosine_sims)),
            "maxCosine": float(np.max(cosine_sims)),
            "meanEmbedNorm": float(np.mean(embed_norms)),
            "meanHeadNorm": float(np.mean(head_norms)),
        },
        "mostDifferent": most_different,
        "mostSimilar": most_similar,
    }
