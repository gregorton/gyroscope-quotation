# AGENTS.md — gyroscope-quotation

Guidance for coding agents working in this repository.

## Purpose

Quotation / document tooling for Gyroscope Technology:
- Quotation document HTML
- Campaign send helper (optional)

## Read and edit these (source of truth)

| Path | Role |
|------|------|
| `gyroscope-document.html` | Quotation / document HTML — **primary file** |
| `send-campaign.ps1` | PowerShell campaign send helper |
| `recipients.txt` | Recipient list (one email per line; `#` comments) |
| `email-studio.js` | Shared studio engine (only if still needed by other HTML) |
| `build-portable.mjs` | Build helper (only if a portable build is requested) |

Brand images:
- `gti-mark.png`
- `gyroscope-technology-logo-gti-transparent-web.png`

Prefer **`gyroscope-document.html`**, then **`.js`** / **`.ps1`**. Do not invent new email-ad pages unless asked.

## Deleted / do not recreate

These were removed from the repo. **Do not restore or recreate** unless the user explicitly asks:

- `email-advertisement.html`
- `email-advertisement.portable.html`

## Ignore (noise / junk)

Do **not** open, edit, or base changes on:

- Anything named `email-advertisement*` (removed; out of scope)
- `New Text Document.txt` — scratch / leftover text
- `templates - Shortcut.lnk` — Windows shortcut, not source
- `.vscode/` — editor settings only
- Any other `.lnk`, scratch `.txt`, or OS junk files

## Workflow notes

1. **Default work** is on `gyroscope-document.html` (quotations / documents).
2. **Keep changes scoped.** Do not rebuild an email-advertisement product unless asked.
3. **Secrets / recipients**: treat `recipients.txt` and any SMTP/credentials in scripts as sensitive. Never commit real API keys or production mailing lists unless the user explicitly asks.
4. **Default branch**: `main`.

## Quick orientation

```
gyroscope-document.html   →  quotation / document page (main focus)
send-campaign.ps1         →  sends using recipients.txt
email-studio.js           →  engine only if referenced; not an ad page
```
