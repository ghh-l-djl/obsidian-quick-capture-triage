import { describe, expect, it, vi } from "vitest";
import { saveNote, discardNote, type ActionFile, type FileManagerLike, type VaultLike } from "./actions";

function makeFile(path: string, name: string): ActionFile {
  return { path, name };
}

describe("saveNote", () => {
  it("removes only the inbox tag and renames into the organized folder", async () => {
    const file = makeFile("inbox/2026-06-19-1000.md", "2026-06-19-1000.md");
    const capturedFrontmatter: Record<string, unknown> = {
      status: "inbox",
      tags: ["inbox", "keep-me"],
      created: "2026-06-19",
    };
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
      read: vi.fn(async () => ""),
      modify: vi.fn(async () => {}),
    };

    await saveNote(file, fileManager, vault, "inbox", "已整理");

    expect(capturedFrontmatter.status).toBe("active");
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
      read: vi.fn(async () => ""),
      modify: vi.fn(async () => {}),
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
      read: vi.fn(async () => ""),
      modify: vi.fn(async () => {}),
    };

    await expect(saveNote(file, fileManager, vault, "inbox", "已整理")).rejects.toThrow("target already exists");
  });

  it("moves into the vault root and skips folder creation when organizedFolder is empty", async () => {
    const file = makeFile("inbox/a.md", "a.md");
    const fileManager: FileManagerLike = {
      processFrontMatter: vi.fn(async (_file, fn) => fn({ tags: ["inbox"] })),
      renameFile: vi.fn(async () => {}),
    };
    const vault: VaultLike = {
      getAbstractFileByPath: vi.fn(() => null),
      createFolder: vi.fn(async () => ({})),
      trash: vi.fn(async () => {}),
      read: vi.fn(async () => ""),
      modify: vi.fn(async () => {}),
    };

    await saveNote(file, fileManager, vault, "inbox", "");

    expect(vault.createFolder).not.toHaveBeenCalled();
    expect(fileManager.renameFile).toHaveBeenCalledWith(file, "a.md");
  });

  it("strips a standalone inline #tag from the body, so the note can't keep matching", async () => {
    const file = makeFile("inbox/a.md", "a.md");
    const fileManager: FileManagerLike = {
      processFrontMatter: vi.fn(async (_file, fn) => fn({})),
      renameFile: vi.fn(async () => {}),
    };
    const vault: VaultLike = {
      getAbstractFileByPath: vi.fn(() => null),
      createFolder: vi.fn(async () => ({})),
      trash: vi.fn(async () => {}),
      read: vi.fn(async () => "Buy milk #inbox tomorrow"),
      modify: vi.fn(async () => {}),
    };

    await saveNote(file, fileManager, vault, "inbox", "已整理");

    expect(vault.modify).toHaveBeenCalledWith(file, "Buy milk tomorrow");
  });

  it("leaves nested or unrelated tags untouched", async () => {
    const file = makeFile("inbox/a.md", "a.md");
    const fileManager: FileManagerLike = {
      processFrontMatter: vi.fn(async (_file, fn) => fn({})),
      renameFile: vi.fn(async () => {}),
    };
    const vault: VaultLike = {
      getAbstractFileByPath: vi.fn(() => null),
      createFolder: vi.fn(async () => ({})),
      trash: vi.fn(async () => {}),
      read: vi.fn(async () => "#inbox/draft and #other stay"),
      modify: vi.fn(async () => {}),
    };

    await saveNote(file, fileManager, vault, "inbox", "已整理");

    expect(vault.modify).not.toHaveBeenCalled();
  });

  it("does not touch the body when there is no matching inline tag to strip", async () => {
    const file = makeFile("inbox/a.md", "a.md");
    const fileManager: FileManagerLike = {
      processFrontMatter: vi.fn(async (_file, fn) => fn({ tags: ["inbox"] })),
      renameFile: vi.fn(async () => {}),
    };
    const vault: VaultLike = {
      getAbstractFileByPath: vi.fn(() => null),
      createFolder: vi.fn(async () => ({})),
      trash: vi.fn(async () => {}),
      read: vi.fn(async () => "plain body"),
      modify: vi.fn(async () => {}),
    };

    await saveNote(file, fileManager, vault, "inbox", "已整理");

    expect(vault.modify).not.toHaveBeenCalled();
  });

  it("skips the body read/strip entirely when no inbox tag is configured", async () => {
    const file = makeFile("inbox/a.md", "a.md");
    const fileManager: FileManagerLike = {
      processFrontMatter: vi.fn(async (_file, fn) => fn({})),
      renameFile: vi.fn(async () => {}),
    };
    const vault: VaultLike = {
      getAbstractFileByPath: vi.fn(() => null),
      createFolder: vi.fn(async () => ({})),
      trash: vi.fn(async () => {}),
      read: vi.fn(async () => "#inbox stays since no tag is configured"),
      modify: vi.fn(async () => {}),
    };

    await saveNote(file, fileManager, vault, "", "已整理");

    expect(vault.read).not.toHaveBeenCalled();
    expect(vault.modify).not.toHaveBeenCalled();
  });
});

describe("discardNote", () => {
  it("trashes the file using Obsidian's configured trash behavior", async () => {
    const file = makeFile("inbox/a.md", "a.md");
    const vault: VaultLike = {
      getAbstractFileByPath: vi.fn(() => null),
      createFolder: vi.fn(async () => ({})),
      trash: vi.fn(async () => {}),
      read: vi.fn(async () => ""),
      modify: vi.fn(async () => {}),
    };

    await discardNote(file, vault);

    expect(vault.trash).toHaveBeenCalledWith(file);
  });

  it("propagates trash errors", async () => {
    const file = makeFile("inbox/a.md", "a.md");
    const vault: VaultLike = {
      getAbstractFileByPath: vi.fn(() => null),
      createFolder: vi.fn(async () => ({})),
      trash: vi.fn(async () => {
        throw new Error("permission denied");
      }),
      read: vi.fn(async () => ""),
      modify: vi.fn(async () => {}),
    };

    await expect(discardNote(file, vault)).rejects.toThrow("permission denied");
  });
});
