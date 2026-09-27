# QVAC Recipe Name Generator

Enter a dish description or ingredient list and an on-device AI writes 3-5 creative, casual name ideas for that dish. No cloud call, no API key.

## Run

```bash
npm install
npm start
```

Then open http://localhost:31018

Requires Node.js >= 22.17 (see `engines` in `package.json`).

## QVAC SDK version

`@qvac/sdk` ^0.19.0 (see `package.json`).

## How it works

Built on [Tether's QVAC SDK](https://www.npmjs.com/package/@qvac/sdk) — all inference runs on-device, no cloud call, no API key.

1. `loadModel({ modelSrc: LLAMA_3_2_1B_INST_Q4_0 })` loads the model once at startup, before the HTTP server starts accepting requests.
2. Each `POST /api/recipename` request calls `completion()` with a one-shot example baked into the chat history (a real user/assistant turn, not just prose instructions) and streams the reply token-by-token via `run.tokenStream`.
3. `unloadModel({ modelId })` releases the model on `SIGINT`/`SIGTERM`.

The response is passed through `generate()` in `src/recipename.js`, which keeps only lines that actually match the requested numbered format (dropping any preamble sentence like "Here are 5 name ideas:"), strips numbering/quotes/markdown, drops anything that looks like a refusal or is over 80 characters, and de-duplicates. If fewer than 3 usable names survive, a deterministic fallback (built directly from the dish description, no model involved) is returned instead.

### Example

Input:

> Spicy shrimp tossed with garlic, lime, and avocado over rice.

Output:

```
1. Spicy Shrimp Avocado Bowl
2. Garlic Lime Shrimp Rice
3. Zesty Shrimp & Avocado Rice Bowl
4. Fire Shrimp Avocado Delight
5. Lime Garlic Shrimp Bowl
```

This exact pair is also the one-shot example baked into the prompt (see `EXAMPLE_INPUT`/`EXAMPLE_OUTPUT` in `src/recipename.js`), and the code explicitly filters out any of these lines if the model parrots them back for an unrelated dish.

## License

MIT
