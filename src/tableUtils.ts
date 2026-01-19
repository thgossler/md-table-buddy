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
 * Compacts a single table row by removing unnecessary whitespace
 */
export function compactTableRow(cells: string[], isSeparator: boolean): string {
    if (isSeparator) {
        // For separator rows, preserve alignment markers but minimize dashes
        const compactedCells = cells.map(cell => {
            const trimmed = cell.trim();
            const leftAlign = trimmed.startsWith(':');
            const rightAlign = trimmed.endsWith(':');
            
            if (leftAlign && rightAlign) {
                return ':---:';
            } else if (leftAlign) {
                return ':---';
            } else if (rightAlign) {
                return '---:';
            } else {
                return '---';
            }
        });
        return '|' + compactedCells.join('|') + '|';
    } else {
        // For regular rows, just trim each cell
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
export function compactTable(table: MarkdownTable): string[] {
    return table.rows.map((row, index) => {
        const isSeparator = index === table.separatorIndex;
        return compactTableRow(row, isSeparator);
    });
}

/**
 * Finds the table at a specific line position
 */
export function findTableAtPosition(lines: string[], lineNumber: number): MarkdownTable | undefined {
    const tables = findTables(lines);
    return tables.find(table => lineNumber >= table.startLine && lineNumber <= table.endLine);
}
