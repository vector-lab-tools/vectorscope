"""
Layer Probe: extract hidden states at a specific layer for given text.
"""

import torch
import numpy as np
from models.session import session


def get_layer_probe(text: str, layer: int) -> dict:
    """Extract hidden states at a specific layer, compute token similarities."""
    if session.model is None:
        raise ValueError("No model loaded")

    tokenizer = session.tokenizer
    model = session.model

    num_layers = session.info.num_layers
    if layer < 0 or layer > num_layers:
        raise ValueError(f"Layer must be between 0 and {num_layers}")

    inputs = tokenizer(text, return_tensors="pt").to(model.device)
    token_ids = inputs["input_ids"][0].tolist()
    tokens = [tokenizer.decode([tid]) for tid in token_ids]

    with torch.no_grad():
        outputs = model(**inputs, output_hidden_states=True)

    # hidden_states is a tuple of (batch, seq_len, hidden_dim), one per layer + input embeddings
    hidden_state = outputs.hidden_states[layer]  # (1, seq_len, hidden_dim)
    hs = hidden_state[0].float()  # (seq_len, hidden_dim)

    # Norms
    norms = hs.norm(dim=1).cpu().numpy().tolist()

    # Pairwise cosine similarity between token positions
    hs_normed = hs / (hs.norm(dim=1, keepdim=True) + 1e-10)
    cos_matrix = (hs_normed @ hs_normed.T).cpu().numpy()

    # Hidden state vectors (for client-side PCA if needed)
    vectors = hs.cpu().numpy().tolist()

    return {
        "inputText": text,
        "layer": layer,
        "numLayers": num_layers,
        "tokens": tokens,
        "tokenIds": token_ids,
        "norms": norms,
        "tokenSimilarities": cos_matrix.tolist(),
        "vectors": vectors,
    }
