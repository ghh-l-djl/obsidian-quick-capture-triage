import { App, PluginSettingTab, Setting } from "obsidian";
import type ObsidianInboxPlugin from "./main";

export interface PluginSettings {
  inboxFolder: string;
  inboxTag: string;
  organizedFolder: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  inboxFolder: "inbox",
  inboxTag: "inbox",
  organizedFolder: "已整理",
};

export class InboxSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: ObsidianInboxPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const intro = containerEl.createDiv({ cls: "setting-item-description quick-capture-triage-intro" });
    intro.createDiv({ text: "侧边栏会列出「收件箱文件夹」下、带有「收件箱标签」的笔记，对每条笔记可以：" });
    const actions = intro.createEl("ul", { cls: "quick-capture-triage-list" });
    const saveItem = actions.createEl("li");
    saveItem.createEl("strong", { text: "保存" });
    saveItem.appendText(" — 移除收件箱标签，并把笔记移动到「已整理文件夹」");
    const discardItem = actions.createEl("li");
    discardItem.createEl("strong", { text: "丢弃" });
    discardItem.appendText(" — 把笔记移入 Obsidian 回收站");
    intro.createDiv({ text: "打开方式：点击左侧工具栏的收件箱图标，或运行命令「打开收件箱整理面板」。" });

    new Setting(containerEl).setName("匹配规则").setHeading();

    new Setting(containerEl)
      .setName("收件箱文件夹")
      .setDesc("扫描这个文件夹下的笔记，需与服务端 VAULT_INBOX_SUBDIR 一致。留空表示扫描整个 vault，不限制文件夹。")
      .addText((text) =>
        text.setValue(this.plugin.settings.inboxFolder).onChange(async (value) => {
          this.plugin.settings.inboxFolder = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("收件箱标签")
      .setDesc(
        "判定笔记为「未处理」的标签名，同时匹配 frontmatter 标签和正文里的 #标签。" +
          "留空表示不要求标签——收件箱文件夹下的所有笔记都会被当作未处理。"
      )
      .addText((text) =>
        text.setValue(this.plugin.settings.inboxTag).onChange(async (value) => {
          this.plugin.settings.inboxTag = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("已整理文件夹")
      .setDesc("点击「保存」时，笔记会被移动到这个文件夹。留空表示移动到 vault 根目录。")
      .addText((text) =>
        text.setValue(this.plugin.settings.organizedFolder).onChange(async (value) => {
          this.plugin.settings.organizedFolder = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl).setName("了解更多提效工具").setHeading();

    const footer = containerEl.createDiv({ cls: "setting-item-description quick-capture-triage-footer" });
    footer.createDiv({
      text: "我开发了一套完全免费开源、自托管的「随手记 → 自动同步」服务 obsidian-inbox，和本插件组成完整链路：",
    });
    const pipeline = footer.createEl("ol", { cls: "quick-capture-triage-list" });
    const captureItem = pipeline.createEl("li");
    captureItem.createEl("strong", { text: "随手记" });
    captureItem.appendText(" — 手机上快速记录文字、图片或链接，任何想到的内容");
    const syncItem = pipeline.createEl("li");
    syncItem.createEl("strong", { text: "自动同步" });
    syncItem.appendText(" — 增量发送到 Obsidian vault");
    const triageItem = pipeline.createEl("li");
    triageItem.createEl("strong", { text: "插件内整理" });
    triageItem.appendText(" — 本插件负责的「最后一公里」，一键把收件箱笔记分诊为已整理");
    const link = footer.createDiv();
    link.appendText("了解 obsidian-inbox 增量同步方案：");
    link.createEl("a", {
      text: "https://github.com/ghh-l-djl/obsidin-inbox",
      href: "https://github.com/ghh-l-djl/obsidin-inbox",
    });

    new Setting(containerEl)
      .setName("支持作者")
      .setDesc("如果这个插件对你有帮助，欢迎打赏支持后续开发。")
      .addButton((button) =>
        button
          .setButtonText("❤️ 打赏")
          .setCta()
          .onClick(() => {
            window.open("https://ghh-l-djl.github.io/");
          })
      );
  }
}
