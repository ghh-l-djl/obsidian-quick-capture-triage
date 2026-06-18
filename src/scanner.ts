import type { TFile } from "obsidian";

export interface FrontmatterCacheLike {
  tags?: unknown;
  created?: unknown;
  [key: string]: unknown;
}

export interface InboxNote {
  file: TFile;
  createdAt: string | null;
}

function normalizeTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.map((tag) => String(tag));
  if (typeof tags === "string") return tags.split(",").map((tag) => tag.trim());
  return [];
}

function isInFolder(path: string, folder: string): boolean {
  const normalized = folder.replace(/\/+$/, "");
  return path.startsWith(`${normalized}/`);
}

export function scanInboxNotes(
  files: TFile[],
  getFrontmatter: (file: TFile) => FrontmatterCacheLike | undefined,
  inboxFolder: string,
  inboxTag: string
): InboxNote[] {
  const notes: InboxNote[] = [];

  for (const file of files) {
    if (!isInFolder(file.path, inboxFolder)) continue;

    let frontmatter: FrontmatterCacheLike | undefined;
    try {
      frontmatter = getFrontmatter(file);
    } catch {
      continue;
    }
    if (!frontmatter) continue;
    if (!normalizeTags(frontmatter.tags).includes(inboxTag)) continue;

    const createdAt = typeof frontmatter.created === "string" ? frontmatter.created : null;
    notes.push({ file, createdAt });
  }

  notes.sort((a, b) => {
    if (a.createdAt && b.createdAt) return b.createdAt.localeCompare(a.createdAt);
    if (a.createdAt) return -1;
    if (b.createdAt) return 1;
    return b.file.stat.ctime - a.file.stat.ctime;
  });

  return notes;
}
