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

    containerEl.createEl("p", {
      text:
        "这三个值需要和你自托管的 obsidian-inbox 服务端配置保持一致（默认值已对齐服务端默认配置）。" +
        "了解 obsidian-inbox 自托管方案：https://github.com/ghh-l-djl/obsidin-inbox",
    });

    new Setting(containerEl)
      .setName("收件箱文件夹")
      .setDesc("扫描这个文件夹下的笔记，需与服务端 VAULT_INBOX_SUBDIR 一致。")
      .addText((text) =>
        text.setValue(this.plugin.settings.inboxFolder).onChange(async (value) => {
          this.plugin.settings.inboxFolder = value || DEFAULT_SETTINGS.inboxFolder;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("收件箱标签")
      .setDesc("判定笔记为「未处理」的标签名。")
      .addText((text) =>
        text.setValue(this.plugin.settings.inboxTag).onChange(async (value) => {
          this.plugin.settings.inboxTag = value || DEFAULT_SETTINGS.inboxTag;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("已整理文件夹")
      .setDesc("点击「保存」时，笔记会被移动到这个文件夹。")
      .addText((text) =>
        text.setValue(this.plugin.settings.organizedFolder).onChange(async (value) => {
          this.plugin.settings.organizedFolder = value || DEFAULT_SETTINGS.organizedFolder;
          await this.plugin.saveSettings();
        })
      );
  }
}
