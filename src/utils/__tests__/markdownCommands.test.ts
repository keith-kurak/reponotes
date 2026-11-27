/// <reference types="bun" />

import { describe, expect, test } from "bun:test";

import {
  continueListOnEnter,
  EditState,
  findTypedNewline,
  insertCodeBlock,
  toggleInlineCode,
  toggleLinePrefix,
} from "../markdownCommands";

/** Builds a state from text with "|" as the cursor or "[" "]" as a selection. */
function state(marked: string): EditState {
  if (marked.includes("|")) {
    const start = marked.indexOf("|");
    return { text: marked.replace("|", ""), selection: { start, end: start } };
  }
  const start = marked.indexOf("[");
  const end = marked.indexOf("]") - 1;
  return {
    text: marked.replace("[", "").replace("]", ""),
    selection: { start, end },
  };
}

/** The reverse of state(), for readable expectations. */
function mark({ text, selection }: EditState): string {
  if (selection.start === selection.end) {
    return text.slice(0, selection.start) + "|" + text.slice(selection.start);
  }
  return (
    text.slice(0, selection.start) +
    "[" +
    text.slice(selection.start, selection.end) +
    "]" +
    text.slice(selection.end)
  );
}

describe("toggleLinePrefix", () => {
  test("adds a heading and keeps the cursor in the text", () => {
    expect(mark(toggleLinePrefix(state("Tit|le"), "h1"))).toBe("# Tit|le");
  });

  test("replaces another heading level", () => {
    expect(mark(toggleLinePrefix(state("# Tit|le"), "h2"))).toBe("## Tit|le");
  });

  test("removes the same heading (toggle)", () => {
    expect(mark(toggleLinePrefix(state("## Tit|le"), "h2"))).toBe("Tit|le");
  });

  test("changes only the cursor's line", () => {
    expect(mark(toggleLinePrefix(state("a\nb|\nc"), "bullet"))).toBe(
      "a\n- b|\nc",
    );
  });

  test("cursor in the marker moves to the start of the text", () => {
    expect(mark(toggleLinePrefix(state("#|# H"), "h1"))).toBe("# |H");
  });

  test("bullets every selected line", () => {
    expect(mark(toggleLinePrefix(state("[one\ntwo]"), "bullet"))).toBe(
      "[- one\n- two]",
    );
  });

  test("turns a bullet into a checkbox and keeps indentation", () => {
    expect(mark(toggleLinePrefix(state("  - it|em"), "checkbox"))).toBe(
      "  - [ ] it|em",
    );
  });

  test("a checked task toggles off as a checkbox", () => {
    expect(mark(toggleLinePrefix(state("- [x] do|ne"), "checkbox"))).toBe(
      "do|ne",
    );
  });

  test("works on an empty note", () => {
    expect(mark(toggleLinePrefix(state("|"), "h3"))).toBe("### |");
  });
});

describe("toggleInlineCode", () => {
  test("wraps the selection", () => {
    expect(mark(toggleInlineCode(state("run [ls] now")))).toBe(
      "run `[ls]` now",
    );
  });

  test("unwraps a wrapped selection", () => {
    expect(mark(toggleInlineCode(state("run `[ls]` now")))).toBe(
      "run [ls] now",
    );
  });

  test("inserts backticks at the cursor", () => {
    expect(mark(toggleInlineCode(state("a |b")))).toBe("a `|`b");
  });
});

describe("insertCodeBlock", () => {
  test("fences the selection on its own lines", () => {
    expect(mark(insertCodeBlock(state("see [x = 1] here")))).toBe(
      "see \n```\n[x = 1]\n```\n here",
    );
  });

  test("inserts an empty block at the start of a line", () => {
    expect(mark(insertCodeBlock(state("a\n|")))).toBe("a\n```\n|\n```");
  });
});

describe("continueListOnEnter", () => {
  /** Presses Enter at the marked cursor and returns the continued text. */
  function enter(marked: string): string | null {
    const before = state(marked);
    const { start, end } = before.selection;
    const typed = before.text.slice(0, start) + "\n" + before.text.slice(end);
    const result = continueListOnEnter(before, typed);
    return result ? mark(result) : null;
  }

  test("continues a bullet", () => {
    expect(enter("- eggs|")).toBe("- eggs\n- |");
  });

  test("keeps the bullet character and indentation", () => {
    expect(enter("  * eggs|")).toBe("  * eggs\n  * |");
  });

  test("continues a checkbox unchecked, also after a checked one", () => {
    expect(enter("- [x] done|")).toBe("- [x] done\n- [ ] |");
  });

  test("numbers the next item", () => {
    expect(enter("9. nine|")).toBe("9. nine\n10. |");
    expect(enter("1) one|")).toBe("1) one\n2) |");
  });

  test("splits an item when the cursor is inside the text", () => {
    expect(enter("- eggs|milk")).toBe("- eggs\n- |milk");
  });

  test("Enter on an empty item ends the list", () => {
    expect(enter("- eggs\n- |")).toBe("- eggs\n|");
    expect(enter("- [ ] |\nnext")).toBe("|\nnext");
  });

  test("does nothing on a plain line", () => {
    expect(enter("hello|")).toBeNull();
    expect(enter("# Title|")).toBeNull();
  });

  test("does nothing for other edits", () => {
    const before = state("- eggs|");
    expect(continueListOnEnter(before, "- eggsx")).toBeNull();
    expect(continueListOnEnter(before, "- egg")).toBeNull();
  });
});

describe("findTypedNewline", () => {
  test("finds a newline typed at the end of a line", () => {
    expect(findTypedNewline("- a", "- a\n", 3)).toEqual({ start: 3, end: 3 });
  });

  test("uses the cursor before the change next to existing newlines", () => {
    // "- a|\nx": Enter after "- a"
    expect(findTypedNewline("- a\nx", "- a\n\nx", 3)).toEqual({
      start: 3,
      end: 3,
    });
    // "- a\n|x": Enter at the start of "x"
    expect(findTypedNewline("- a\nx", "- a\n\nx", 4)).toEqual({
      start: 4,
      end: 4,
    });
  });

  test("ignores other edits", () => {
    expect(findTypedNewline("abc", "abcd", 3)).toBeNull();
    expect(findTypedNewline("abc", "ab", 3)).toBeNull();
  });
});
