---
layout: default
title: Troubleshooting
---

# Troubleshooting

[← Back to overview](./)

The usual problems, in rough order of how often they come up.

## Frontend says "Backend unreachable"

The backend is not running, or it bound to a non-default port.

Confirm the backend is up:

```bash
curl http://localhost:8000/status
```

This should print JSON. If it prints nothing, the backend has crashed; check its terminal. If port 8000 is taken by another process, stop that process or change the backend port and the frontend `BACKEND_URL`.

## `ModuleNotFoundError: No module named 'torch'`

The virtual environment is not activated. Re-run:

```bash
source backend/.venv/bin/activate
```

Then `python main.py` again.

## `EADDRINUSE: port 3000 already in use`

Another Next.js dev server is running. Stop it, or start Vectorscope's on a different port:

```bash
PORT=3001 npm run dev
```

## Out of memory

Pick a smaller preset. GPT-2 runs comfortably in 8 GB. Anything above 1B parameters wants 16 GB or more. Mistral 7B needs 24 GB of unified memory on Apple Silicon or equivalent elsewhere. If you have less, swap will keep it running but each operation will be slow.

## Llama or Mistral: HTTP 403 on download

Gated. You have not accepted the licence, your token is missing, or your token is revoked. The full walkthrough is on the [API keys page](api-keys.html).

A one-line check:

```bash
cat ~/.cache/huggingface/token
```

If this prints nothing, run `huggingface-cli login` from the backend's activated venv.

## Slow generation on Apple Silicon

Confirm the backend is using MPS. The device is logged at startup, and the header indicator reports it. If it reports `cpu` on an Apple Silicon machine, your PyTorch build is CPU-only. Reinstall from [pytorch.org](https://pytorch.org/get-started/locally/) with the macOS wheels.

## CORS error in the browser console

The frontend's `BACKEND_URL` and the backend's CORS allow-list have drifted. By default the backend allows `http://localhost:3000`. If you are serving the frontend from somewhere else, edit `backend/main.py` to add that origin to the CORS middleware.

## First model load hangs for several minutes

That is the download. GPT-2 is roughly 500 MB; Llama 3.2 1B is 2.5 GB; Mistral 7B is 14 GB. The backend logs download progress. Once the weights are in `~/.cache/huggingface/`, subsequent loads are near-instant.

## 3D plots are empty

A plot with zero points usually means the operation returned an error that the UI did not surface. Open the browser console (F12 or Cmd-Option-I) and look for a fetch error on `/token-trajectory` or similar.

## Something else

File an issue at [github.com/vector-lab-tools/vectorscope/issues](https://github.com/vector-lab-tools/vectorscope/issues) with the backend terminal output and the browser console output. Include the model and operation.

[← Back to overview](./)
