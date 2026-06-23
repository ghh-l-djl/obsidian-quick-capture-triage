import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, InboxSettingTab, type PluginSettings } from "./settings";
import { InboxTriageView, VIEW_TYPE_INBOX } from "./view";

export default class ObsidianInboxPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(VIEW_TYPE_INBOX, (leaf) => new InboxTriageView(leaf, this));

    this.addRibbonIcon("inbox", "收件箱整理", () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-inbox-triage-view",
      name: "打开收件箱整理面板",
      callback: () => this.activateView(),
    });

    this.addSettingTab(new InboxSettingTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    const data = (await this.loadData()) as Partial<PluginSettings> | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data ?? {});
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_INBOX)) {
      if (leaf.view instanceof InboxTriageView) {
        leaf.view.rescan();
      }
    }
  }

  private async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_INBOX)[0];
    if (!leaf) {
      leaf = workspace.getRightLeaf(false) ?? workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE_INBOX, active: true });
    }
    await workspace.revealLeaf(leaf);
  }
}
