---
layout: default
title: Getting Hugging Face API keys working
---

# Getting Hugging Face API keys working

[← Back to overview](./)

This is the step that trips every new user, so it has its own page. You only need to do this if you want to load **Llama** or **Mistral**. If you only use GPT-2 and Qwen3, skip to [the examples](examples.html).

Vectorscope talks to Hugging Face through the `transformers` library and `huggingface_hub`. For gated models (Llama, Mistral), Hugging Face requires that your account has accepted the model's licence and that a valid access token is present on your machine. If either is missing, the download fails with HTTP 403.

The walkthrough below takes about five minutes.

---

## 1. Create a Hugging Face account

Go to [huggingface.co/join](https://huggingface.co/join). A free account is enough; you do not need Pro.

![Hugging Face join page]({{ site.baseurl }}/screenshots/hf-01-join.png)

<p class="screenshot-note"><em>Figure 4. Hugging Face sign-up page at <code>huggingface.co/join</code>.</em></p>

Confirm your email address before continuing. Downloads will fail silently against an unconfirmed account.

---

## 2. Accept the licence on the model page

Each gated model has its own licence that you must accept once per account. The two Vectorscope cares about are:

- **Llama 3.2 1B.** [huggingface.co/meta-llama/Llama-3.2-1B](https://huggingface.co/meta-llama/Llama-3.2-1B)
- **Mistral 7B v0.3.** [huggingface.co/mistralai/Mistral-7B-v0.3](https://huggingface.co/mistralai/Mistral-7B-v0.3)

Open the model page while signed in. If the model is gated you will see an "Access gated model" box near the top. Fill in the short form (name, affiliation, intended use) and submit.

![Gated model access box]({{ site.baseurl }}/screenshots/hf-02-gated-form.png)

<p class="screenshot-note"><em>Figure 5. The access form on a gated model page. The exact wording varies by model, but every gated model has one.</em></p>

For Llama, Meta's licence approval is near-instant and comes back by email, usually within minutes. For Mistral, the approval is also quick in practice. If it is still "Pending" after an hour, check your inbox and spam folder.

The page will say **"You have been granted access to this model"** once approved. Reload the page if you've just submitted to make sure.

---

## 3. Create an access token

Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens).

Click **"New token"**. Give it a name you'll recognise (e.g. `vectorscope-local`), set the role to **Read**, and click **Generate**.

![Token creation form]({{ site.baseurl }}/screenshots/hf-03-new-token.png)

<p class="screenshot-note"><em>Figure 6. Token creation page. Read scope is sufficient for Vectorscope.</em></p>

Copy the token immediately. It starts with `hf_` and Hugging Face will not show it again. If you lose it, revoke it on the same page and create a new one.

Do not paste the token into a chat, a repository, or a cloud document.

---

## 4. Log in from the backend's virtual environment

The token has to be visible to the Python process that will download the weights, which means the backend's venv.

In the terminal where the backend is running, press Ctrl-C to stop it. Then, with the venv still activated:

```bash
pip install huggingface_hub
huggingface-cli login
```

Paste the token when prompted. You will see:

```
Login successful
Your token has been saved to /Users/you/.cache/huggingface/token
```

Answer `n` to "Add token as git credential?" unless you have a reason to want it there.

Restart the backend:

```bash
python main.py
```

![huggingface-cli login success]({{ site.baseurl }}/screenshots/hf-04-cli-login.png)

<p class="screenshot-note"><em>Figure 7. Successful login. The token is written to <code>~/.cache/huggingface/token</code> and picked up by every process started from that user account.</em></p>

---

## 5. Load the gated model in Vectorscope

In the Vectorscope header, open the model picker, select **Llama 3.2 1B** (or Mistral 7B), and click **Load**.

The first load downloads around 2.5 GB (Llama 1B) or 14 GB (Mistral 7B) to `~/.cache/huggingface/`. Subsequent loads are near-instant.

If the model loads, you are done. If it fails, see the next section.

---

## When it fails: HTTP 403

A 403 on download means Hugging Face is refusing you. There are only three real causes.

**Licence not accepted.** The most common. Re-open the model page in your browser, signed in, and check for "You have been granted access". If the page still shows the gated form, your request is pending or was declined.

**Token not visible to the backend process.** Confirm the token is saved:

```bash
cat ~/.cache/huggingface/token
```

If this prints nothing or "No such file", `huggingface-cli login` was run in a different shell or against a different user account. Re-run it with the backend's venv activated.

**Token revoked or expired.** Go back to [settings/tokens](https://huggingface.co/settings/tokens). If the token you created is missing or marked revoked, create a new one and re-run `huggingface-cli login`.

A 401 (rather than 403) means the token is syntactically invalid. Regenerate it.

---

## Rotating or removing the token

To replace the token:

```bash
huggingface-cli logout
huggingface-cli login     # paste the new token
```

To remove it entirely:

```bash
rm ~/.cache/huggingface/token
```

The token file is per-user, in plaintext. If your laptop is shared, treat it accordingly.

---

[Three worked examples →](examples.html)
