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
  trash(file: ActionFile, system: boolean): Promise<void>;
}

export async function saveNote(
  file: ActionFile,
  fileManager: FileManagerLike,
  vault: VaultLike,
  inboxTag: string,
  organizedFolder: string
): Promise<void> {
  await fileManager.processFrontMatter(file, (frontmatter) => {
    if (Array.isArray(frontmatter.tags)) {
      frontmatter.tags = (frontmatter.tags as unknown[]).filter((tag) => tag !== inboxTag);
    }
  });

  const normalizedFolder = organizedFolder.replace(/\/+$/, "");
  if (!vault.getAbstractFileByPath(normalizedFolder)) {
    await vault.createFolder(normalizedFolder);
  }

  await fileManager.renameFile(file, `${normalizedFolder}/${file.name}`);
}

export async function discardNote(file: ActionFile, vault: VaultLike): Promise<void> {
  await vault.trash(file, true);
}
