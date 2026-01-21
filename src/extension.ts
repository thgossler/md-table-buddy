import * as vscode from 'vscode';
import {
    findTables,
    findTableAtPosition,
    compactTable,
    formatTable,
    addRowNumbers,
    removeRowNumbers,
    sortTable,
    insertColumn,
    removeColumn,
    moveColumn,
    setColumnAlignment,
    insertRow,
    removeRow,
    moveRow,
    duplicateRow,
    transposeTable,
    parseCsv,
    tableToCsv,
    tableToHtml,
    createEmptyTable,
    getColumnAtPosition,
    getRowIndexInTable,
    findCodeBlockRanges,
    isLineInCodeBlock,
    CompactOptions,
    FormatOptions,
    RowNumberOptions,
    SortOptions,
    CsvOptions,
    ColumnAlignment,
    MarkdownTable
} from './tableUtils';

// ============================================================================
// CONFIGURATION HELPERS
// ============================================================================

function getCompactOptions(): CompactOptions {
    const config = vscode.workspace.getConfiguration('md-table-buddy.compactTable');
    return {
        cellPadding: config.get<boolean>('cellPadding', false),
        separatorPadding: config.get<boolean>('separatorPadding', false),
        alignSeparatorWithHeader: config.get<boolean>('alignSeparatorWithHeader', false)
    };
}

function getFormatOptions(): FormatOptions {
    const config = vscode.workspace.getConfiguration('md-table-buddy.formatTable');
    return {
        maxWidth: config.get<number>('maxWidth', 0),
        cellPadding: config.get<boolean>('cellPadding', true),
        separatorPadding: config.get<boolean>('separatorPadding', true),
        preserveAlignment: config.get<boolean>('preserveAlignment', true)
    };
}

function getRowNumberOptions(): RowNumberOptions {
    const config = vscode.workspace.getConfiguration('md-table-buddy.rowNumbers');
    return {
        startNumber: config.get<number>('startNumber', 1),
        headerText: config.get<string>('headerText', '#'),
        alignment: config.get<ColumnAlignment>('alignment', 'right')
    };
}

function getSortOptions(): Partial<SortOptions> {
    const config = vscode.workspace.getConfiguration('md-table-buddy.sort');
    return {
        keepHeaderRow: config.get<boolean>('keepHeaderRow', true)
    };
}

function getCsvOptions(): CsvOptions {
    const config = vscode.workspace.getConfiguration('md-table-buddy.csv');
    return {
        delimiter: config.get<string>('delimiter', ','),
        hasHeader: config.get<boolean>('hasHeader', true),
        trimCells: config.get<boolean>('trimCells', true),
        quoteStrings: config.get<'always' | 'auto' | 'never'>('quoteStrings', 'auto'),
        includeHeader: config.get<boolean>('includeHeader', true)
    };
}

function getFileExtensions(): string[] {
    const config = vscode.workspace.getConfiguration('md-table-buddy');
    return config.get<string[]>('fileExtensions', ['.md']);
}

function isMarkdownFile(document: vscode.TextDocument): boolean {
    if (document.languageId === 'markdown') {
        return true;
    }
    const extensions = getFileExtensions();
    const fileName = document.fileName.toLowerCase();
    return extensions.some(ext => fileName.endsWith(ext.toLowerCase()));
}

function getIgnoreCodeBlocks(): boolean {
    const config = vscode.workspace.getConfiguration('md-table-buddy');
    return config.get<boolean>('ignoreCodeBlocks', true);
}

function getFormatOnSave(): boolean {
    const config = vscode.workspace.getConfiguration('md-table-buddy');
    return config.get<boolean>('formatOnSave', false);
}

function getAutoInsertColumnOnTab(): boolean {
    const config = vscode.workspace.getConfiguration('md-table-buddy');
    return config.get<boolean>('autoInsertColumnOnTab', true);
}

