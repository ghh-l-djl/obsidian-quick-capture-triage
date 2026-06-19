import { describe, expect, it, vi } from "vitest";
import { saveNote, discardNote, type ActionFile, type FileManagerLike, type VaultLike } from "./actions";

function makeFile(path: string, name: string): ActionFile {
  return { path, name };
}

describe("saveNote", () => {
  it("removes only the inbox tag and renames into the organized folder", async () => {
    const file = makeFile("inbox/2026-06-19-1000.md", "2026-06-19-1000.md");
    const capturedFrontmatter: Record<string, unknown> = { tags: ["inbox", "keep-me"], created: "2026-06-19" };
    const fileManager: FileManagerLike = {
      processFrontMatter: vi.fn(async (_file, fn) => {
        fn(capturedFrontmatter);
      }),
      renameFile: vi.fn(async () => {}),
    };
    const vault: VaultLike = {
      getAbstractFileByPath: vi.fn(() => null),
      createFolder: vi.fn(async () => ({})),
      trash: vi.fn(async () => {}),
    };

    await saveNote(file, fileManager, vault, "inbox", "已整理");

    expect(capturedFrontmatter.tags).toEqual(["keep-me"]);
    expect(capturedFrontmatter.created).toBe("2026-06-19");
    expect(vault.createFolder).toHaveBeenCalledWith("已整理");
    expect(fileManager.renameFile).toHaveBeenCalledWith(file, "已整理/2026-06-19-1000.md");
  });

  it("does not recreate the organized folder if it already exists", async () => {
    const file = makeFile("inbox/a.md", "a.md");
    const fileManager: FileManagerLike = {
      processFrontMatter: vi.fn(async (_file, fn) => fn({ tags: ["inbox"] })),
      renameFile: vi.fn(async () => {}),
    };
    const vault: VaultLike = {
      getAbstractFileByPath: vi.fn(() => ({})),
      createFolder: vi.fn(async () => ({})),
      trash: vi.fn(async () => {}),
    };

    await saveNote(file, fileManager, vault, "inbox", "已整理");

    expect(vault.createFolder).not.toHaveBeenCalled();
  });

  it("propagates rename errors without swallowing them", async () => {
    const file = makeFile("inbox/a.md", "a.md");
    const fileManager: FileManagerLike = {
      processFrontMatter: vi.fn(async (_file, fn) => fn({ tags: ["inbox"] })),
      renameFile: vi.fn(async () => {
        throw new Error("target already exists");
      }),
    };
    const vault: VaultLike = {
      getAbstractFileByPath: vi.fn(() => null),
      createFolder: vi.fn(async () => ({})),
      trash: vi.fn(async () => {}),
    };

    await expect(saveNote(file, fileManager, vault, "inbox", "已整理")).rejects.toThrow("target already exists");
  });
});

describe("discardNote", () => {
  it("trashes the file using Obsidian's configured trash behavior", async () => {
    const file = makeFile("inbox/a.md", "a.md");
    const vault: VaultLike = {
      getAbstractFileByPath: vi.fn(() => null),
      createFolder: vi.fn(async () => ({})),
      trash: vi.fn(async () => {}),
    };

    await discardNote(file, vault);

    expect(vault.trash).toHaveBeenCalledWith(file, true);
  });

  it("propagates trash errors", async () => {
    const file = makeFile("inbox/a.md", "a.md");
    const vault: VaultLike = {
      getAbstractFileByPath: vi.fn(() => null),
      createFolder: vi.fn(async () => ({})),
      trash: vi.fn(async () => {
        throw new Error("permission denied");
      }),
    };

    await expect(discardNote(file, vault)).rejects.toThrow("permission denied");
  });
});
