/// <reference types="bun" />

import { expect, test } from "bun:test";
import {
  findUnsafeLiteralMarkup,
  isSameMarkdown,
  withOriginalTrailingWhitespace,
} from "../richEditorSafety";
test("same markdown ignores trailing whitespace only", () => {
  expect(isSameMarkdown("# A\n\nb\n", "# A\n\nb")).toBe(true);
  expect(isSameMarkdown("# A\r\n", "# A")).toBe(true);
  expect(isSameMarkdown("- a", "* a")).toBe(false);
  expect(isSameMarkdown("a  b", "a b")).toBe(false);
});
test("restores original trailing whitespace", () => {
  expect(withOriginalTrailingWhitespace("x", "y\n")).toBe("x\n");
  expect(withOriginalTrailingWhitespace("x\n\n", "y")).toBe("x");
  expect(withOriginalTrailingWhitespace("x", "")).toBe("x");
});
test("unsafe literal markup", () => {
  expect(findUnsafeLiteralMarkup("plain café 🎉 text")).toBeNull();
  expect(findUnsafeLiteralMarkup("Title\nitem one\nitem two")).toBeNull();
  expect(findUnsafeLiteralMarkup("2 *x* 6")).toContain("*");
  expect(findUnsafeLiteralMarkup("snake_case")).toContain("_");
  expect(findUnsafeLiteralMarkup("wip [draft")).toContain("[");
  expect(findUnsafeLiteralMarkup("a\n# not heading")).toContain("#");
  expect(findUnsafeLiteralMarkup("a\n1. x")).toContain("1.");
  expect(findUnsafeLiteralMarkup("a - b")).toBeNull();
  expect(findUnsafeLiteralMarkup("-5 degrees")).toBeNull();
});
test("blank lines next to headings do not count", () => {
  expect(
    isSameMarkdown(
      "# Shopping\n- eggs\n- milk",
      "# Shopping\n\n- eggs\n- milk",
    ),
  ).toBe(true);
  expect(isSameMarkdown("intro\n\n## H\ntext", "intro\n## H\n\ntext")).toBe(
    true,
  );
  expect(isSameMarkdown("# H\n\n\n\npara", "# H\npara")).toBe(true);
  // Paragraph breaks elsewhere still count
  expect(isSameMarkdown("a\n\nb", "a\nb")).toBe(false);
  expect(isSameMarkdown("# H\na\n\nb", "# H\na\nb")).toBe(false);
  // "#tag" is not a heading
  expect(isSameMarkdown("#tag\n\nb", "#tag\nb")).toBe(false);
});
