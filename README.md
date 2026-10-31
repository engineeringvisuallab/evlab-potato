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

## EVCell (Milestones 3a-3b-1)
Own formula engine (no external library): SUM, AVERAGE, MIN, MAX, COUNT, COUNTA, IF, IFERROR, SUMIF, COUNTIF, ROUND, AND, OR, NOT, ABS, VLOOKUP, INDEX, MATCH. Anything else shows #NAME? with an explanation; invalid formulas show #ERROR / #REF! / #DIV/0! / #CIRC!.
Working: grid, formula bar, sheets, formats, row/column insert/delete/resize, undo/redo (50 steps), copy/paste, CSV import/export, sort (same-row formulas follow their row), filter by value (200 values max), freeze first row/column, merge/unmerge, find & replace (formulas are found but never replaced).
Limits: no cross-sheet formulas; pasted formulas keep their original references; merge keeps only the top-left value; sorting a range with merged cells is refused; inserting/deleting rows or columns removes an active filter; column/row resize is not undoable. Conditional formatting, data validation, charts: next step (3b-2). XLSX: 3c.

### EVCell 3b-2: conditional formatting, data validation, charts
Conditional formatting: rules greater/less/equal/not equal/between/contains/blank/non-blank with fill and text colour (no colour scales or icon sets). Updates automatically.
Data validation: whole number, decimal, list (dropdown), text length; "block" or "warn" mode. Only typed entries are checked; pasted values and existing values are not. Applying a rule replaces any rule that touches the selection.
Charts: column, bar, line, area, pie, drawn as SVG from the selected range and redrawn whenever source cells change. Move/resize by dragging, rename by double-clicking the title, change type from the header, delete with the X. To change a chart's source range, delete it and insert a new one. Charts are stored in the file but are NOT exported to CSV and will not be exported to XLSX. EVCell has no print/PDF output yet, so charts are not part of any printout.
Undo covers adding/removing rules and charts and chart type/title changes; chart move/resize is not undoable. Inserting/deleting rows or columns shifts rule and chart source ranges.

### EVCell 3c: XLSX and templates
Library: ExcelJS 4.4.0 (MIT), bundled in `src/vendor/exceljs.min.js` (licence file included), loaded only when you import/export XLSX.
**Export .xlsx keeps:** values, formulas (with cached results), bold/italic/text colour/fill/alignment/border, number formats (number, currency, percent, date), column widths, row heights, merges, first row/column freeze, data validation (number, list, text length), conditional formatting (greater/less/equal/not equal/between/contains), filter buttons. **Not exported:** charts, blank/non-blank formatting rules, which rows a value filter hides. Formulas with syntax errors are exported as plain text.
**Import .xlsx keeps:** the same list in reverse, plus dates (as date-formatted numbers), rich text and hyperlinks (as plain text). Shared formulas become plain values. **Not imported:** charts, images, pivot tables, macros, comments, colour scales/icon sets, validation that uses cell ranges, theme colours, Excel functions EVCell does not have (they show #NAME? with an explanation). Any border becomes a four-sided border. Old .xls files are refused. Limits: 10 MB, 50 sheets, 100,000 rows, 702 columns.
**Tested:** scripted export-then-import round trips (including all 18 templates) with ExcelJS. Not yet opened in real Microsoft Excel / LibreOffice, so Excel's own rendering of the exported file is unverified.
**Templates:** 18 spreadsheet templates plus a blank sheet. Every template formula is checked to calculate without errors. Example values are labelled "(sample)".

## EVPresent (Milestones 4a-4b)
Slides are normal HTML elements on a 960-unit canvas (16:9 = 960x540, 4:3 = 960x720); no canvas library. Text editing, Bangla/English input and accessibility are the browser's own.
**Working:** slides (5 layouts, duplicate, delete, reorder by buttons or drag, thumbnails, 16:9 / 4:3), text boxes, rectangle / ellipse / rounded shapes, horizontal lines, images (PNG/JPG/GIF/WebP/SVG, 3 MB), **tables** (1-20 rows x 1-10 columns, double-click a cell to type, add/remove last row/column, header row toggle and fill), **charts** (column, bar, line, area, pie; drawn with the same code as EVCell; data is edited as CSV in the side panel; data lives inside the slide and is not linked to EVCell), select / drag / corner-resize, **multi-select** (Shift+click, drag a box on empty slide, Ctrl+A), group move, **align** (to slide for one object, to the selection for several) and **distribute** (3+ objects), layer order (forward, backward, to front, to back), solid or **gradient** slide background (2 colours + angle), **editable theme** (heading font, body font, 4 colours), speaker notes, undo/redo (50 steps), autosave, full-screen presentation, zoom, and **PDF via the browser's print dialog**.
**PDF:** press "PDF / Print", then choose "Save as PDF" as the printer. One slide per page, page size 10in x 5.625in (16:9) or 10in x 7.5in (4:3). Text stays selectable. Turn on "Background graphics" if your browser asks. This is not a one-click download.
**Theme:** only objects set to a Theme colour/font follow theme changes. Objects created from the new layouts, and new shapes, do. Objects made earlier (or set to a custom colour) keep their own.
**Limits:** lines are horizontal/vertical only; text boxes do not auto-grow; table rows/columns are added or removed at the end only, cells cannot be merged or styled individually; chart data limited to 50 rows x 8 series; table/chart/image objects are not editable inline except table cells. Animations and transitions are deliberately not implemented (they would not survive export). Starter templates from the first milestone are converted to editable text boxes when first opened.
**Not yet:** PPTX export/import and the 16-template library (Milestone 4c).
