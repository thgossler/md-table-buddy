<!-- SHIELDS -->
<div align="center">

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/thgossler.md-table-buddy?style=flat-square&label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=thgossler.md-table-buddy)

</div>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/thgossler/md-table-buddy">
    <img src="images/icon.png" alt="Logo" width="80" height="80">
  </a>
  <h1 align="center">Table Buddy</h1>
  <p align="center">
    VS Code extension for Markdown tables with compact mode, max-width formatting, and smart features.
    <br />
    <a href="https://github.com/thgossler/md-table-buddy/issues">Report Bug</a>
    ·
    <a href="https://github.com/thgossler/md-table-buddy/issues">Request Feature</a>
    ·
    <a href="https://github.com/thgossler/md-table-buddy#contributing">Contribute</a>
    ·
    <a href="https://github.com/sponsors/thgossler">Sponsor project</a>
    ·
    <a href="https://www.paypal.com/donate/?hosted_button_id=JVG7PFJ8DMW7J">Sponsor via PayPal</a>
  </p>
</div>

# Introduction

A powerful Visual Studio Code extension for working with Markdown tables. Features unique capabilities like **compact mode**, **smart max-width formatting**, **row numbers**, **table transposition**, **smart mode detection**, and **multiple sort options** that you won't find in other extensions.

## ✨ Unique Features

### 🗜️ Compact Tables

Unlike other extensions that only "prettify" tables, Table Buddy offers true **compact mode** - minimizing whitespace for cleaner diffs and smaller file sizes.

**Before (formatted):**
```markdown
| Name       | Age | City        |
|------------|-----|-------------|
| John Doe   | 30  | New York    |
| Jane Smith | 25  | Los Angeles |
```

**After (compact):**
```markdown
|Name|Age|City|
|---|---|---|
|John Doe|30|New York|
|Jane Smith|25|Los Angeles|
```

**Compact with padding (configurable):**
```markdown
| Name | Age | City |
| --- | --- | --- |
| John Doe | 30 | New York |
| Jane Smith | 25 | Los Angeles |
```

### 📏 Smart Max-Width Formatting

Keep your tables readable within a configurable maximum width **without truncating long content**. Table Buddy intelligently formats tables so that:

- Columns are aligned and padded to fit within `maxWidth`
- Rows with long content gracefully exceed the limit rather than being truncated
- Short rows remain beautifully aligned

**With `maxWidth: 80`:**
```markdown
| ID | Name            | Description                               |
| -- | --------------- | ----------------------------------------- |
| 1  | Widget          | A small component                         |
| 2  | Super Long Item | This description is very long and will exceed the max width limit naturally |
| 3  | Gadget          | Another component                         |
```

The separator and short rows stay within 80 characters, while row 2's long content is preserved without breaking the table structure.

### 📐 Pandoc Column Width Hints

> **Pro Tip for Pandoc Users:** Control your PDF column widths directly from Markdown!

When exporting Markdown to PDF or other formats using **Pandoc**, the **relative lengths of dashes in separator cells** determine column width proportions. Table Buddy can preserve these ratios with `keepSeparatorRatios: true`.

**Original table with custom separator widths:**
```markdown
| Name | Description                                               |
|------|-----------------------------------------------------------|
| API  | The main application programming interface for the system |
```

Now set custom separator ratios (1:12 ratio = ~8% : ~92% width):
```markdown
| Name | Description                                              |
|-----|--------------------------------------------------------------|
| API  | The main application programming interface for the system |
```

With `keepSeparatorRatios: true`, formatting and compacting preserve these proportions, ensuring Pandoc renders "Description" much wider than "Name" in the PDF output.

### 🔢 Row Numbers

Automatically add, update, or remove row numbers - a feature unique to Table Buddy.

**Add Row Numbers:**
```markdown
| # | Name       | Age | City        |
|--:|------------|-----|-------------|
| 1 | John Doe   | 30  | New York    |
| 2 | Jane Smith | 25  | Los Angeles |
| 3 | Bob Wilson | 35  | Chicago     |
```

- Configurable starting number (default: 1)
- Configurable header text (default: "#")
- Configurable alignment (default: right)
- Numbers auto-update when rows are added/removed

### 🔄 Transpose Table

Swap rows and columns instantly - perfect for reorganizing data.

**Before:**
```markdown
| Metric  | Q1  | Q2  | Q3  |
|---------|-----|-----|-----|
| Sales   | 100 | 150 | 200 |
| Costs   | 80  | 90  | 110 |
```

**After transpose:**
```markdown
| Metric | Sales | Costs |
|--------|-------|-------|
| Q1     | 100   | 80    |
| Q2     | 150   | 90    |
| Q3     | 200   | 110   |
```

### 🎯 Smart Mode Detection

Table Buddy automatically detects whether your table is in **compact** or **formatted** mode and preserves that style after operations. No more tables unexpectedly switching formats!

- Operations like sort, add row numbers, transpose, etc. respect the original table style
- Tolerant detection handles minor inconsistencies
- Configure format-on-save to auto-format while preserving each table's mode

