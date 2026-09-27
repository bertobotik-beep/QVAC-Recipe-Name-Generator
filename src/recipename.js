// QVAC Recipe Name Generator — core logic.
// completion() writes 3-5 casual, creative dish name ideas from a
// description or ingredient list. The one-shot example is real
// multi-turn history (not prose in the system prompt) so the small
// model is much less likely to parrot it verbatim regardless of input.

import { completion } from "@qvac/sdk";

function looksUnusable(text) {
  if (!text || text.trim().length === 0) return true;
  if (text.length > 80) return true;
  const bad = [
    "i cannot", "i can't", "as an ai", "i'm not able", "i do not have", "i don't have",
    "not enough information", "please provide more", "please try again",
    "i'd be happy to help", "could you provide", "can you provide", "i need more",
  ];
  const lower = text.toLowerCase();
  return bad.some((phrase) => lower.includes(phrase));
}

function cleanLine(line) {
  return line
    .replace(/^\s*\d+[.)]\s*/, "")
    .replace(/^[-*]\s*/, "")
    .replace(/^["']|["']$/g, "")
    .replace(/^\*+|\*+$/g, "")
    .trim();
}

const EXAMPLE_INPUT = "Spicy shrimp tossed with garlic, lime, and avocado over rice.";
const EXAMPLE_OUTPUT = `1. Spicy Shrimp Avocado Bowl
2. Garlic Lime Shrimp Rice
3. Zesty Shrimp & Avocado Rice Bowl
4. Fire Shrimp Avocado Delight
5. Lime Garlic Shrimp Bowl`;
const EXAMPLE_LINES = EXAMPLE_OUTPUT.split("\n").map(cleanLine).map((l) => l.toLowerCase());

function fallback(description) {
  const trimmed =
    description.length > 40 ? description.slice(0, 40).trim() + "..." : description;
  return [`${trimmed} Bowl`, `Homestyle ${trimmed}`, `${trimmed} Delight`];
}

export async function generate(modelId, description) {
  const run = completion({
    modelId,
    history: [
      {
        role: "system",
        content:
          "You invent short, catchy, casual dish names (like a home cook or food " +
          "blogger would use, not fine-dining menu language). Given a dish description " +
          "or ingredient list, output exactly 5 numbered name ideas (each under 7 " +
          "words), one per line, in this exact format:\n" +
          "1. <name>\n2. <name>\n3. <name>\n4. <name>\n5. <name>\n" +
          "Base every name only on the ingredients or description given. No other text.",
      },
      { role: "user", content: `Dish: ${EXAMPLE_INPUT}` },
      { role: "assistant", content: EXAMPLE_OUTPUT },
      { role: "user", content: `Dish: ${description}` },
    ],
    stream: true,
    completionOpts: { temperature: 0.85, maxTokens: 200 },
  });

  let text = "";
  for await (const token of run.tokenStream) text += token;

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    // Only keep lines that actually match the requested numbered format —
    // this drops any preamble/postamble sentence the model adds (e.g.
    // "Here are 5 name ideas:"), which would otherwise slip through as a
    // bogus extra "name".
    .filter((l) => /^\d+[.)]/.test(l))
    .map(cleanLine)
    .filter((l) => l.length > 0 && !looksUnusable(l))
    // Guard against the model parroting the one-shot example verbatim.
    .filter((l) => !EXAMPLE_LINES.includes(l.toLowerCase()));

  const names = [...new Set(lines)].slice(0, 5);

  if (names.length < 3) {
    return { names: fallback(description) };
  }
  return { names };
}
