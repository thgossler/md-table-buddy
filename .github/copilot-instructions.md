# GitHub Copilot Instructions for Markdown Table Buddy

## Project Overview

This is a Visual Studio Code extension called "Markdown Table Buddy" that provides convenience tools for working with tables in Markdown files.

## Technology Stack

- **Language**: TypeScript
- **Platform**: VS Code Extension API
- **Build Tool**: TypeScript Compiler (tsc)
- **Testing**: Mocha with @vscode/test-electron
- **Linting**: ESLint with typescript-eslint

## Project Structure

```
md-table-buddy/
├── src/
│   ├── extension.ts      # Main extension entry point
│   ├── tableUtils.ts     # Markdown table parsing and manipulation utilities
│   └── test/             # Test files
├── out/                  # Compiled JavaScript output
├── package.json          # Extension manifest and npm config
├── tsconfig.json         # TypeScript configuration
└── .vscode/              # VS Code workspace settings
```

## Key Concepts

### Markdown Table Format
- Tables use pipe (`|`) syntax
- Must have a header separator row (e.g., `|---|---|`)
- Alignment markers: `:---` (left), `:---:` (center), `---:` (right)

### Extension Commands
- `md-table-buddy.compactTable` - Compact table at cursor
- `md-table-buddy.compactAllTables` - Compact all tables in document

## Coding Guidelines

1. **VS Code API Usage**
   - Use `vscode.window.activeTextEditor` for current editor access
   - Use `vscode.commands.registerCommand` for command registration
   - Always check for markdown language: `document.languageId === 'markdown'`

2. **Table Parsing**
   - Tables are identified by rows starting and ending with `|`
   - Separator row must be at index 1 (second row)
   - Use `findTables()` to get all tables, `findTableAtPosition()` for cursor location

3. **Editing**
   - Use `editor.edit()` with `editBuilder` for document modifications
   - Process tables in reverse order when modifying multiple to maintain line numbers

4. **Error Handling**
   - Show warnings with `vscode.window.showWarningMessage`
   - Show info with `vscode.window.showInformationMessage`

## Adding New Features

When adding new table manipulation features:

1. Add utility functions to `tableUtils.ts`
2. Register commands in `extension.ts`
3. Add command definitions to `package.json` under `contributes.commands`
4. Add menu entries under `contributes.menus`
5. Update tests in `src/test/`
6. Update README.md with feature documentation

## Testing

Run tests with:
```bash
npm test
```

For development, use the VS Code debugger with the "Extension Tests" launch configuration.
