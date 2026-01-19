import * as vscode from 'vscode';
import { findTables, findTableAtPosition, compactTable, CompactOptions } from './tableUtils';

/**
 * Gets the compact options from VS Code settings
 */
function getCompactOptions(): CompactOptions {
    const config = vscode.workspace.getConfiguration('md-table-buddy.compactTable');
    return {
        cellPadding: config.get<boolean>('cellPadding', false),
        separatorPadding: config.get<boolean>('separatorPadding', false),
        alignSeparatorWithHeader: config.get<boolean>('alignSeparatorWithHeader', false)
    };
}

/**
 * Activates the Markdown Table Buddy extension
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Markdown Table Buddy is now active!');

    // Register the "Compact Table" command
    const compactTableCommand = vscode.commands.registerCommand(
        'md-table-buddy.compactTable',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor found.');
                return;
            }

            if (!isMarkdownFile(editor.document)) {
                vscode.window.showWarningMessage('This command only works in Markdown files.');
                return;
            }

            const document = editor.document;
            const lines = document.getText().split('\n');
            const cursorLine = editor.selection.active.line;

            const table = findTableAtPosition(lines, cursorLine);
            if (!table) {
                vscode.window.showInformationMessage('No table found at cursor position.');
                return;
            }

            const options = getCompactOptions();
            const compactedRows = compactTable(table, options);
            
            await editor.edit(editBuilder => {
                const range = new vscode.Range(
                    new vscode.Position(table.startLine, 0),
                    new vscode.Position(table.endLine, lines[table.endLine].length)
                );
                editBuilder.replace(range, compactedRows.join('\n'));
            });

            vscode.window.showInformationMessage('Table compacted successfully!');
        }
    );

    // Register the "Compact All Tables" command
    const compactAllTablesCommand = vscode.commands.registerCommand(
        'md-table-buddy.compactAllTables',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor found.');
                return;
            }

            if (!isMarkdownFile(editor.document)) {
                vscode.window.showWarningMessage('This command only works in Markdown files.');
                return;
            }

            const document = editor.document;
            const lines = document.getText().split('\n');
            const tables = findTables(lines);

            if (tables.length === 0) {
                vscode.window.showInformationMessage('No tables found in the document.');
                return;
            }

            // Process tables in reverse order to maintain line numbers
            const reversedTables = [...tables].reverse();
            const options = getCompactOptions();

            await editor.edit(editBuilder => {
                for (const table of reversedTables) {
                    const compactedRows = compactTable(table, options);
                    const range = new vscode.Range(
                        new vscode.Position(table.startLine, 0),
                        new vscode.Position(table.endLine, lines[table.endLine].length)
                    );
                    editBuilder.replace(range, compactedRows.join('\n'));
                }
            });

            vscode.window.showInformationMessage(`${tables.length} table(s) compacted successfully!`);
        }
    );

    context.subscriptions.push(compactTableCommand, compactAllTablesCommand);
}

/**
 * Gets the configured file extensions for Markdown files
 */
function getFileExtensions(): string[] {
    const config = vscode.workspace.getConfiguration('md-table-buddy');
    return config.get<string[]>('fileExtensions', ['.md']);
}

/**
 * Checks if the document is a supported Markdown file
 */
function isMarkdownFile(document: vscode.TextDocument): boolean {
    // Check by language ID first (handles .md files and files explicitly set to markdown)
    if (document.languageId === 'markdown') {
        return true;
    }
    
    // Check by configured file extensions
    const extensions = getFileExtensions();
    const fileName = document.fileName.toLowerCase();
    return extensions.some(ext => fileName.endsWith(ext.toLowerCase()));
}

/**
 * Deactivates the extension
 */
export function deactivate() {}