### 📋 Duplicate Rows

Quickly duplicate any data row with a single command - great for creating similar entries.

### 📊 Multiple Sort Options

Four different sort modes for complete control:

| Sort Type | Description | Example |
|-----------|-------------|---------|
| **Text Ascending** | A → Z | apple, banana, cherry |
| **Text Descending** | Z → A | cherry, banana, apple |
| **Numeric Ascending** | 0 → 9 | 1, 2, 10, 20, 100 |
| **Numeric Descending** | 9 → 0 | 100, 20, 10, 2, 1 |

**Note:** Numeric sort correctly handles numbers (10 comes after 2), unlike pure text sorting.

---

## 📋 All Features

### Table Formatting
- **Compact Table** - Minimize whitespace (single table or all tables)
- **Format Table** - Beautify with alignment (single table or all tables)
- **Format on Save** - Auto-format tables when saving (respects mode)

### Row Operations
- **Insert Row Above/Below** - Add new rows at cursor position
- **Remove Row** - Delete current row
- **Move Row Up/Down** - Reorder rows
- **Duplicate Row** - Copy current row
- **Add/Remove Row Numbers** - Automatic numbering
- **Auto-insert on Enter** - New row when pressing Enter in last row

### Column Operations
- **Insert Column Left/Right** - Add new columns
- **Remove Column** - Delete current column
- **Move Column Left/Right** - Reorder columns
- **Align Column** - Set left, center, or right alignment
- **Auto-insert on Tab** - New column when pressing Tab at end of row

### Sorting
- **Sort Ascending** - Text sort A-Z
- **Sort Descending** - Text sort Z-A
- **Sort Numeric Ascending** - Number sort 0-9
- **Sort Numeric Descending** - Number sort 9-0

### Data Conversion
- **Transpose Table** - Swap rows and columns
- **CSV to Table** - Import CSV/TSV data
- **Table to CSV** - Export to CSV format (copy or replace)
- **Paste from Excel** - Paste clipboard data as table
- **Convert to HTML** - Export as HTML table (copy or replace)

### Selection & Copy
- **Select Row** - Select entire current row
- **Select Column** - Multi-cursor select entire column
- **Copy Row** - Copy row values to clipboard (multi-line, comma, or semicolon separated)
- **Copy Column** - Copy column values to clipboard (multi-line, comma, or semicolon separated)

### Navigation
| Key | Action |
|-----|--------|
| `Tab` | Navigate to next cell (auto-insert column at end of row) |
| `Shift+Tab` | Navigate to previous cell |
| `Enter` | Navigate to cell below (auto-insert row in last row) |

