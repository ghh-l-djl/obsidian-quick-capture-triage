export interface ActionFile {
  path: string;
  name: string;
}

export interface FileManagerLike {
  processFrontMatter(file: ActionFile, fn: (frontmatter: Record<string, unknown>) => void): Promise<void>;
  renameFile(file: ActionFile, newPath: string): Promise<void>;
}

export interface VaultLike {
  getAbstractFileByPath(path: string): unknown;
  createFolder(path: string): Promise<unknown>;
  trash(file: ActionFile): Promise<void>;
  read(file: ActionFile): Promise<string>;
  modify(file: ActionFile, content: string): Promise<void>;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Removes a standalone inline "#tag" (not "#tag/child" or "#sub-tag") from note
// body text, consuming one adjacent space so it doesn't leave a stray gap behind.
// This only catches the matching scanner.ts does for inline tags (scanner.ts) —
// it has no awareness of code fences, so a literal "#tag" inside a code block
// would also be stripped.
function stripInlineTag(content: string, tag: string): string {
  const escaped = escapeRegExp(tag);
  const pattern = new RegExp(`[ \\t]?(?<![\\w/-])#${escaped}(?![\\w/-])`, "g");
  return content.replace(pattern, "");
}

export async function saveNote(
  file: ActionFile,
  fileManager: FileManagerLike,
  vault: VaultLike,
  inboxTag: string,
  organizedFolder: string
): Promise<void> {
  await fileManager.processFrontMatter(file, (frontmatter) => {
    frontmatter.status = "active";

    if (Array.isArray(frontmatter.tags)) {
      frontmatter.tags = (frontmatter.tags as unknown[]).filter((tag) => tag !== inboxTag);
    }
  });

  if (inboxTag.trim().length > 0) {
    const content = await vault.read(file);
    const stripped = stripInlineTag(content, inboxTag);
    if (stripped !== content) {
      await vault.modify(file, stripped);
    }
  }

  const normalizedFolder = organizedFolder.trim().replace(/\/+$/, "");
  if (normalizedFolder && !vault.getAbstractFileByPath(normalizedFolder)) {
    await vault.createFolder(normalizedFolder);
  }

  const newPath = normalizedFolder ? `${normalizedFolder}/${file.name}` : file.name;
  await fileManager.renameFile(file, newPath);
}

export async function discardNote(file: ActionFile, vault: VaultLike): Promise<void> {
  await vault.trash(file);
}
