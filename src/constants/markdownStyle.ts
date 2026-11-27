import { useMemo } from "react";
import type { MarkdownStyle } from "react-native-enriched-markdown";

import { AppColors, useAppColors } from "./colors";

function createMarkdownStyle(c: AppColors): MarkdownStyle {
  const heading = { color: c.text };
  return {
    paragraph: { fontSize: 16, lineHeight: 24, color: c.text },
    h1: heading,
    h2: heading,
    h3: heading,
    h4: heading,
    h5: heading,
    h6: heading,
    strong: { color: c.text },
    em: { color: c.text },
    strikethrough: { color: c.textTertiary },
    link: { color: c.tint, underline: true },
    code: {
      color: c.text,
      backgroundColor: c.surface,
      borderColor: c.border,
    },
    codeBlock: {
      color: c.text,
      backgroundColor: c.surface,
      borderColor: c.border,
      borderRadius: 8,
      padding: 12,
    },
    blockquote: {
      color: c.textSecondary,
      borderColor: c.inputBorder,
      backgroundColor: c.surface,
    },
    list: {
      color: c.text,
      bulletColor: c.textSecondary,
      markerColor: c.textSecondary,
    },
    table: {
      color: c.text,
      headerTextColor: c.text,
      headerBackgroundColor: c.surface,
      rowEvenBackgroundColor: c.background,
      rowOddBackgroundColor: c.surface,
      borderColor: c.border,
    },
    taskList: {
      checkedColor: c.tint,
      borderColor: c.textTertiary,
      checkmarkColor: c.onTint,
      checkedTextColor: c.textTertiary,
    },
    thematicBreak: { color: c.border },
  };
}

/** Markdown renderer style that follows the light/dark color scheme. */
export function useMarkdownStyle(): MarkdownStyle {
  const colors = useAppColors();
  return useMemo(() => createMarkdownStyle(colors), [colors]);
}
