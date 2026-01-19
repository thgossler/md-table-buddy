import * as vscode from 'vscode';
import { findTables, findTableAtPosition, compactTable } from './tableUtils';

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

            const compactedRows = compactTable(table);
            
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

            await editor.edit(editBuilder => {
                for (const table of reversedTables) {
                    const compactedRows = compactTable(table);
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
 * Checks if the document is a Markdown file
 */
function isMarkdownFile(document: vscode.TextDocument): boolean {
    return document.languageId === 'markdown';
}

/**
 * Deactivates the extension
 */
export function deactivate() {}
