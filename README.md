# EVLab Potato (Milestone 1)
Dashboard, template gallery (starter set), shared file manager (IndexedDB). Editors come in Milestones 2-4.
## Run locally
ES modules need a web server (double-clicking index.html will not work).
- VS Code: install "Live Server", right-click index.html -> Open with Live Server
- or: `python -m http.server 8000` then open http://localhost:8000
## Publish
Push to GitHub, Settings -> Pages -> deploy from branch `main` / root. All paths are relative.
## Status
Working (needs your browser test): create, open, rename, duplicate, download, delete, search/sort, theme, storage info, backup export.
Not built yet: editors, import/export of docx/xlsx/pptx, backup restore, full template library.

## EVWrite DOCX (Milestone 2b-3)
Libraries are bundled in `src/vendor/` (no internet needed): mammoth 1.13.0 (BSD-2-Clause), docx 9.15.0 (MIT). Licence files are included.
**Import (.docx):** creates a NEW EVWrite document. Keeps headings, paragraphs, bold/italic, links, lists, tables, images. Does not keep: text colour, underline, fonts, page layout, headers/footers, comments, tracked changes, text boxes.
**Export (.docx):** keeps headings, bold/italic/underline, colour, highlight, font, size, alignment, line spacing, lists, tables, links, PNG/JPG/GIF/BMP images, page breaks, A4/Letter, header/footer/page number. Skips WebP/SVG images. Nested lists are flattened.
**Tested:** a scripted round-trip (export, then re-read with mammoth) and all 19 templates exporting without errors. Not yet opened in real Microsoft Word / LibreOffice, so layout fidelity is unverified.