function getAutoInsertRowOnEnter(): boolean {
    const config = vscode.workspace.getConfiguration('md-table-buddy');
    return config.get<boolean>('autoInsertRowOnEnter', true);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Detects if a table is in "formatted" mode (aligned columns with equal widths) or "compact" mode
 * Returns true if formatted, false if compact
 * 
 * Formatted mode: columns are padded to equal widths (like after "Format Table")
 * Compact mode: cells have minimal width, no extra padding for alignment
 */
function isTableFormatted(table: MarkdownTable, lines: string[]): boolean {
    // Get the original lines for this table
    const tableLines: string[] = [];
    for (let i = table.startLine; i <= table.endLine; i++) {
        tableLines.push(lines[i]);
    }
    
    // Parse the original cells with their whitespace preserved
    const originalCells: string[][] = tableLines.map(line => {
        const trimmed = line.trim();
        if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
            return [];
        }
        // Split by | but keep the content as-is (with spaces)
        const inner = trimmed.slice(1, -1);
        return inner.split('|');
    });
    
    // Skip if not enough rows
    if (originalCells.length < 2) {
        return false;
    }
    
    // Check if cells within each column have consistent widths (padded)
    // In formatted mode, all cells in a column should have the same total width
    const dataRowIndices = originalCells
        .map((_, i) => i)
        .filter(i => i !== table.separatorIndex);
    
    if (dataRowIndices.length < 2) {
        // Need at least header + 1 data row to detect alignment
        // Check separator instead - if separators have more than 3 dashes, likely formatted
        const separatorLine = tableLines[table.separatorIndex];
        if (separatorLine) {
            const separatorCells = separatorLine.slice(1, -1).split('|');
            const hasExtendedSeparators = separatorCells.some(cell => {
                const dashes = cell.replace(/[:\s]/g, '');
                return dashes.length > 3;
            });
            return hasExtendedSeparators;
        }
        return false;
    }
    
    // Check column widths - in formatted mode, columns have consistent widths
    // Use tolerant matching: allow ±1 character variance and require 70%+ columns to be consistent
    const columnCount = Math.max(...originalCells.map(row => row.length));
    let consistentColumns = 0;
    let hasAnyPadding = false;
    
    for (let col = 0; col < columnCount; col++) {
        const widths = dataRowIndices.map(rowIdx => {
            const cell = originalCells[rowIdx][col];
            return cell ? cell.length : 0;
        });
        
        if (widths.length === 0) continue;
        
        // Check if widths are consistent within ±1 tolerance
        const minWidth = Math.min(...widths);
        const maxWidth = Math.max(...widths);
        const isConsistent = (maxWidth - minWidth) <= 1;
        
        if (isConsistent) {
            consistentColumns++;
        }
        
        // Check for trailing spaces (padding) in this column
        const hasPaddingInColumn = dataRowIndices.some(rowIdx => {
            const cell = originalCells[rowIdx][col];
            return cell && cell.endsWith(' ');
        });
        if (hasPaddingInColumn) {
            hasAnyPadding = true;
        }
    }
    
    // Calculate consistency ratio - require at least 70% of columns to be consistent
    const consistencyRatio = columnCount > 0 ? consistentColumns / columnCount : 0;
    const hasConsistentWidths = consistencyRatio >= 0.7;
    
    // If columns are mostly consistent and there's any trailing space padding, it's formatted
    if (hasConsistentWidths && hasAnyPadding) {
        return true;
    }
    
    // Additional check: if table has significant padding (cells with 2+ trailing spaces), likely formatted
    const hasSignificantPadding = dataRowIndices.some(rowIdx => {
        return originalCells[rowIdx].some(cell => {
            if (!cell) return false;
            const trimmedRight = cell.trimEnd();
            return cell.length - trimmedRight.length >= 2;
        });
    });
    
    return hasSignificantPadding;
}

/**
 * Applies the appropriate formatting to a table based on its original mode
 */
function applyTableFormatting(newTable: MarkdownTable, wasFormatted: boolean): string[] {
    if (wasFormatted) {
        const formatOptions = getFormatOptions();
        const compactOptions = getCompactOptions();
        return formatTable(newTable, formatOptions, compactOptions);
    } else {
        const compactOptions = getCompactOptions();
        return compactTable(newTable, compactOptions);
    }
}

function getEditorAndTable(requireTable: boolean = true): { 
    editor: vscode.TextEditor; 
    lines: string[]; 
    table?: MarkdownTable;
    cursorLine: number;
    cursorChar: number;
} | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active editor found.');
        return undefined;
    }

    if (!isMarkdownFile(editor.document)) {
        vscode.window.showWarningMessage('This command only works in Markdown files.');
        return undefined;
    }

    const lines = editor.document.getText().split('\n');
    const cursorLine = editor.selection.active.line;
    const cursorChar = editor.selection.active.character;
    const ignoreCodeBlocks = getIgnoreCodeBlocks();
    const table = findTableAtPosition(lines, cursorLine, ignoreCodeBlocks);

    if (requireTable && !table) {
        vscode.window.showInformationMessage('No table found at cursor position.');
        return undefined;
    }

    return { editor, lines, table, cursorLine, cursorChar };
}

async function replaceTable(
    editor: vscode.TextEditor, 
    table: MarkdownTable, 
    newLines: string[], 
    originalLines: string[]
): Promise<void> {
    await editor.edit(editBuilder => {
        const range = new vscode.Range(
            new vscode.Position(table.startLine, 0),
            new vscode.Position(table.endLine, originalLines[table.endLine].length)
        );
        editBuilder.replace(range, newLines.join('\n'));
    });
}

// ============================================================================
// EXTENSION ACTIVATION
// ============================================================================

