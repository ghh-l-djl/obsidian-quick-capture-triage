import { describe, expect, it } from "vitest";
import type { TFile } from "obsidian";
import { parseFrontmatterFromMarkdown, scanInboxNotes } from "./scanner";

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

  it("includes files that match the folder and status: inbox", () => {
    const file = makeFile("inbox/a.md", 1);
    const result = scanInboxNotes(
      [file],
      () => ({ status: "inbox", tags: [], created: "2026-06-19T10:00:00.000Z" }),
      "inbox",
      "inbox"
    );
    expect(result).toHaveLength(1);
    expect(result[0].file).toBe(file);
    expect(result[0].createdAt).toBe("2026-06-19T10:00:00.000Z");
  });

  it("keeps legacy inbox tags as a fallback match", () => {
    const file = makeFile("inbox/a.md", 1);
    const result = scanInboxNotes([file], () => ({ tags: ["inbox"] }), "inbox", "inbox");
    expect(result).toHaveLength(1);
  });

  it("excludes active files even when they are in the inbox folder", () => {
    const file = makeFile("inbox/a.md", 1);
    const result = scanInboxNotes([file], () => ({ status: "active", tags: [] }), "inbox", "inbox");
    expect(result).toHaveLength(0);
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

  it("matches a tag with a leading # the same as without, for inline body tags", () => {
    const file = makeFile("inbox/a.md", 1);
    const result = scanInboxNotes([file], () => ({ tags: ["#inbox"] }), "inbox", "inbox");
    expect(result).toHaveLength(1);
  });

  it("treats an empty inbox folder as the whole vault", () => {
    const file = makeFile("notes/deep/a.md", 1);
    const result = scanInboxNotes([file], () => ({ tags: ["inbox"] }), "", "inbox");
    expect(result).toHaveLength(1);
  });

  it("treats an empty inbox tag as requiring no tag at all", () => {
    const tagged = makeFile("inbox/a.md", 1);
    const untagged = makeFile("inbox/b.md", 2);
    const result = scanInboxNotes(
      [tagged, untagged],
      (file) => (file === tagged ? { tags: ["other"] } : undefined),
      "inbox",
      ""
    );
    expect(result).toHaveLength(2);
  });

  it("does not skip a file when the frontmatter lookup throws and no tag is required", () => {
    const file = makeFile("inbox/a.md", 1);
    const result = scanInboxNotes(
      [file],
      () => {
        throw new Error("cache miss");
      },
      "inbox",
      ""
    );
    expect(result).toHaveLength(1);
    expect(result[0].createdAt).toBeNull();
  });
});

describe("parseFrontmatterFromMarkdown", () => {
  it("extracts status, created, and empty tags from generated inbox notes", () => {
    const result = parseFrontmatterFromMarkdown(
      [
        "---",
        'created: "2026-07-02 00:11:33"',
        "source: human",
        "status: inbox",
        "publish_status: none",
        "tags: []",
        "sourceTags: []",
        "---",
        "",
        "body",
      ].join("\n")
    );

    expect(result).toEqual({
      created: "2026-07-02 00:11:33",
      status: "inbox",
      tags: [],
    });
  });

  it("extracts legacy inline inbox tags", () => {
    const result = parseFrontmatterFromMarkdown("---\ncreated: old\ntags: [inbox]\n---\n\nbody");

    expect(result).toEqual({
      created: "old",
      tags: ["inbox"],
    });
  });
});
