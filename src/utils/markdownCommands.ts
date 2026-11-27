// Text commands for the plain markdown editor's keyboard toolbar. Each
// command takes the text and selection and returns the new text and selection.

export interface Selection {
  start: number;
  end: number;
}

export interface EditState {
  text: string;
  selection: Selection;
}

export type LinePrefixKind = "h1" | "h2" | "h3" | "bullet" | "checkbox";

const PREFIXES: Record<LinePrefixKind, string> = {
  h1: "# ",
  h2: "## ",
  h3: "### ",
  bullet: "- ",
  checkbox: "- [ ] ",
};

// Indentation, then an existing heading, task, bullet or numbered marker.
const LINE_PREFIX = /^(\s*)(#{1,6} |- \[[ xX]\] |[-*+] |\d+[.)] )?/;

/** Start of the first line and end of the last line that the selection touches. */
function selectedLines(text: string, selection: Selection) {
  const start = text.lastIndexOf("\n", selection.start - 1) + 1;
  const newline = text.indexOf("\n", selection.end);
  const end = newline === -1 ? text.length : newline;
  return { start, end };
}

/**
 * Sets a heading, bullet or checkbox marker on every selected line. If all
 * selected lines already have that marker, removes it instead (toggle).
 */
export function toggleLinePrefix(
  state: EditState,
  kind: LinePrefixKind,
): EditState {
  const { text, selection } = state;
  const prefix = PREFIXES[kind];
  const range = selectedLines(text, selection);
  const lines = text.slice(range.start, range.end).split("\n");

  const parsed = lines.map((line) => {
    const match = line.match(LINE_PREFIX)!;
    const indent = match[1];
    const marker = match[2] ?? "";
    return { indent, marker, rest: line.slice(indent.length + marker.length) };
  });
  // A checked task ("- [x] ") counts as a checkbox.
  const normalize = (marker: string) =>
    /^- \[[ xX]\] $/.test(marker) ? PREFIXES.checkbox : marker;
  const allHavePrefix = parsed.every((p) => normalize(p.marker) === prefix);

  const newLines = parsed.map(({ indent, rest }) =>
    allHavePrefix ? indent + rest : indent + prefix + rest,
  );
  const newBlock = newLines.join("\n");
  const newText = text.slice(0, range.start) + newBlock + text.slice(range.end);

  if (selection.start === selection.end && lines.length === 1) {
    const oldPrefixLength = parsed[0].indent.length + parsed[0].marker.length;
    const newPrefixLength = newLines[0].length - parsed[0].rest.length;
    const offsetInRest = Math.max(
      0,
      selection.start - range.start - oldPrefixLength,
    );
    const cursor = range.start + newPrefixLength + offsetInRest;
    return { text: newText, selection: { start: cursor, end: cursor } };
  }
  return {
    text: newText,
    selection: { start: range.start, end: range.start + newBlock.length },
  };
}

/** Wraps the selection in backticks, or removes them if already wrapped. */
export function toggleInlineCode(state: EditState): EditState {
  const { text, selection } = state;
  const { start, end } = selection;
  if (start > 0 && text[start - 1] === "`" && text[end] === "`") {
    return {
      text:
        text.slice(0, start - 1) + text.slice(start, end) + text.slice(end + 1),
      selection: { start: start - 1, end: end - 1 },
    };
  }
  return {
    text:
      text.slice(0, start) +
      "`" +
      text.slice(start, end) +
      "`" +
      text.slice(end),
    selection: { start: start + 1, end: end + 1 },
  };
}

/** Puts the selection (or an empty line) in a fenced code block. */
export function insertCodeBlock(state: EditState): EditState {
  const { text, selection } = state;
  const { start, end } = selection;
  const before = start > 0 && text[start - 1] !== "\n" ? "\n" : "";
  const after = end < text.length && text[end] !== "\n" ? "\n" : "";
  const code = text.slice(start, end);
  const open = before + "```\n";
  const block = open + code + "\n```" + after;
  const codeStart = start + open.length;
  return {
    text: text.slice(0, start) + block + text.slice(end),
    selection: { start: codeStart, end: codeStart + code.length },
  };
}

// A list item: indentation, then a task, bullet or numbered marker, then text.
const LIST_ITEM = /^(\s*)(?:(- \[[ xX]\] )|([-*+] )|(\d+)([.)]) )(.*)$/;

/**
 * Call after the text changed. If the change was Enter at the cursor on a
 * list item, returns the text with the list continued on the new line:
 * a bullet gets a bullet, a checkbox gets an unchecked checkbox, a numbered
 * item gets the next number. Enter on an empty item ends the list instead.
 * Returns null for any other change.
 */
export function continueListOnEnter(
  previous: EditState,
  nextText: string,
): EditState | null {
  const { text, selection } = previous;
  const { start, end } = selection;
  if (nextText !== text.slice(0, start) + "\n" + text.slice(end)) return null;

  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const newline = text.indexOf("\n", end);
  const lineEnd = newline === -1 ? text.length : newline;
  const match = text.slice(lineStart, start).match(LIST_ITEM);
  if (!match) return null;
  const [, indent, task, bullet, number, delimiter, itemText] = match;

  const restOfLine = text.slice(end, lineEnd);
  if (itemText.trim() === "" && restOfLine.trim() === "") {
    // Empty item: remove its marker and stay on that line.
    return {
      text: text.slice(0, lineStart) + text.slice(lineEnd),
      selection: { start: lineStart, end: lineStart },
    };
  }

  const marker = task
    ? "- [ ] "
    : bullet
      ? bullet
      : `${Number(number) + 1}${delimiter} `;
  const insert = "\n" + indent + marker;
  const cursor = start + insert.length;
  return {
    text: text.slice(0, start) + insert + text.slice(end),
    selection: { start: cursor, end: cursor },
  };
}

/**
 * Finds where a single newline was typed, by comparing the texts. Returns the
 * replaced range in `previous`, or null if the change was something else.
 * When several positions give the same text (next to other newlines),
 * `cursorBefore` (the cursor before the change) picks the position.
 */
export function findTypedNewline(
  previous: string,
  next: string,
  cursorBefore: number,
): Selection | null {
  let prefix = 0;
  while (
    prefix < previous.length &&
    prefix < next.length &&
    previous[prefix] === next[prefix]
  ) {
    prefix += 1;
  }
  let suffix = 0;
  while (
    suffix < previous.length - prefix &&
    suffix < next.length - prefix &&
    previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]
  ) {
    suffix += 1;
  }
  if (next.slice(prefix, next.length - suffix) !== "\n") return null;
  const end = previous.length - suffix;
  if (end !== prefix) {
    return { start: prefix, end }; // a selection was replaced: no ambiguity
  }
  // Inserting "\n" anywhere in a run of newlines gives the same text.
  let first = prefix;
  while (first > 0 && previous[first - 1] === "\n") first -= 1;
  const start =
    cursorBefore >= first && cursorBefore <= prefix ? cursorBefore : first;
  return { start, end: start };
}