export function activate(context: vscode.ExtensionContext) {
    console.log('Markdown Table Buddy is now active!');

    // ========================================================================
    // CONTEXT KEY FOR TABLE DETECTION
    // ========================================================================

    function updateTableContext(editor: vscode.TextEditor | undefined) {
        if (!editor || !isMarkdownFile(editor.document)) {
            vscode.commands.executeCommand('setContext', 'md-table-buddy.inTable', false);
            return;
        }

        const currentLine = editor.selection.active.line;
        const lines = editor.document.getText().split('\n');
        const ignoreCodeBlocks = getIgnoreCodeBlocks();
        const table = findTableAtPosition(lines, currentLine, ignoreCodeBlocks);
        
        vscode.commands.executeCommand('setContext', 'md-table-buddy.inTable', table !== null);
    }

    // Update context on selection change
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection((event) => {
            updateTableContext(event.textEditor);
        })
    );

    // Update context on active editor change
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            updateTableContext(editor);
        })
    );

    // Initialize context for current editor
    updateTableContext(vscode.window.activeTextEditor);

    // ========================================================================
    // FORMAT ON SAVE HANDLER
    // ========================================================================

    context.subscriptions.push(
        vscode.workspace.onWillSaveTextDocument(async (event) => {
            if (!getFormatOnSave()) { return; }
            if (!isMarkdownFile(event.document)) { return; }

            const lines = event.document.getText().split('\n');
            const ignoreCodeBlocks = getIgnoreCodeBlocks();
            const tables = findTables(lines, ignoreCodeBlocks);

            if (tables.length === 0) { return; }

            // Process tables in reverse order to maintain line numbers
            const edits: vscode.TextEdit[] = [];
            for (let i = tables.length - 1; i >= 0; i--) {
                const table = tables[i];
                const wasFormatted = isTableFormatted(table, lines);
                const newLines = applyTableFormatting(table, wasFormatted);

                const range = new vscode.Range(
                    new vscode.Position(table.startLine, 0),
                    new vscode.Position(table.endLine, lines[table.endLine].length)
                );
                edits.push(vscode.TextEdit.replace(range, newLines.join('\n')));
            }

            event.waitUntil(Promise.resolve(edits));
        })
    );

    // ========================================================================
    // COMPACT COMMANDS
    // ========================================================================

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.compactTable', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const options = getCompactOptions();
            const compactedRows = compactTable(ctx.table, options);
            await replaceTable(ctx.editor, ctx.table, compactedRows, ctx.lines);
            vscode.window.showInformationMessage('Table compacted successfully!');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.compactAllTables', async () => {
            const ctx = getEditorAndTable(false);
            if (!ctx) { return; }

            const ignoreCodeBlocks = getIgnoreCodeBlocks();
            const tables = findTables(ctx.lines, ignoreCodeBlocks);
            if (tables.length === 0) {
                vscode.window.showInformationMessage('No tables found in the document.');
                return;
            }

            const options = getCompactOptions();
            const reversedTables = [...tables].reverse();

            await ctx.editor.edit(editBuilder => {
                for (const table of reversedTables) {
                    const compactedRows = compactTable(table, options);
                    const range = new vscode.Range(
                        new vscode.Position(table.startLine, 0),
                        new vscode.Position(table.endLine, ctx.lines[table.endLine].length)
                    );
                    editBuilder.replace(range, compactedRows.join('\n'));
                }
            });

            vscode.window.showInformationMessage(`${tables.length} table(s) compacted successfully!`);
        })
    );

    // ========================================================================
    // FORMAT COMMANDS
    // ========================================================================

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.formatTable', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const options = getFormatOptions();
            const compactOptions = getCompactOptions();
            const formattedRows = formatTable(ctx.table, options, compactOptions);
            await replaceTable(ctx.editor, ctx.table, formattedRows, ctx.lines);
            vscode.window.showInformationMessage('Table formatted successfully!');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.formatAllTables', async () => {
            const ctx = getEditorAndTable(false);
            if (!ctx) { return; }

            const ignoreCodeBlocks = getIgnoreCodeBlocks();
            const tables = findTables(ctx.lines, ignoreCodeBlocks);
            if (tables.length === 0) {
                vscode.window.showInformationMessage('No tables found in the document.');
                return;
            }

            const options = getFormatOptions();
            const compactOptions = getCompactOptions();
            const reversedTables = [...tables].reverse();

            await ctx.editor.edit(editBuilder => {
                for (const table of reversedTables) {
                    const formattedRows = formatTable(table, options, compactOptions);
                    const range = new vscode.Range(
                        new vscode.Position(table.startLine, 0),
                        new vscode.Position(table.endLine, ctx.lines[table.endLine].length)
                    );
                    editBuilder.replace(range, formattedRows.join('\n'));
                }
            });

            vscode.window.showInformationMessage(`${tables.length} table(s) formatted successfully!`);
        })
    );

    // ========================================================================
    // ROW NUMBER COMMANDS
    // ========================================================================

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.addRowNumbers', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const options = getRowNumberOptions();
            const newTable = addRowNumbers(ctx.table, options);
            const wasFormatted = isTableFormatted(ctx.table, ctx.lines);
            const newLines = applyTableFormatting(newTable, wasFormatted);
            await replaceTable(ctx.editor, ctx.table, newLines, ctx.lines);
            vscode.window.showInformationMessage('Row numbers added/updated successfully!');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.removeRowNumbers', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const newTable = removeRowNumbers(ctx.table);
            if (!newTable) {
                vscode.window.showInformationMessage('No row numbers found in the table.');
                return;
            }

            const wasFormatted = isTableFormatted(ctx.table, ctx.lines);
            const newLines = applyTableFormatting(newTable, wasFormatted);
            await replaceTable(ctx.editor, ctx.table, newLines, ctx.lines);
            vscode.window.showInformationMessage('Row numbers removed successfully!');
        })
    );

    // ========================================================================
    // SORT COMMANDS
    // ========================================================================

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.sortTableAscending', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const columnIndex = getColumnAtPosition(ctx.lines[ctx.cursorLine], ctx.cursorChar);
            const baseOptions = getSortOptions();
            const options: SortOptions = {
                columnIndex,
                direction: 'ascending',
                sortType: 'text',
                caseSensitive: false,
                keepHeaderRow: baseOptions.keepHeaderRow ?? true
            };

            const newTable = sortTable(ctx.table, options);
            const wasFormatted = isTableFormatted(ctx.table, ctx.lines);
            const newLines = applyTableFormatting(newTable, wasFormatted);
            await replaceTable(ctx.editor, ctx.table, newLines, ctx.lines);
            vscode.window.showInformationMessage('Table sorted ascending!');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.sortTableDescending', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const columnIndex = getColumnAtPosition(ctx.lines[ctx.cursorLine], ctx.cursorChar);
            const baseOptions = getSortOptions();
            const options: SortOptions = {
                columnIndex,
                direction: 'descending',
                sortType: 'text',
                caseSensitive: false,
                keepHeaderRow: baseOptions.keepHeaderRow ?? true
            };

            const newTable = sortTable(ctx.table, options);
            const wasFormatted = isTableFormatted(ctx.table, ctx.lines);
            const newLines = applyTableFormatting(newTable, wasFormatted);
            await replaceTable(ctx.editor, ctx.table, newLines, ctx.lines);
            vscode.window.showInformationMessage('Table sorted descending!');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.sortTableNumericAscending', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const columnIndex = getColumnAtPosition(ctx.lines[ctx.cursorLine], ctx.cursorChar);
            const baseOptions = getSortOptions();
            const options: SortOptions = {
                columnIndex,
                direction: 'ascending',
                sortType: 'numeric',
                caseSensitive: false,
                keepHeaderRow: baseOptions.keepHeaderRow ?? true
            };

            const newTable = sortTable(ctx.table, options);
            const wasFormatted = isTableFormatted(ctx.table, ctx.lines);
            const newLines = applyTableFormatting(newTable, wasFormatted);
            await replaceTable(ctx.editor, ctx.table, newLines, ctx.lines);
            vscode.window.showInformationMessage('Table sorted numerically ascending!');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.sortTableNumericDescending', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const columnIndex = getColumnAtPosition(ctx.lines[ctx.cursorLine], ctx.cursorChar);
            const baseOptions = getSortOptions();
            const options: SortOptions = {
                columnIndex,
                direction: 'descending',
                sortType: 'numeric',
                caseSensitive: false,
                keepHeaderRow: baseOptions.keepHeaderRow ?? true
            };

            const newTable = sortTable(ctx.table, options);
            const wasFormatted = isTableFormatted(ctx.table, ctx.lines);
            const newLines = applyTableFormatting(newTable, wasFormatted);
            await replaceTable(ctx.editor, ctx.table, newLines, ctx.lines);
            vscode.window.showInformationMessage('Table sorted numerically descending!');
        })
    );

    // ========================================================================
    // COLUMN COMMANDS
    // ========================================================================

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.insertColumnLeft', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const columnIndex = getColumnAtPosition(ctx.lines[ctx.cursorLine], ctx.cursorChar);
            const header = await vscode.window.showInputBox({ prompt: 'Enter header text for new column', value: '' });
            
            const newTable = insertColumn(ctx.table, columnIndex, header || '', '');
            const wasFormatted = isTableFormatted(ctx.table, ctx.lines);
            const newLines = applyTableFormatting(newTable, wasFormatted);
            await replaceTable(ctx.editor, ctx.table, newLines, ctx.lines);
            vscode.window.showInformationMessage('Column inserted!');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.insertColumnRight', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const columnIndex = getColumnAtPosition(ctx.lines[ctx.cursorLine], ctx.cursorChar) + 1;
            const header = await vscode.window.showInputBox({ prompt: 'Enter header text for new column', value: '' });
            
            const newTable = insertColumn(ctx.table, columnIndex, header || '', '');
            const wasFormatted = isTableFormatted(ctx.table, ctx.lines);
            const newLines = applyTableFormatting(newTable, wasFormatted);
            await replaceTable(ctx.editor, ctx.table, newLines, ctx.lines);
            vscode.window.showInformationMessage('Column inserted!');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.removeColumn', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const columnIndex = getColumnAtPosition(ctx.lines[ctx.cursorLine], ctx.cursorChar);
            
            const confirm = await vscode.window.showWarningMessage(
                'Are you sure you want to remove this column?',
                { modal: true },
                'Yes'
            );
            
            if (confirm !== 'Yes') { return; }

            const newTable = removeColumn(ctx.table, columnIndex);
            const wasFormatted = isTableFormatted(ctx.table, ctx.lines);
            const newLines = applyTableFormatting(newTable, wasFormatted);
            await replaceTable(ctx.editor, ctx.table, newLines, ctx.lines);
            vscode.window.showInformationMessage('Column removed!');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.moveColumnLeft', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const columnIndex = getColumnAtPosition(ctx.lines[ctx.cursorLine], ctx.cursorChar);
            const newTable = moveColumn(ctx.table, columnIndex, 'left');
            const wasFormatted = isTableFormatted(ctx.table, ctx.lines);
            const newLines = applyTableFormatting(newTable, wasFormatted);
            await replaceTable(ctx.editor, ctx.table, newLines, ctx.lines);
            vscode.window.showInformationMessage('Column moved left!');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.moveColumnRight', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const columnIndex = getColumnAtPosition(ctx.lines[ctx.cursorLine], ctx.cursorChar);
            const newTable = moveColumn(ctx.table, columnIndex, 'right');
            const wasFormatted = isTableFormatted(ctx.table, ctx.lines);
            const newLines = applyTableFormatting(newTable, wasFormatted);
            await replaceTable(ctx.editor, ctx.table, newLines, ctx.lines);
            vscode.window.showInformationMessage('Column moved right!');
        })
    );

    // ========================================================================
    // ALIGNMENT COMMANDS
    // ========================================================================

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.alignColumnLeft', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const columnIndex = getColumnAtPosition(ctx.lines[ctx.cursorLine], ctx.cursorChar);
            const newTable = setColumnAlignment(ctx.table, columnIndex, 'left');
            const wasFormatted = isTableFormatted(ctx.table, ctx.lines);
            const newLines = applyTableFormatting(newTable, wasFormatted);
            await replaceTable(ctx.editor, ctx.table, newLines, ctx.lines);
            vscode.window.showInformationMessage('Column aligned left!');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.alignColumnCenter', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const columnIndex = getColumnAtPosition(ctx.lines[ctx.cursorLine], ctx.cursorChar);
            const newTable = setColumnAlignment(ctx.table, columnIndex, 'center');
            const wasFormatted = isTableFormatted(ctx.table, ctx.lines);
            const newLines = applyTableFormatting(newTable, wasFormatted);
            await replaceTable(ctx.editor, ctx.table, newLines, ctx.lines);
            vscode.window.showInformationMessage('Column aligned center!');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.alignColumnRight', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const columnIndex = getColumnAtPosition(ctx.lines[ctx.cursorLine], ctx.cursorChar);
            const newTable = setColumnAlignment(ctx.table, columnIndex, 'right');
            const wasFormatted = isTableFormatted(ctx.table, ctx.lines);
            const newLines = applyTableFormatting(newTable, wasFormatted);
            await replaceTable(ctx.editor, ctx.table, newLines, ctx.lines);
            vscode.window.showInformationMessage('Column aligned right!');
        })
    );

    // ========================================================================
    // ROW COMMANDS
    // ========================================================================

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.insertRowAbove', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const rowIndex = getRowIndexInTable(ctx.table, ctx.cursorLine);
            
            // Don't insert above header or at separator position
            if (rowIndex <= 1) {
                vscode.window.showWarningMessage('Cannot insert row here. Try below the separator row.');
                return;
            }

            const newTable = insertRow(ctx.table, rowIndex);
            const wasFormatted = isTableFormatted(ctx.table, ctx.lines);
            const newLines = applyTableFormatting(newTable, wasFormatted);
            await replaceTable(ctx.editor, ctx.table, newLines, ctx.lines);
            vscode.window.showInformationMessage('Row inserted!');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.insertRowBelow', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const rowIndex = getRowIndexInTable(ctx.table, ctx.cursorLine);
            const insertIndex = rowIndex === ctx.table.separatorIndex ? rowIndex + 1 : rowIndex + 1;

            const newTable = insertRow(ctx.table, insertIndex);
            const wasFormatted = isTableFormatted(ctx.table, ctx.lines);
            const newLines = applyTableFormatting(newTable, wasFormatted);
            await replaceTable(ctx.editor, ctx.table, newLines, ctx.lines);
            vscode.window.showInformationMessage('Row inserted!');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.removeRow', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const rowIndex = getRowIndexInTable(ctx.table, ctx.cursorLine);
            
            if (rowIndex === 0 || rowIndex === ctx.table.separatorIndex) {
                vscode.window.showWarningMessage('Cannot remove header or separator row.');
                return;
            }

            const newTable = removeRow(ctx.table, rowIndex);
            if (!newTable) { return; }

            const wasFormatted = isTableFormatted(ctx.table, ctx.lines);
            const newLines = applyTableFormatting(newTable, wasFormatted);
            await replaceTable(ctx.editor, ctx.table, newLines, ctx.lines);
            vscode.window.showInformationMessage('Row removed!');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.moveRowUp', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const rowIndex = getRowIndexInTable(ctx.table, ctx.cursorLine);
            const newTable = moveRow(ctx.table, rowIndex, 'up');
            
            if (!newTable) {
                vscode.window.showWarningMessage('Cannot move this row up.');
                return;
            }

            const wasFormatted = isTableFormatted(ctx.table, ctx.lines);
            const newLines = applyTableFormatting(newTable, wasFormatted);
            await replaceTable(ctx.editor, ctx.table, newLines, ctx.lines);
            vscode.window.showInformationMessage('Row moved up!');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.moveRowDown', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const rowIndex = getRowIndexInTable(ctx.table, ctx.cursorLine);
            const newTable = moveRow(ctx.table, rowIndex, 'down');
            
            if (!newTable) {
                vscode.window.showWarningMessage('Cannot move this row down.');
                return;
            }

            const wasFormatted = isTableFormatted(ctx.table, ctx.lines);
            const newLines = applyTableFormatting(newTable, wasFormatted);
            await replaceTable(ctx.editor, ctx.table, newLines, ctx.lines);
            vscode.window.showInformationMessage('Row moved down!');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.duplicateRow', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const rowIndex = getRowIndexInTable(ctx.table, ctx.cursorLine);
            const newTable = duplicateRow(ctx.table, rowIndex);
            
            if (!newTable) {
                vscode.window.showWarningMessage('Cannot duplicate this row.');
                return;
            }

            const wasFormatted = isTableFormatted(ctx.table, ctx.lines);
            const newLines = applyTableFormatting(newTable, wasFormatted);
            await replaceTable(ctx.editor, ctx.table, newLines, ctx.lines);
            vscode.window.showInformationMessage('Row duplicated!');
        })
    );

    // ========================================================================
    // TRANSPOSE COMMAND
    // ========================================================================

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.transposeTable', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const newTable = transposeTable(ctx.table);
            const wasFormatted = isTableFormatted(ctx.table, ctx.lines);
            const newLines = applyTableFormatting(newTable, wasFormatted);
            await replaceTable(ctx.editor, ctx.table, newLines, ctx.lines);
            vscode.window.showInformationMessage('Table transposed!');
        })
    );

    // ========================================================================
    // CSV CONVERSION COMMANDS
    // ========================================================================

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.convertCsvToTable', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor found.');
                return;
            }

            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);

            if (!selectedText) {
                vscode.window.showWarningMessage('Please select CSV/TSV text to convert.');
                return;
            }

            const options = getCsvOptions();
            options.delimiter = 'auto'; // Auto-detect for import
            const table = parseCsv(selectedText, options);
            const formatOpts = getFormatOptions();
            const compactOpts = getCompactOptions();
            const tableLines = formatTable(table, formatOpts, compactOpts);

            await editor.edit(editBuilder => {
                editBuilder.replace(selection, tableLines.join('\n'));
            });

            vscode.window.showInformationMessage('CSV converted to table!');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.convertTableToCsv', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const options = getCsvOptions();
            const csv = tableToCsv(ctx.table, options);

            const action = await vscode.window.showQuickPick(
                ['Copy to clipboard', 'Replace table'],
                { placeHolder: 'What would you like to do with the CSV?' }
            );

            if (action === 'Copy to clipboard') {
                await vscode.env.clipboard.writeText(csv);
                vscode.window.showInformationMessage('CSV copied to clipboard!');
            } else if (action === 'Replace table') {
                await replaceTable(ctx.editor, ctx.table, csv.split('\n'), ctx.lines);
                vscode.window.showInformationMessage('Table converted to CSV!');
            }
        })
    );

    // ========================================================================
    // NAVIGATION COMMANDS
    // ========================================================================

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.navigateNextCell', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) { return; }

            if (!isMarkdownFile(editor.document)) { return; }

            const currentLine = editor.selection.active.line;
            const line = editor.document.lineAt(currentLine).text;
            const currentPos = editor.selection.active.character;

            // Check if we're in a table
            const lines = editor.document.getText().split('\n');
            const ignoreCodeBlocks = getIgnoreCodeBlocks();
            const table = findTableAtPosition(lines, currentLine, ignoreCodeBlocks);
            
            if (!table) {
                // Not in a table, use default tab behavior
                await vscode.commands.executeCommand('tab');
                return;
            }

            // Find next pipe character
            let nextPipe = line.indexOf('|', currentPos + 1);
            if (nextPipe === -1 || nextPipe >= line.length - 1) {
                // At end of row - insert a new column to the right
                if (getAutoInsertColumnOnTab()) {
                    // Insert a new column at the end
                    const numColumns = table.rows[0].length;
                    const newTable = insertColumn(table, numColumns, '', '', 'left');
                    const wasFormatted = isTableFormatted(table, lines);
                    const newLines = applyTableFormatting(newTable, wasFormatted);
                    
                    await replaceTable(editor, table, newLines, lines);
                    
                    // Navigate to the new column in the current row
                    const updatedLineText = editor.document.lineAt(currentLine).text;
                    // Find the last pipe before the final pipe
                    const lastPipe = updatedLineText.lastIndexOf('|');
                    const secondLastPipe = updatedLineText.lastIndexOf('|', lastPipe - 1);
                    if (secondLastPipe !== -1) {
                        const newPos = new vscode.Position(currentLine, secondLastPipe + 1);
                        editor.selection = new vscode.Selection(newPos, newPos);
                    }
                } else {
                    // Move to next line, first cell
                    const nextLine = currentLine + 1;
                    if (nextLine < editor.document.lineCount) {
                        const nextLineText = editor.document.lineAt(nextLine).text;
                        const firstPipe = nextLineText.indexOf('|');
                        if (firstPipe !== -1) {
                            const newPos = new vscode.Position(nextLine, firstPipe + 1);
                            editor.selection = new vscode.Selection(newPos, newPos);
                        }
                    }
                }
            } else {
                const newPos = new vscode.Position(currentLine, nextPipe + 1);
                editor.selection = new vscode.Selection(newPos, newPos);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.navigatePrevCell', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) { return; }

            if (!isMarkdownFile(editor.document)) { return; }

            const currentLine = editor.selection.active.line;
            const line = editor.document.lineAt(currentLine).text;
            const currentPos = editor.selection.active.character;

            // Check if we're in a table
            const lines = editor.document.getText().split('\n');
            const ignoreCodeBlocks = getIgnoreCodeBlocks();
            const table = findTableAtPosition(lines, currentLine, ignoreCodeBlocks);
            
            if (!table) {
                // Not in a table, use default shift+tab behavior
                await vscode.commands.executeCommand('outdent');
                return;
            }

            // Find previous pipe character
            let prevPipe = line.lastIndexOf('|', currentPos - 1);
            if (prevPipe <= 0) {
                // Move to previous line, last cell
                const prevLine = currentLine - 1;
                if (prevLine >= 0) {
                    const prevLineText = editor.document.lineAt(prevLine).text;
                    const lastPipe = prevLineText.lastIndexOf('|', prevLineText.length - 2);
                    if (lastPipe !== -1) {
                        const newPos = new vscode.Position(prevLine, lastPipe + 1);
                        editor.selection = new vscode.Selection(newPos, newPos);
                    }
                }
            } else {
                prevPipe = line.lastIndexOf('|', prevPipe - 1);
                if (prevPipe !== -1) {
                    const newPos = new vscode.Position(currentLine, prevPipe + 1);
                    editor.selection = new vscode.Selection(newPos, newPos);
                }
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.navigateCellBelow', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) { return; }

            if (!isMarkdownFile(editor.document)) { return; }

            const currentLine = editor.selection.active.line;
            const currentChar = editor.selection.active.character;
            const lineText = editor.document.lineAt(currentLine).text;

            // Check if cursor is on a pipe character - use default behavior
            if (lineText[currentChar] === '|') {
                await vscode.commands.executeCommand('type', { text: '\n' });
                return;
            }

            // Check if we're in a table
            const lines = editor.document.getText().split('\n');
            const ignoreCodeBlocks = getIgnoreCodeBlocks();
            const table = findTableAtPosition(lines, currentLine, ignoreCodeBlocks);
            
            if (!table) {
                // Not in a table, use default enter behavior
                await vscode.commands.executeCommand('type', { text: '\n' });
                return;
            }

            // Check if we're in the last row
            const isLastRow = currentLine === table.endLine;
            
            if (isLastRow && getAutoInsertRowOnEnter()) {
                // Insert a new row and navigate to it
                const rowIndex = getRowIndexInTable(table, currentLine);
                const newTable = insertRow(table, rowIndex + 1);
                const wasFormatted = isTableFormatted(table, lines);
                const newLines = applyTableFormatting(newTable, wasFormatted);
                
                await replaceTable(editor, table, newLines, lines);
                
                // Navigate to the same column in the new row
                const newRowLine = table.startLine + rowIndex + 1;
                const newRowText = editor.document.lineAt(newRowLine).text;
                const charPos = Math.min(currentChar, newRowText.length - 1);
                const newPos = new vscode.Position(newRowLine, charPos);
                editor.selection = new vscode.Selection(newPos, newPos);
            } else {
                const nextLine = currentLine + 1;
                if (nextLine < editor.document.lineCount) {
                    const nextLineText = editor.document.lineAt(nextLine).text;
                    // Try to maintain similar column position
                    const charPos = Math.min(currentChar, nextLineText.length - 1);
                    const newPos = new vscode.Position(nextLine, charPos);
                    editor.selection = new vscode.Selection(newPos, newPos);
                }
            }
        })
    );

    // ========================================================================
    // NEW TABLE AND CLIPBOARD COMMANDS
    // ========================================================================

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.createTable', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor found.');
                return;
            }

            if (!isMarkdownFile(editor.document)) {
                vscode.window.showWarningMessage('This command only works in Markdown files.');
                return;
            }

            // Check if cursor is inside a table
            const lines = editor.document.getText().split('\n');
            const ignoreCodeBlocks = getIgnoreCodeBlocks();
            const existingTable = findTableAtPosition(lines, editor.selection.active.line, ignoreCodeBlocks);
            if (existingTable) {
                vscode.window.showWarningMessage('Cannot create a table inside an existing table. Move cursor outside the table first.');
                return;
            }

            const sizeOptions = [
                { label: '3 × 3', columns: 3, rows: 3 },
                { label: '4 × 4', columns: 4, rows: 4 },
                { label: '5 × 5', columns: 5, rows: 5 },
                { label: '6 × 6', columns: 6, rows: 6 },
                { label: '7 × 7', columns: 7, rows: 7 },
                { label: '8 × 8', columns: 8, rows: 8 },
                { label: '9 × 9', columns: 9, rows: 9 }
            ];

            const selected = await vscode.window.showQuickPick(sizeOptions, {
                placeHolder: 'Select table size (columns × rows)'
            });

            if (!selected) { return; }

            const newTable = createEmptyTable(selected.rows, selected.columns);
            const compactOptions = getCompactOptions();
            const tableLines = compactTable(newTable, compactOptions);

            await editor.edit(editBuilder => {
                editBuilder.insert(editor.selection.active, tableLines.join('\n') + '\n');
            });

            vscode.window.showInformationMessage(`Created ${selected.columns}×${selected.rows} table!`);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.pasteAsTable', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor found.');
                return;
            }

            if (!isMarkdownFile(editor.document)) {
                vscode.window.showWarningMessage('This command only works in Markdown files.');
                return;
            }

            // Check if cursor is inside a table
            const lines = editor.document.getText().split('\n');
            const ignoreCodeBlocks = getIgnoreCodeBlocks();
            const existingTable = findTableAtPosition(lines, editor.selection.active.line, ignoreCodeBlocks);
            if (existingTable) {
                vscode.window.showWarningMessage('Cannot paste a table inside an existing table. Move cursor outside the table first.');
                return;
            }

            const clipboardText = await vscode.env.clipboard.readText();
            if (!clipboardText.trim()) {
                vscode.window.showWarningMessage('Clipboard is empty.');
                return;
            }

            // Detect delimiter (tab for Excel, comma for CSV, semicolon)
            let delimiter = '\t';
            if (!clipboardText.includes('\t')) {
                if (clipboardText.includes(';')) {
                    delimiter = ';';
                } else if (clipboardText.includes(',')) {
                    delimiter = ',';
                }
            }

            const csvOptions: CsvOptions = {
                delimiter,
                hasHeader: true,
                trimCells: true,
                quoteStrings: 'auto',
                includeHeader: true
            };

            const newTable = parseCsv(clipboardText, csvOptions);
            if (!newTable || newTable.rows.length < 2) {
                vscode.window.showWarningMessage('Could not parse clipboard content as table data.');
                return;
            }

            const compactOptions = getCompactOptions();
            const tableLines = compactTable(newTable, compactOptions);

            await editor.edit(editBuilder => {
                editBuilder.insert(editor.selection.active, tableLines.join('\n') + '\n');
            });

            vscode.window.showInformationMessage('Table pasted from clipboard!');
        })
    );

    // ========================================================================
    // SELECT COMMANDS
    // ========================================================================

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.selectRow', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const rowStart = new vscode.Position(ctx.cursorLine, 0);
            const rowEnd = new vscode.Position(ctx.cursorLine, ctx.lines[ctx.cursorLine].length);
            ctx.editor.selection = new vscode.Selection(rowStart, rowEnd);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.selectColumn', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const columnIndex = getColumnAtPosition(ctx.lines[ctx.cursorLine], ctx.cursorChar);
            
            // Select using multiple selections for each row
            const selections: vscode.Selection[] = [];
            for (let rowIdx = 0; rowIdx < ctx.table.rows.length; rowIdx++) {
                if (rowIdx === ctx.table.separatorIndex) continue;
                
                const lineNum = ctx.table.startLine + rowIdx;
                const line = ctx.lines[lineNum];
                
                // Find the column boundaries
                let pipeCount = 0;
                let colStart = 0;
                let colEnd = line.length;
                
                for (let i = 0; i < line.length; i++) {
                    if (line[i] === '|') {
                        if (pipeCount === columnIndex) {
                            colStart = i + 1;
                        } else if (pipeCount === columnIndex + 1) {
                            colEnd = i;
                            break;
                        }
                        pipeCount++;
                    }
                }
                
                selections.push(new vscode.Selection(
                    new vscode.Position(lineNum, colStart),
                    new vscode.Position(lineNum, colEnd)
                ));
            }
            
            if (selections.length > 0) {
                ctx.editor.selections = selections;
            }
        })
    );

    // ========================================================================
    // COPY COMMANDS
    // ========================================================================

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.copyRow', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const rowIndex = getRowIndexInTable(ctx.table, ctx.cursorLine);
            if (rowIndex === ctx.table.separatorIndex) {
                vscode.window.showWarningMessage('Cannot copy separator row.');
                return;
            }

            const row = ctx.table.rows[rowIndex];

            const format = await vscode.window.showQuickPick(
                [
                    { label: 'Multi-line list', value: 'newline' },
                    { label: 'Comma-separated', value: 'comma' },
                    { label: 'Semicolon-separated', value: 'semicolon' }
                ],
                { placeHolder: 'Select format for clipboard' }
            );

            if (!format) { return; }

            let separator: string;
            switch (format.value) {
                case 'semicolon': separator = ';'; break;
                case 'newline': separator = '\n'; break;
                default: separator = ','; break;
            }

            const text = row.join(separator);
            await vscode.env.clipboard.writeText(text);
            vscode.window.showInformationMessage('Row copied to clipboard!');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.copyColumn', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const columnIndex = getColumnAtPosition(ctx.lines[ctx.cursorLine], ctx.cursorChar);
            
            // Get all values in this column (excluding separator)
            const values: string[] = [];
            for (let rowIdx = 0; rowIdx < ctx.table.rows.length; rowIdx++) {
                if (rowIdx === ctx.table.separatorIndex) continue;
                const cell = ctx.table.rows[rowIdx][columnIndex] || '';
                values.push(cell);
            }

            const format = await vscode.window.showQuickPick(
                [
                    { label: 'Multi-line list', value: 'newline' },
                    { label: 'Comma-separated', value: 'comma' },
                    { label: 'Semicolon-separated', value: 'semicolon' }
                ],
                { placeHolder: 'Select format for clipboard' }
            );

            if (!format) { return; }

            let separator: string;
            switch (format.value) {
                case 'semicolon': separator = ';'; break;
                case 'newline': separator = '\n'; break;
                default: separator = ','; break;
            }

            const text = values.join(separator);
            await vscode.env.clipboard.writeText(text);
            vscode.window.showInformationMessage('Column copied to clipboard!');
        })
    );

    // ========================================================================
    // HTML CONVERSION COMMANDS
    // ========================================================================

    context.subscriptions.push(
        vscode.commands.registerCommand('md-table-buddy.convertToHtml', async () => {
            const ctx = getEditorAndTable();
            if (!ctx || !ctx.table) { return; }

            const html = tableToHtml(ctx.table);

            const action = await vscode.window.showQuickPick(
                ['Copy to clipboard', 'Replace table'],
                { placeHolder: 'What would you like to do with the HTML?' }
            );

            if (action === 'Copy to clipboard') {
                await vscode.env.clipboard.writeText(html);
                vscode.window.showInformationMessage('HTML table copied to clipboard!');
            } else if (action === 'Replace table') {
                await replaceTable(ctx.editor, ctx.table, html.split('\n'), ctx.lines);
                vscode.window.showInformationMessage('Table converted to HTML!');
            }
        })
    );
}

export function deactivate() {}
