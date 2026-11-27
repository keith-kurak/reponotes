/// <reference types="bun" />

import { describe, expect, test } from "bun:test";

import type { SyncStatus } from "../syncState";
import { describeSyncStatus, formatRelativeTime } from "../syncStatusText";

const NOW = 1_800_000_000_000;
const idle: SyncStatus = {
  isSyncing: false,
  lastSyncedAt: null,
  lastError: null,
};

describe("formatRelativeTime", () => {
  test.each([
    [10_000, "just now"],
    [5 * 60_000, "5 min ago"],
    [3 * 3_600_000, "3 h ago"],
    [30 * 3_600_000, "yesterday"],
    [72 * 3_600_000, "3 days ago"],
  ])("%p ms ago is %p", (ago, text) => {
    expect(formatRelativeTime(NOW - (ago as number), NOW)).toBe(text as string);
  });
});

describe("describeSyncStatus", () => {
  test("syncing wins", () => {
    expect(
      describeSyncStatus(
        { ...idle, isSyncing: true, lastError: "x" },
        { pending: 2, conflicts: 1 },
        NOW,
      ).text,
    ).toBe("Syncing…");
  });

  test("error is shown until a good sync", () => {
    expect(
      describeSyncStatus(
        { ...idle, lastError: "Cannot reach GitHub." },
        { pending: 1, conflicts: 0 },
        NOW,
      ),
    ).toEqual({ text: "Sync failed: Cannot reach GitHub.", tone: "error" });
  });

  test("conflicts and other changes", () => {
    expect(describeSyncStatus(idle, { pending: 3, conflicts: 1 }, NOW)).toEqual(
      {
        text: "1 conflict to resolve · 2 changes not synced",
        tone: "warning",
      },
    );
  });

  test("one pending change", () => {
    expect(
      describeSyncStatus(idle, { pending: 1, conflicts: 0 }, NOW).text,
    ).toBe("1 change not synced");
  });

  test("up to date", () => {
    expect(
      describeSyncStatus(
        { ...idle, lastSyncedAt: NOW - 120_000 },
        { pending: 0, conflicts: 0 },
        NOW,
      ).text,
    ).toBe("Up to date · synced 2 min ago");
  });

  test("never synced", () => {
    expect(
      describeSyncStatus(idle, { pending: 0, conflicts: 0 }, NOW).text,
    ).toBe("Not synced yet");
  });
});
