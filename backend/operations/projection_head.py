"""
Projection Head inspection: extract and analyse the lm_head / unembedding matrix.
"""

import torch
import numpy as np
from sklearn.decomposition import PCA
from models.session import session


def get_projection_head(sample_size: int = 5000) -> dict:
    """Extract lm_head weight, compute stats, project a sample to 3D."""
    if session.model is None:
        raise ValueError("No model loaded")

    lm_head_weight = session._get_lm_head_weight()
    if lm_head_weight is None:
        raise ValueError("No lm_head found in this model")

    # lm_head shape: (vocab_size, hidden_dim) — same as embedding table
    vocab_size, hidden_dim = lm_head_weight.shape

    # Check weight tying
    embed_weight = session._get_embedding_table()
    weight_tied = embed_weight.data_ptr() == lm_head_weight.data_ptr()

    # Compute norms
    with torch.no_grad():
        norms = torch.norm(lm_head_weight.float(), dim=1).cpu().numpy()

    mean_norm = float(np.mean(norms))
    std_norm = float(np.std(norms))
    min_norm = float(np.min(norms))
    max_norm = float(np.max(norms))

    # Effective rank
    with torch.no_grad():
        matrix = lm_head_weight.float().cpu()
        if vocab_size > 10000:
            indices = np.random.choice(vocab_size, 10000, replace=False)
            matrix = matrix[indices]
        svd = torch.linalg.svdvals(matrix)
        svd_norm = svd / svd.sum()
        entropy = -(svd_norm * torch.log(svd_norm + 1e-10)).sum()
        effective_rank = float(torch.exp(entropy))

    # Isotropy
    with torch.no_grad():
        sample_idx = np.random.choice(vocab_size, min(1000, vocab_size), replace=False)
        sample_vecs = lm_head_weight[sample_idx].float()
        sample_normed = sample_vecs / (sample_vecs.norm(dim=1, keepdim=True) + 1e-10)
        cos_matrix = sample_normed @ sample_normed.T
        mask = ~torch.eye(len(sample_idx), dtype=torch.bool)
        isotropy_score = float(1.0 - cos_matrix[mask].mean().abs())

    # Sample tokens for 3D projection
    sample_n = min(sample_size, vocab_size)
    sample_indices = np.random.choice(vocab_size, sample_n, replace=False)

    with torch.no_grad():
        sample_vectors = lm_head_weight[sample_indices].float().cpu().numpy()

    pca = PCA(n_components=3)
    coords_3d = pca.fit_transform(sample_vectors)

    tokenizer = session.tokenizer
    sample_tokens = [tokenizer.decode([int(i)]) for i in sample_indices]
    sample_norms = norms[sample_indices].tolist()

    return {
        "shape": [vocab_size, hidden_dim],
        "weightTied": weight_tied,
        "stats": {
            "meanNorm": mean_norm,
            "stdNorm": std_norm,
            "minNorm": min_norm,
            "maxNorm": max_norm,
            "effectiveRank": effective_rank,
            "isotropyScore": isotropy_score,
        },
        "sampleTokens": sample_tokens,
        "sampleCoords3d": coords_3d.tolist(),
        "sampleNorms": sample_norms,
    }
