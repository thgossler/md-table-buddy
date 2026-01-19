/**
 * Utility functions for working with Markdown tables
 */

/**
 * Represents a parsed markdown table
 */
export interface MarkdownTable {
    startLine: number;
    endLine: number;
    rows: string[][];
    separatorIndex: number;
}

/**
 * Options for compacting tables
 */
export interface CompactOptions {
    /** Add a space at the start and end of each cell */
    cellPadding: boolean;
    /** Add a space at the start and end of separator cells (requires cellPadding) */
    separatorPadding: boolean;
    /** Align separator column widths with header text widths */
    alignSeparatorWithHeader: boolean;
}

/**
 * Checks if a line is a markdown table row
 */
export function isTableRow(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && trimmed.endsWith('|');
}

/**
 * Checks if a line is a table separator (e.g., |---|---|)
 */
export function isTableSeparator(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
        return false;
    }
    // Remove leading/trailing pipes and split
    const cells = trimmed.slice(1, -1).split('|');
    // Each cell should match separator pattern: optional colons with dashes
    return cells.every(cell => /^\s*:?-+:?\s*$/.test(cell));
}

/**
 * Parses a table row into cells
 */
export function parseTableRow(line: string): string[] {
    const trimmed = line.trim();
    // Remove leading and trailing pipes, then split by pipe
    const content = trimmed.slice(1, -1);
    return content.split('|').map(cell => cell.trim());
}

/**
 * Gets the default compact options
 */
export function getDefaultCompactOptions(): CompactOptions {
    return {
        cellPadding: false,
        separatorPadding: false,
        alignSeparatorWithHeader: false
    };
}

/**
 * Creates a separator cell with the specified alignment and width
 */
function createSeparatorCell(cell: string, width: number, options: CompactOptions): string {
    const trimmed = cell.trim();
    const leftAlign = trimmed.startsWith(':');
    const rightAlign = trimmed.endsWith(':');
    
    // Calculate minimum dashes needed (at least 3)
    let dashCount = Math.max(3, width);
    if (leftAlign) {
        dashCount--;
    }
    if (rightAlign) {
        dashCount--;
    }
    dashCount = Math.max(1, dashCount); // Ensure at least 1 dash
    
    const dashes = '-'.repeat(dashCount);
    let separator: string;
    
    if (leftAlign && rightAlign) {
        separator = ':' + dashes + ':';
    } else if (leftAlign) {
        separator = ':' + dashes;
    } else if (rightAlign) {
        separator = dashes + ':';
    } else {
        separator = '-'.repeat(Math.max(3, width));
    }
    
    // Add padding if enabled for separators
    if (options.cellPadding && options.separatorPadding) {
        return ' ' + separator + ' ';
    }
    return separator;
}

/**
 * Compacts a single table row by removing unnecessary whitespace
 */
export function compactTableRow(
    cells: string[],
    isSeparator: boolean,
    options: CompactOptions = getDefaultCompactOptions(),
    headerWidths?: number[]
): string {
    if (isSeparator) {
        // For separator rows, preserve alignment markers
        const compactedCells = cells.map((cell, index) => {
            const width = options.alignSeparatorWithHeader && headerWidths
                ? headerWidths[index] || 3
                : 3;
            return createSeparatorCell(cell, width, options);
        });
        return '|' + compactedCells.join('|') + '|';
    } else {
        // For regular rows, trim each cell and optionally add padding
        if (options.cellPadding) {
            return '|' + cells.map(cell => ' ' + cell + ' ').join('|') + '|';
        }
        return '|' + cells.join('|') + '|';
    }
}

/**
 * Finds all markdown tables in the document
 */
export function findTables(lines: string[]): MarkdownTable[] {
    const tables: MarkdownTable[] = [];
    let i = 0;

    while (i < lines.length) {
        // Look for a potential table start (header row)
        if (isTableRow(lines[i])) {
            const startLine = i;
            const rows: string[][] = [];
            let separatorIndex = -1;

            // Parse consecutive table rows
            while (i < lines.length && isTableRow(lines[i])) {
                const cells = parseTableRow(lines[i]);
                rows.push(cells);

                if (separatorIndex === -1 && isTableSeparator(lines[i])) {
                    separatorIndex = rows.length - 1;
                }

                i++;
            }

            // Valid table needs at least header + separator + one data row
            // and separator should be at index 1 (second row)
            if (rows.length >= 2 && separatorIndex === 1) {
                tables.push({
                    startLine,
                    endLine: i - 1,
                    rows,
                    separatorIndex
                });
            }
        } else {
            i++;
        }
    }

    return tables;
}

/**
 * Compacts a markdown table by removing unnecessary whitespace
 */
export function compactTable(
    table: MarkdownTable,
    options: CompactOptions = getDefaultCompactOptions()
): string[] {
    // Calculate header widths for separator alignment
    const headerRow = table.rows[0];
    const headerWidths = headerRow.map(cell => cell.length);
    
    return table.rows.map((row, index) => {
        const isSeparator = index === table.separatorIndex;
        return compactTableRow(row, isSeparator, options, headerWidths);
    });
}

/**
 * Finds the table at a specific line position
 */
export function findTableAtPosition(lines: string[], lineNumber: number): MarkdownTable | undefined {
    const tables = findTables(lines);
    return tables.find(table => lineNumber >= table.startLine && lineNumber <= table.endLine);
}
