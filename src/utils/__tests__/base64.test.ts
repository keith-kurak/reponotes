/// <reference types="bun" />

import { describe, expect, test } from "bun:test";

import { decodeBase64Utf8, encodeBase64Utf8 } from "../base64";

const samples = [
  "",
  "plain ASCII",
  "# Café notes\n\nNaïve résumé — “quotes” and emoji 🎉 ✅\n",
  "𝄞 中文 ñ",
];

describe("base64 UTF-8", () => {
  test.each(samples)("matches Buffer and round-trips: %p", (text) => {
    const encoded = encodeBase64Utf8(text);
    expect(encoded).toBe(Buffer.from(text, "utf8").toString("base64"));
    expect(decodeBase64Utf8(encoded)).toBe(text);
  });

  test("decodes base64 with line breaks (GitHub API format)", () => {
    const wrapped = Buffer.from("hello world\n", "utf8")
      .toString("base64")
      .replace(/(.{4})/g, "$1\n");
    expect(decodeBase64Utf8(wrapped)).toBe("hello world\n");
  });

  test("replaces a truncated multi-byte sequence", () => {
    // "é" is C3 A9; drop the last byte.
    const truncated = Buffer.from([0x61, 0xc3]).toString("base64");
    expect(decodeBase64Utf8(truncated)).toBe("a�");
  });
});
