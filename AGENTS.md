# Project rules

- Use the same public SVG asset for the header mark, footer mark, and favicon so brand graphics remain consistent.
- Use PanelButton and semantic panel toolbar tokens for workbench header controls to keep compact controls consistent and accessible.
- Keep navigation in one desktop bar with a native scenario selector and an overflow tools menu; wrap views on narrow screens to avoid crowding without hiding actions.
- Host the preserved frontend workbench through root TanStack Start routes so secure streaming AI endpoints deploy with the app; keep deterministic HL7 processing in the browser.
- Use Vite's `--app` flag in both root build scripts so TanStack's multi-environment builder generates client and server output rather than looking for a legacy index.html entry.
- AI validation input uses a closed vocabulary of structural failures, never raw HL7, bundles, values, diagnostic text or patient identifiers, because scrubbed and edited bundles may retain PHI.
- Persist terminal AI access failures in server-only ai_service_state; do not retry or clear denied access without owner recovery.