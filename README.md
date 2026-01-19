# Markdown Table Buddy

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/md-table-buddy.md-table-buddy?style=flat-square&label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=md-table-buddy.md-table-buddy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

A Visual Studio Code extension that provides convenience tools for working with tables in Markdown files.

## Features

### Compact Table

Removes unnecessary whitespace from a markdown table, minimizing column sizes per line. Place your cursor inside a table and run the command.

**Before:**
```markdown
| Name       |   Age   |    City        |
|------------|---------|----------------|
| John Doe   |   30    | New York       |
| Jane Smith |   25    | Los Angeles    |
```

**After:**
```markdown
|Name|Age|City|
|---|---|---|
|John Doe|30|New York|
|Jane Smith|25|Los Angeles|
```

### Compact All Tables

Compacts all tables in the current Markdown document at once.

## Usage

### Context Menu

1. Open a Markdown file
2. Right-click in the editor
3. Select **Markdown Table Buddy** submenu
4. Choose **Compact Table** or **Compact All Tables**

### Command Palette

1. Open a Markdown file
2. Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "Markdown Table Buddy" to see available commands
4. Select the desired command

## Commands

| Command | Description |
|---------|-------------|
| `Markdown Table Buddy: Compact Table` | Compact the table at cursor position |
| `Markdown Table Buddy: Compact All Tables` | Compact all tables in the document |

## Requirements

- Visual Studio Code 1.85.0 or higher
- Works with Markdown files (`.md` by default, configurable)

## Extension Settings

This extension contributes the following settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `md-table-buddy.fileExtensions` | `[".md"]` | File extensions to treat as Markdown files (e.g., `[".md", ".mdx", ".markdown"]`) |
| `md-table-buddy.compactTable.cellPadding` | `false` | Add a space at the start and end of each cell content (e.g., `\| cell \|` instead of `\|cell\|`) |
| `md-table-buddy.compactTable.separatorPadding` | `false` | Add a space at the start and end of separator row cells (requires `cellPadding` to be enabled) |
| `md-table-buddy.compactTable.alignSeparatorWithHeader` | `false` | Align separator row column widths with the header text widths |

### Setting Examples

**Default (all settings `false`):**
```markdown
|Name|Age|City|
|---|---|---|
|John|30|NYC|
```

**With `cellPadding: true`:**
```markdown
| Name | Age | City |
|---|---|---|
| John | 30 | NYC |
```

**With `cellPadding: true` and `separatorPadding: true`:**
```markdown
| Name | Age | City |
| --- | --- | --- |
| John | 30 | NYC |
```

**With `alignSeparatorWithHeader: true`:**
```markdown
|Name|Age|City|
|----|---|----| 
|John|30|NYC|
```

**With all settings `true`:**
```markdown
| Name | Age | City |
| ---- | --- | ---- |
| John | 30 | NYC |
```

## Known Issues

- Tables must use the pipe (`|`) syntax
- Tables must have a header separator row (e.g., `|---|---|`)

## Roadmap

Future features planned:
- Format/beautify tables (align columns)
- Sort table by column
- Add/remove columns
- Add/remove rows
- Convert CSV to table
- Table validation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Run tests
npm test

# Lint
npm run lint
```

## Release Notes

### 0.1.0

- Initial release
- Added "Compact Table" command
- Added "Compact All Tables" command
- Context menu integration
- Command palette integration

## License

This project is licensed under the MIT License - see the [LICENSE.txt](LICENSE.txt) file for details.

---

**Enjoy working with Markdown tables!** 🎉
