import type { TFile } from "obsidian";

export interface FrontmatterCacheLike {
  tags?: unknown;
  created?: unknown;
  status?: unknown;
  [key: string]: unknown;
}

export interface InboxNote {
  file: TFile;
  createdAt: string | null;
}

// Strips a leading "#" so legacy frontmatter tags ("inbox") and inline body
// tags ("#inbox", as returned by Obsidian's getAllTags()) compare equal.
function normalizeTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.map((tag) => String(tag).replace(/^#/, ""));
  if (typeof tags === "string") return tags.split(",").map((tag) => tag.trim().replace(/^#/, ""));
  return [];
}

function unquoteYamlScalar(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseInlineArray(value: string): string[] | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return null;
  const inner = trimmed.slice(1, -1).trim();
  if (!inner) return [];
  return inner.split(",").map((item) => unquoteYamlScalar(item));
}

export function parseFrontmatterFromMarkdown(content: string): FrontmatterCacheLike | undefined {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return undefined;

  const frontmatter: FrontmatterCacheLike = {};
  const lines = match[1].split(/\r?\n/);

  for (const line of lines) {
    const scalar = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!scalar) continue;

    const [, key, rawValue] = scalar;
    if (key !== "created" && key !== "status" && key !== "tags") continue;

    if (key === "tags") {
      frontmatter.tags = parseInlineArray(rawValue) ?? unquoteYamlScalar(rawValue);
    } else {
      frontmatter[key] = unquoteYamlScalar(rawValue);
    }
  }

  return frontmatter;
}

function isInFolder(path: string, folder: string): boolean {
  const normalized = folder.trim().replace(/\/+$/, "");
  if (!normalized) return true;
  return path.startsWith(`${normalized}/`);
}

export function scanInboxNotes(
  files: TFile[],
  getFrontmatter: (file: TFile) => FrontmatterCacheLike | undefined,
  inboxFolder: string,
  inboxTag: string
): InboxNote[] {
  const requireTag = inboxTag.trim().length > 0;
  const notes: InboxNote[] = [];

  for (const file of files) {
    if (!isInFolder(file.path, inboxFolder)) continue;

    let frontmatter: FrontmatterCacheLike | undefined;
    try {
      frontmatter = getFrontmatter(file);
    } catch {
      if (requireTag) continue;
      frontmatter = undefined;
    }

    if (requireTag) {
      const hasInboxStatus = frontmatter?.status === "inbox";
      const hasLegacyInboxTag = frontmatter ? normalizeTags(frontmatter.tags).includes(inboxTag) : false;

      if (!hasInboxStatus && !hasLegacyInboxTag) continue;
    }

    const createdAt = typeof frontmatter?.created === "string" ? frontmatter.created : null;
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
