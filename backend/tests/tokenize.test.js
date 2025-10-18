import { describe, expect, it } from "vitest";

import { extractUnknownTokens, makeSnippet, tokenize } from "../src/training/tokenize.js";

describe("tokenize utilities", () => {
  it("tokenize splits alphanumeric tokens", () => {
    const tokens = tokenize("Skibidi toilet is wild frfr!!!");
    expect(tokens).toEqual(["skibidi", "toilet", "is", "wild", "frfr"]);
  });

  it("extractUnknownTokens skips stopwords and known phrases", () => {
    const tokens = extractUnknownTokens("That rizzler got the sigma grindset today", {
      knownPhrases: new Set(["rizzler"]),
      stopWords: new Set(["that", "got", "the", "today"]),
    });
    expect(tokens).toEqual(["sigma", "grindset"]);
  });

  it("makeSnippet centers around the needle when present", () => {
    const text = "This skibidi toilet meme absolutely went nuclear online last night.";
    const snippet = makeSnippet(text, "skibidi");
    expect(snippet.includes("skibidi")).toBe(true);
    expect(snippet.length).toBeLessThanOrEqual(200);
  });
});

