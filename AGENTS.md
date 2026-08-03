# AGENTS.md — gyroscope-quotation

Guidance for coding agents working in this repository.

## Purpose

Email campaign / quotation tooling for Gyroscope Technology:
- Interactive email studio editor
- Portable self-contained email HTML build
- Quotation / document HTML
- Campaign send helper

## Read and edit these (source of truth)

| Path | Role |
|------|------|
| `email-studio.js` | Email studio engine (main app logic) |
| `email-advertisement.html` | Email ad editor shell (loads studio JS) |
| `gyroscope-document.html` | Quotation / document HTML |
| `build-portable.mjs` | Builds single-file portable email |
| `send-campaign.ps1` | PowerShell campaign send helper |
| `recipients.txt` | Recipient list (one email per line; `#` comments) |

Images used by the studio / brand:
- `gti-mark.png`
- `gyroscope-technology-logo-gti-transparent-web.png`

Prefer **`.js`**, **`.html`**, **`.mjs`**, and **`.ps1`** over everything else.

## Generated — do not hand-edit

| Path | Notes |
|------|--------|
| `email-advertisement.portable.html` | Output of `node build-portable.mjs`. Regenerate after changing `email-studio.js` or `email-advertisement.html`. |

## Ignore (noise / junk)

Do **not** open, edit, or base changes on:

- `New Text Document.txt` — scratch / leftover text
- `templates - Shortcut.lnk` — Windows shortcut, not source
- `.vscode/` — editor settings only
- Any other `.lnk`, scratch `.txt`, or OS junk files

## Workflow notes

1. **Edit source, then rebuild portable** when changing the email ad:
   ```bash
   node build-portable.mjs
   ```
   Commit both source changes and the regenerated `email-advertisement.portable.html` when the portable build is part of the deliverable.

2. **Keep changes scoped** to the files above. Do not invent new top-level apps or restructure the repo unless asked.

3. **Secrets / recipients**: treat `recipients.txt` and any SMTP/credentials in scripts as sensitive. Never commit real API keys or production mailing lists unless the user explicitly asks.

4. **Default branch**: `main`.

## Quick orientation

```
email-advertisement.html  →  loads  →  email-studio.js
                                      ↓
                         build-portable.mjs
                                      ↓
                    email-advertisement.portable.html  (standalone)

gyroscope-document.html   →  separate document/quotation page
send-campaign.ps1         →  sends using recipients.txt
```
