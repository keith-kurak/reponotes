// Checks that decide whether the rich (enriched-markdown) editor can save a
// note without changing it in ways the user did not make. When a check fails,
// the note editor switches to the plain markdown editor instead.

function normalize(markdown: string): string {
  return markdown.replace(/\r\n/g, "\n").replace(/\s+$/, "");
}

const ATX_HEADING = /^#{1,6}(\s|$)/;

/**
 * Removes blank lines next to an ATX heading ("# Title"). A heading is always
 * its own block, so these blank lines do not change the meaning. The editor
 * on Android writes one after a heading; the editor on iOS does not.
 */
function dropBlankLinesAroundHeadings(markdown: string): string {
  const lines = markdown.split("\n");
  return lines
    .filter((line, i) => {
      if (line.trim() !== "") return true;
      const prev = lines
        .slice(0, i)
        .reverse()
        .find((l) => l.trim() !== "");
      const next = lines.slice(i + 1).find((l) => l.trim() !== "");
      return !(
        (prev !== undefined && ATX_HEADING.test(prev)) ||
        (next !== undefined && ATX_HEADING.test(next))
      );
    })
    .join("\n");
}

/**
 * True when two markdown strings differ only in trailing whitespace or in
 * blank lines next to headings.
 */
export function isSameMarkdown(a: string, b: string): boolean {
  return (
    dropBlankLinesAroundHeadings(normalize(a)) ===
    dropBlankLinesAroundHeadings(normalize(b))
  );
}

/**
 * The rich editor drops trailing newlines. Put back the trailing whitespace of
 * the original file so a save does not add a whitespace-only change.
 */
export function withOriginalTrailingWhitespace(
  markdown: string,
  original: string,
): string {
  const trailing = original.match(/\s*$/)?.[0] ?? "";
  return normalize(markdown) + trailing;
}

// Characters the rich editor's serializer writes without escaping. If they
// appear as literal text, the saved markdown could load back as formatting.
const INLINE_MARKERS = /[*_`~\\[\]<]/;
// Literal block syntax at the start of a line, e.g. "# ", "- ", "1. ", "> ".
const BLOCK_MARKERS = /^\s*(#{1,6}\s|[-+*]\s|\d+[.)]\s|>)/m;

/**
 * Returns a short reason when the visible (plain) text of the rich editor has
 * literal markdown characters that would not survive a save, else null.
 */
export function findUnsafeLiteralMarkup(plainText: string): string | null {
  const inline = plainText.match(INLINE_MARKERS);
  if (inline) {
    return `the text has a literal "${inline[0]}" character`;
  }
  const block = plainText.match(BLOCK_MARKERS);
  if (block) {
    return `a line starts with "${block[1].trim()}"`;
  }
  return null;
}