### Smart Features
- **Ignore Code Blocks** - Tables in ``` blocks are untouched
- **Mode Detection** - Preserves compact vs formatted style
- **Create New Table** - Quick-start with configurable dimensions

---

## 🚀 Usage

### Context Menu
1. Right-click in a Markdown table
2. Select **Markdown Table Buddy** submenu
3. Choose your command

### Command Palette
1. Press `Cmd+Shift+P` (macOS) / `Ctrl+Shift+P` (Windows/Linux)
2. Type "Table Buddy" to see all commands

### Keyboard Navigation
Just use `Tab`, `Shift+Tab`, and `Enter` to navigate cells naturally.

### Custom Keyboard Shortcuts
All Table Buddy commands can be assigned custom keyboard shortcuts. Open **Keyboard Shortcuts** (`Cmd+K Cmd+S` on macOS / `Ctrl+K Ctrl+S` on Windows/Linux), search for "Table Buddy", and assign your preferred shortcuts.

---

## ⚙️ Settings

Copy this to your `settings.json` and customize as needed:

```json
"md-table-buddy": {
    "fileExtensions": [".md"],
    "formatOnSave": false,
    "ignoreCodeBlocks": true,
    "autoInsertColumnOnTab": true,
    "autoInsertRowOnEnter": true,
    "compactTable": {
        "cellPadding": true,
        "separatorPadding": true,
        "alignSeparatorWithHeader": true,
        "keepSeparatorRatios": false
    },
    "formatTable": {
        "maxWidth": 0,
        "cellPadding": true,
        "separatorPadding": true,
        "preserveAlignment": true,
        "keepSeparatorRatios": false
    },
    "rowNumbers": {
        "startNumber": 1,
        "headerText": "#",
        "alignment": "right"
    },
    "sort": {
        "keepHeaderRow": true
    },
    "csv": {
        "delimiter": ",",
        "hasHeader": true,
        "trimCells": true,
        "quoteStrings": "auto",
        "includeHeader": true
    }
}
```

### General

| Setting | Default | Description |
|---------|---------|-------------|
| `fileExtensions` | `[".md"]` | File extensions to treat as Markdown |
| `formatOnSave` | `false` | Auto-format tables on save |
| `ignoreCodeBlocks` | `true` | Skip tables inside code blocks |
| `autoInsertColumnOnTab` | `true` | Insert column when Tab at last cell |
| `autoInsertRowOnEnter` | `true` | Insert row when Enter in last row |

### Compact Table

| Setting | Default | Description |
|---------|---------|-------------|
| `compactTable.cellPadding` | `true` | Add space around cell content |
| `compactTable.separatorPadding` | `true` | Add space in separator cells |
| `compactTable.alignSeparatorWithHeader` | `true` | Match separator width to headers |
| `compactTable.keepSeparatorRatios` | `false` | Preserve original separator length ratios (for Pandoc) |

### Format Table

| Setting | Default | Description |
|---------|---------|-------------|
| `formatTable.maxWidth` | `0` | Max table width (0 = unlimited) |
| `formatTable.cellPadding` | `true` | Add space around cell content |
| `formatTable.separatorPadding` | `true` | Add space in separator cells |
| `formatTable.preserveAlignment` | `true` | Keep existing alignment markers |
| `formatTable.keepSeparatorRatios` | `false` | Preserve original separator length ratios (for Pandoc) |

### Row Numbers

| Setting | Default | Description |
|---------|---------|-------------|
| `rowNumbers.startNumber` | `1` | Starting number |
| `rowNumbers.headerText` | `"#"` | Header text for number column |
| `rowNumbers.alignment` | `"right"` | Column alignment |

### Sort

| Setting | Default | Description |
|---------|---------|-------------|
| `sort.keepHeaderRow` | `true` | Don't sort the header row |

### CSV

| Setting | Default | Description |
|---------|---------|-------------|
| `csv.delimiter` | `","` | Delimiter character |
| `csv.hasHeader` | `true` | First row is header |
| `csv.trimCells` | `true` | Trim cell whitespace |
| `csv.quoteStrings` | `"auto"` | When to quote: always/auto/never |
| `csv.includeHeader` | `true` | Include header in export |

---

## 📝 Commands Reference

| Command | Description |
|---------|-------------|
| **Compact Table** | Compact table at cursor |
| **Compact All Tables** | Compact all tables in document |
| **Format Table** | Format table at cursor |
| **Format All Tables** | Format all tables in document |
| **Add/Update Row Numbers** | Add or update row numbers |
| **Remove Row Numbers** | Remove the row number column |
| **Sort Table Ascending** | Sort by current column (A-Z) |
| **Sort Table Descending** | Sort by current column (Z-A) |
| **Sort Table Numeric Ascending** | Sort by current column (0-9) |
| **Sort Table Numeric Descending** | Sort by current column (9-0) |
| **Insert Column Left/Right** | Add a new column |
| **Remove Column** | Delete current column |
| **Move Column Left/Right** | Reorder columns |
| **Align Column Left/Center/Right** | Set column alignment |
| **Insert Row Above/Below** | Add a new row |
| **Remove Row** | Delete current row |
| **Move Row Up/Down** | Reorder rows |
| **Duplicate Row** | Copy current row |
| **Transpose Table** | Swap rows and columns |
| **Create New Table** | Insert a blank table |
| **Paste Clipboard as Table** | Paste Excel/CSV data |
| **Select Row/Column** | Select for editing |
| **Copy Row/Column** | Copy values to clipboard |
| **Convert CSV/TSV to Table** | Import from CSV/TSV |
| **Convert Table to CSV** | Export to CSV (copy or replace) |
| **Convert to HTML** | Export as HTML (copy or replace) |

---

## 🔧 Requirements

- Visual Studio Code 1.85.0 or higher
- Works with Markdown files (`.md` by default, configurable)

## 📋 Known Issues

- Tables must use the pipe (`|`) syntax
- Tables must have a header separator row (e.g., `|---|---|`)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Donate

If you are using the tool but are unable to contribute technically, please consider promoting it and donating an amount that reflects its value to you. You can do so either via PayPal

[![Donate via PayPal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif)](https://www.paypal.com/donate/?hosted_button_id=JVG7PFJ8DMW7J)

or via [GitHub Sponsors](https://github.com/sponsors/thgossler).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.txt](LICENSE.txt) file for details.

---

**Enjoy working with Markdown tables!** 🎉

<!-- MARKDOWN LINKS & IMAGES (https://www.markdownguide.org/basic-syntax/#reference-style-links) -->
[contributors-shield]: https://img.shields.io/github/contributors/thgossler/md-table-buddy.svg
[contributors-url]: https://github.com/thgossler/md-table-buddy/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/thgossler/md-table-buddy.svg
[forks-url]: https://github.com/thgossler/md-table-buddy/network/members
[stars-shield]: https://img.shields.io/github/stars/thgossler/md-table-buddy.svg
[stars-url]: https://github.com/thgossler/md-table-buddy/stargazers
[issues-shield]: https://img.shields.io/github/issues/thgossler/md-table-buddy.svg
[issues-url]: https://github.com/thgossler/md-table-buddy/issues
[license-shield]: https://img.shields.io/github/license/thgossler/md-table-buddy.svg
[license-url]: https://github.com/thgossler/md-table-buddy/blob/main/LICENSE.txt
