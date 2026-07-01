import { getAllTags, ItemView, Notice, TFile, WorkspaceLeaf } from "obsidian";
import type ObsidianInboxPlugin from "./main";
import { scanInboxNotes, type InboxNote } from "./scanner";
import { saveNote, discardNote, type ActionFile, type FileManagerLike, type VaultLike } from "./actions";

export const VIEW_TYPE_INBOX = "obsidian-inbox-triage-view";

export class InboxTriageView extends ItemView {
  private notes: InboxNote[] = [];
  private refreshTimer: number | null = null;

  constructor(leaf: WorkspaceLeaf, private readonly plugin: ObsidianInboxPlugin) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_INBOX;
  }

  getDisplayText(): string {
    return "收件箱整理";
  }

  getIcon(): string {
    return "inbox";
  }

  async onOpen(): Promise<void> {
    this.registerEvent(this.app.vault.on("create", () => this.scheduleRescan()));
    this.registerEvent(this.app.vault.on("delete", () => this.scheduleRescan()));
    this.registerEvent(this.app.vault.on("rename", () => this.scheduleRescan()));
    this.registerEvent(this.app.metadataCache.on("changed", () => this.scheduleRescan()));
    this.rescan();
  }

  async onClose(): Promise<void> {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
    }
  }

  private scheduleRescan(): void {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
    }
    this.refreshTimer = window.setTimeout(() => this.rescan(), 200);
  }

  rescan(): void {
    const { inboxFolder, inboxTag } = this.plugin.settings;
    this.notes = scanInboxNotes(
      this.app.vault.getMarkdownFiles(),
      (file) => {
        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache) return undefined;
        // getAllTags merges frontmatter tags with inline "#tag" tags found in the
        // note body, so the inbox tag can be matched from either source.
        return { tags: getAllTags(cache) ?? [], created: cache.frontmatter?.created, status: cache.frontmatter?.status };
      },
      inboxFolder,
      inboxTag
    );
    this.render();
  }

  private render(): void {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("obsidian-inbox-triage-view");

    if (this.notes.length === 0) {
      container.createEl("p", { text: "收件箱已清空。", cls: "obsidian-inbox-triage-empty" });
      return;
    }

    for (const note of this.notes) {
      const row = container.createDiv({ cls: "obsidian-inbox-triage-row" });

      const titleEl = row.createEl("a", { text: note.file.basename, cls: "obsidian-inbox-triage-title" });
      titleEl.addEventListener("click", () => {
        void this.app.workspace.getLeaf(false).openFile(note.file);
      });

      const buttons = row.createDiv({ cls: "obsidian-inbox-triage-buttons" });
      const saveBtn = buttons.createEl("button", { text: "保存" });
      const discardBtn = buttons.createEl("button", { text: "丢弃" });

      saveBtn.addEventListener("click", () => void this.handleSave(note, saveBtn, discardBtn));
      discardBtn.addEventListener("click", () => void this.handleDiscard(note, saveBtn, discardBtn));
    }
  }

  // `note.file` is a real TFile at runtime; these adapters narrow it back from
  // the minimal ActionFile shape so actions.ts has no runtime dependency on `obsidian`.
  private asTFile(file: ActionFile): TFile {
    if (!(file instanceof TFile)) {
      throw new Error(`Expected a TFile: ${file.path}`);
    }
    return file;
  }

  private fileManagerAdapter(): FileManagerLike {
    const app = this.app;
    return {
      processFrontMatter: (file, fn) => app.fileManager.processFrontMatter(this.asTFile(file), fn),
      renameFile: (file, newPath) => app.fileManager.renameFile(this.asTFile(file), newPath),
    };
  }

  private vaultAdapter(): VaultLike {
    const app = this.app;
    return {
      getAbstractFileByPath: (path) => app.vault.getAbstractFileByPath(path),
      createFolder: (path) => app.vault.createFolder(path),
      // FileManager.trashFile() (rather than Vault.trash()) respects the user's
      // configured file deletion preference (system trash vs. Obsidian's .trash).
      trash: (file) => app.fileManager.trashFile(this.asTFile(file)),
      read: (file) => app.vault.read(this.asTFile(file)),
      modify: (file, content) => app.vault.modify(this.asTFile(file), content),
    };
  }

  private async handleSave(note: InboxNote, saveBtn: HTMLButtonElement, discardBtn: HTMLButtonElement): Promise<void> {
    saveBtn.disabled = true;
    discardBtn.disabled = true;
    try {
      await saveNote(
        note.file,
        this.fileManagerAdapter(),
        this.vaultAdapter(),
        this.plugin.settings.inboxTag,
        this.plugin.settings.organizedFolder
      );
      this.notes = this.notes.filter((n) => n !== note);
      this.render();
    } catch (error) {
      new Notice(`保存失败：${error instanceof Error ? error.message : String(error)}`);
      saveBtn.disabled = false;
      discardBtn.disabled = false;
    }
  }

  private async handleDiscard(note: InboxNote, saveBtn: HTMLButtonElement, discardBtn: HTMLButtonElement): Promise<void> {
    saveBtn.disabled = true;
    discardBtn.disabled = true;
    try {
      await discardNote(note.file, this.vaultAdapter());
      this.notes = this.notes.filter((n) => n !== note);
      this.render();
    } catch (error) {
      new Notice(`丢弃失败：${error instanceof Error ? error.message : String(error)}`);
      saveBtn.disabled = false;
      discardBtn.disabled = false;
    }
  }
}
