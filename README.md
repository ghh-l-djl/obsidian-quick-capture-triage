# Obsidian Inbox Triage

An optional Obsidian community plugin that adds a sidebar panel for triaging notes synced into your vault's inbox folder by the main [Obsidian Inbox](../README.md) server. For each untriaged note it shows a title and date with **保存** (save — strips the inbox tag and moves the note into your configured "organized" folder) and **丢弃** (discard — sends the note to Obsidian's trash) buttons.

This plugin has no runtime dependency on `pwa/` or `server/` — it never makes network calls and never touches git. It only reads and modifies files already present in the vault.

## Install (manual, until published to the community plugin store)

1. Run `npm install && npm run build` in this directory to produce `main.js`.
2. Create `<your-vault>/.obsidian/plugins/obsidian-inbox-triage/`.
3. Copy `main.js`, `manifest.json`, and `styles.css` into that folder.
4. In Obsidian, go to Settings → Community plugins, and enable **Obsidian Inbox Triage**.

## Settings

- **收件箱文件夹** (`inboxFolder`, default `inbox`) — the folder scanned for untriaged notes. Should match your server's `VAULT_INBOX_SUBDIR`.
- **收件箱标签** (`inboxTag`, default `inbox`) — the frontmatter tag that marks a note as untriaged.
- **已整理文件夹** (`organizedFolder`, default `已整理`) — where notes go when you click 保存.

See [`CLAUDE.md`](CLAUDE.md) / [`AGENTS.md`](AGENTS.md) / [`GEMINI.md`](GEMINI.md) for architecture and development details.
