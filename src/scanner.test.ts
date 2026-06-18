import { describe, expect, it } from "vitest";
import type { TFile } from "obsidian";
import { scanInboxNotes } from "./scanner";

function makeFile(path: string, ctime: number): TFile {
  return { path, stat: { ctime, mtime: ctime, size: 0 } } as unknown as TFile;
}

describe("scanInboxNotes", () => {
  it("excludes files outside the inbox folder", () => {
    const file = makeFile("notes/a.md", 1);
    const result = scanInboxNotes([file], () => ({ tags: ["inbox"] }), "inbox", "inbox");
    expect(result).toHaveLength(0);
  });

  it("excludes files in the inbox folder without the inbox tag", () => {
    const file = makeFile("inbox/a.md", 1);
    const result = scanInboxNotes([file], () => ({ tags: ["other"] }), "inbox", "inbox");
    expect(result).toHaveLength(0);
  });

  it("includes files that match both the folder and the tag", () => {
    const file = makeFile("inbox/a.md", 1);
    const result = scanInboxNotes(
      [file],
      () => ({ tags: ["inbox"], created: "2026-06-19T10:00:00.000Z" }),
      "inbox",
      "inbox"
    );
    expect(result).toHaveLength(1);
    expect(result[0].file).toBe(file);
    expect(result[0].createdAt).toBe("2026-06-19T10:00:00.000Z");
  });

  it("skips files whose frontmatter cache lookup throws", () => {
    const file = makeFile("inbox/a.md", 1);
    const result = scanInboxNotes(
      [file],
      () => {
        throw new Error("cache miss");
      },
      "inbox",
      "inbox"
    );
    expect(result).toHaveLength(0);
  });

  it("sorts newest-first by created, falling back to ctime when created is missing", () => {
    const older = makeFile("inbox/older.md", 100);
    const newer = makeFile("inbox/newer.md", 200);
    const result = scanInboxNotes([older, newer], () => ({ tags: ["inbox"] }), "inbox", "inbox");
    expect(result.map((n) => n.file)).toEqual([newer, older]);
  });

  it("accepts a comma-separated string for tags", () => {
    const file = makeFile("inbox/a.md", 1);
    const result = scanInboxNotes([file], () => ({ tags: "inbox, other" }), "inbox", "inbox");
    expect(result).toHaveLength(1);
  });
});
