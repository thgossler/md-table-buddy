/**
 * Utility functions for working with Markdown tables
 */

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

/**
 * Represents a parsed markdown table
 */
export interface MarkdownTable {
    startLine: number;
    endLine: number;
    rows: string[][];
    separatorIndex: number;
    alignments: ColumnAlignment[];
}

/**
 * Column alignment type
 */
export type ColumnAlignment = 'left' | 'center' | 'right' | 'none';

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
    /** Preserve original separator length ratios for Pandoc column width hints */
    keepSeparatorRatios: boolean;
}

/**
 * Options for formatting tables
 */
export interface FormatOptions {
    /** Maximum table width in characters. 0 = no limit */
    maxWidth: number;
    /** Add single space padding inside cells */
    cellPadding: boolean;
    /** Add single space padding in separator row */
    separatorPadding: boolean;
    /** Preserve existing column alignment markers */
    preserveAlignment: boolean;
    /** Preserve original separator length ratios for Pandoc column width hints */
    keepSeparatorRatios: boolean;
}

/**
 * Options for adding/updating row numbers
 */
export interface RowNumberOptions {
    /** Starting number (range: 0–100000) */
    startNumber: number;
    /** Header text for the number column */
    headerText: string;
    /** Column alignment */
    alignment: ColumnAlignment;
}

/**
 * Options for sorting tables
 */
export interface SortOptions {
    /** Column index to sort by (0-based) */
    columnIndex: number;
    /** Sort direction */
    direction: 'ascending' | 'descending';
    /** Sort type */
    sortType: 'text' | 'numeric' | 'date';
    /** Case sensitivity for text sort */
    caseSensitive: boolean;
    /** Keep header row (don't sort it) */
    keepHeaderRow: boolean;
}

/**
 * Options for CSV conversion
 */
export interface CsvOptions {
    /** Delimiter character */
    delimiter: string;
    /** First row is header */
    hasHeader: boolean;
    /** Trim whitespace from cell content */
    trimCells: boolean;
    /** Quote strings containing delimiter/newlines */
    quoteStrings: 'always' | 'auto' | 'never';
    /** Include header row in output */
    includeHeader: boolean;
}

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================

export function getDefaultCompactOptions(): CompactOptions {
    return {
        cellPadding: true,
        separatorPadding: true,
        alignSeparatorWithHeader: true,
        keepSeparatorRatios: false
    };
}

export function getDefaultFormatOptions(): FormatOptions {
    return {
        maxWidth: 0,
        cellPadding: true,
        separatorPadding: true,
        preserveAlignment: true,
        keepSeparatorRatios: false
    };
}

export function getDefaultRowNumberOptions(): RowNumberOptions {
    return {
        startNumber: 1,
        headerText: '#',
        alignment: 'right'
    };
}

export function getDefaultSortOptions(): SortOptions {
    return {
        columnIndex: 0,
        direction: 'ascending',
        sortType: 'text',
        caseSensitive: false,
        keepHeaderRow: true
    };
}

export function getDefaultCsvOptions(): CsvOptions {
    return {
        delimiter: ',',
        hasHeader: true,
        trimCells: true,
        quoteStrings: 'auto',
        includeHeader: true
    };
}

// ============================================================================
// BASIC TABLE PARSING
// ============================================================================

/**
 * Checks if a line is a markdown table row
 */
export function isTableRow(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && trimmed.endsWith('|');
}

/**
 * Checks if a line is a Unicode box table row
 */
export function isUnicodeTableRow(line: string): boolean {
    const trimmed = line.trim();
    return (trimmed.startsWith('│') && trimmed.endsWith('│')) ||
           (trimmed.startsWith('┌') || trimmed.startsWith('├') || 
            trimmed.startsWith('└') || trimmed.startsWith('┬') ||
            trimmed.startsWith('┼') || trimmed.startsWith('┴'));
}

/**
 * Checks if a line is a table separator (e.g., |---|---|)
 */
export function isTableSeparator(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
        return false;
    }
    const cells = trimmed.slice(1, -1).split('|');
    return cells.every(cell => /^\s*:?-+:?\s*$/.test(cell));
}

/**
 * Parses a table row into cells
 */
export function parseTableRow(line: string): string[] {
    const trimmed = line.trim();
    const content = trimmed.slice(1, -1);
    return content.split('|').map(cell => cell.trim());
}

/**
 * Gets the alignment from a separator cell
 */
export function getAlignmentFromSeparator(cell: string): ColumnAlignment {
    const trimmed = cell.trim();
    const leftAlign = trimmed.startsWith(':');
    const rightAlign = trimmed.endsWith(':');
    
    if (leftAlign && rightAlign) {
        return 'center';
    } else if (rightAlign) {
        return 'right';
    } else if (leftAlign) {
        return 'left';
    }
    return 'none';
}

/**
 * Parses alignments from a separator row
 */
export function parseAlignments(separatorRow: string[]): ColumnAlignment[] {
    return separatorRow.map(cell => getAlignmentFromSeparator(cell));
}

/**
 * Finds all code block ranges in the document (``` or ~~~)
 */
export function findCodeBlockRanges(lines: string[]): Array<{start: number, end: number}> {
    const ranges: Array<{start: number, end: number}> = [];
    let inCodeBlock = false;
    let codeBlockStart = -1;
    let codeBlockDelimiter = '';

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        
        if (!inCodeBlock) {
            if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
                inCodeBlock = true;
                codeBlockStart = i;
                codeBlockDelimiter = trimmed.substring(0, 3);
            }
        } else {
            if (trimmed.startsWith(codeBlockDelimiter) && trimmed.replace(/`/g, '').replace(/~/g, '').trim() === '') {
                ranges.push({ start: codeBlockStart, end: i });
                inCodeBlock = false;
                codeBlockStart = -1;
                codeBlockDelimiter = '';
            }
        }
    }

    // Handle unclosed code blocks
    if (inCodeBlock && codeBlockStart !== -1) {
        ranges.push({ start: codeBlockStart, end: lines.length - 1 });
    }

    return ranges;
}

/**
 * Checks if a line is inside a code block
 */
export function isLineInCodeBlock(lineNumber: number, codeBlockRanges: Array<{start: number, end: number}>): boolean {
    return codeBlockRanges.some(range => lineNumber >= range.start && lineNumber <= range.end);
}

/**
 * Finds all markdown tables in the document
 * @param ignoreCodeBlocks If true, tables inside code blocks will be ignored
 */
export function findTables(lines: string[], ignoreCodeBlocks: boolean = false): MarkdownTable[] {
    const tables: MarkdownTable[] = [];
    let i = 0;

    // Pre-compute code block ranges if needed
    const codeBlockRanges = ignoreCodeBlocks ? findCodeBlockRanges(lines) : [];

    while (i < lines.length) {
        // Skip if we're inside a code block
        if (ignoreCodeBlocks && isLineInCodeBlock(i, codeBlockRanges)) {
            i++;
            continue;
        }

        if (isTableRow(lines[i])) {
            const startLine = i;
            const rows: string[][] = [];
            let separatorIndex = -1;
            let alignments: ColumnAlignment[] = [];

            while (i < lines.length && isTableRow(lines[i])) {
                // Stop if we enter a code block
                if (ignoreCodeBlocks && isLineInCodeBlock(i, codeBlockRanges)) {
                    break;
                }

                const cells = parseTableRow(lines[i]);
                rows.push(cells);

                if (separatorIndex === -1 && isTableSeparator(lines[i])) {
                    separatorIndex = rows.length - 1;
                    alignments = parseAlignments(cells);
                }

                i++;
            }

            if (rows.length >= 2 && separatorIndex === 1) {
                tables.push({
                    startLine,
                    endLine: i - 1,
                    rows,
                    separatorIndex,
                    alignments
                });
            }
        } else {
            i++;
        }
    }

    return tables;
}

/**
 * Finds the table at a specific line position
 * @param ignoreCodeBlocks If true, tables inside code blocks will be ignored
 */
export function findTableAtPosition(lines: string[], lineNumber: number, ignoreCodeBlocks: boolean = false): MarkdownTable | undefined {
    const tables = findTables(lines, ignoreCodeBlocks);
    return tables.find(table => lineNumber >= table.startLine && lineNumber <= table.endLine);
}

/**
 * Gets the column index at a character position in a table row
 */
export function getColumnAtPosition(line: string, charPosition: number): number {
    // Start at -1 so that after seeing the first pipe, we're at column 0
    let columnIndex = -1;
    
    for (let i = 0; i <= charPosition && i < line.length; i++) {
        if (line[i] === '|') {
            columnIndex++;
        }
    }
    
    // columnIndex now represents the column we're in:
    // - After first pipe (table start): column 0
    // - After second pipe: column 1
    // - etc.
    return Math.max(0, columnIndex);
}

/**
 * Gets the row index within a table at a line position
 */
export function getRowIndexInTable(table: MarkdownTable, lineNumber: number): number {
    return lineNumber - table.startLine;
}

// ============================================================================
// TEXT MANIPULATION HELPERS
// ============================================================================

/**
 * Pads a string to a specified width with the given alignment
 */
export function padCell(content: string, width: number, alignment: ColumnAlignment): string {
    const contentLength = content.length;
    if (contentLength >= width) {
        return content;
    }
    
    const padding = width - contentLength;
    
    switch (alignment) {
        case 'right':
            return ' '.repeat(padding) + content;
        case 'center':
            const leftPad = Math.floor(padding / 2);
            const rightPad = padding - leftPad;
            return ' '.repeat(leftPad) + content + ' '.repeat(rightPad);
        case 'left':
        case 'none':
        default:
            return content + ' '.repeat(padding);
    }
}

/**
 * Calculates column widths for a table
 */
export function calculateColumnWidths(table: MarkdownTable): number[] {
    const columnCount = Math.max(...table.rows.map(row => row.length));
    const widths: number[] = new Array(columnCount).fill(0);
    
    for (const row of table.rows) {
        for (let i = 0; i < row.length; i++) {
            widths[i] = Math.max(widths[i], row[i].length);
        }
    }
    
    return widths;
}

// ============================================================================
// COMPACT TABLE
// ============================================================================

/**
 * Creates a separator cell with the specified alignment and width
 */
function createSeparatorCell(
    cell: string, 
    width: number, 
    options: CompactOptions | FormatOptions,
    alignment?: ColumnAlignment
): string {
    const trimmed = cell.trim();
    const leftAlign = alignment === 'left' || alignment === 'center' || trimmed.startsWith(':');
    const rightAlign = alignment === 'right' || alignment === 'center' || trimmed.endsWith(':');
    
    let dashCount = Math.max(3, width);
    if (leftAlign) {
        dashCount--;
    }
    if (rightAlign) {
        dashCount--;
    }
    dashCount = Math.max(1, dashCount);
    
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
    
    const cellPadding = 'cellPadding' in options ? options.cellPadding : false;
    const separatorPadding = 'separatorPadding' in options ? options.separatorPadding : false;
    
    if (cellPadding && separatorPadding) {
        return ' ' + separator + ' ';
    }
    return separator;
}

/**
 * Calculates proportional separator widths based on original separator lengths
 * @param originalSeparators The original separator row cells
 * @param targetTotalWidth The target total width to distribute (sum of all separator cell widths)
 * @returns Array of new widths for each separator cell (just the dashes+colons, no padding)
 */
function calculateProportionalSeparatorWidths(
    originalSeparators: string[],
    targetTotalWidth: number
): number[] {
    // Get original lengths (the actual separator content length, e.g., ":---:" = 5)
    const originalLengths = originalSeparators.map(cell => cell.trim().length);
    const originalTotal = originalLengths.reduce((sum, len) => sum + len, 0);
    
    if (originalTotal === 0) {
        // Fallback: equal distribution
        const perColumn = Math.max(3, Math.floor(targetTotalWidth / originalSeparators.length));
        return originalSeparators.map(() => perColumn);
    }
    
    // Calculate proportional widths
    const proportions = originalLengths.map(len => len / originalTotal);
    const newWidths = proportions.map(prop => Math.max(3, Math.round(prop * targetTotalWidth)));
    
    return newWidths;
}

/**
 * Compacts a single table row
 */
export function compactTableRow(
    cells: string[],
    isSeparator: boolean,
    options: CompactOptions = getDefaultCompactOptions(),
    headerWidths?: number[],
    alignments?: ColumnAlignment[]
): string {
    if (isSeparator) {
        const compactedCells = cells.map((cell, index) => {
            const width = options.alignSeparatorWithHeader && headerWidths
                ? headerWidths[index] || 3
                : 3;
            const alignment = alignments ? alignments[index] : undefined;
            return createSeparatorCell(cell, width, options, alignment);
        });
        return '|' + compactedCells.join('|') + '|';
    } else {
        if (options.cellPadding) {
            return '|' + cells.map(cell => ' ' + cell + ' ').join('|') + '|';
        }
        return '|' + cells.join('|') + '|';
    }
}

/**
 * Compacts a markdown table by removing unnecessary whitespace
 */
export function compactTable(
    table: MarkdownTable,
    options: CompactOptions = getDefaultCompactOptions()
): string[] {
    const headerRow = table.rows[0];
    const headerWidths = headerRow.map(cell => cell.length);
    
    // Calculate proportional separator widths if keepSeparatorRatios is enabled
    let separatorWidths: number[] | undefined;
    if (options.keepSeparatorRatios && table.separatorIndex >= 0) {
        const separatorRow = table.rows[table.separatorIndex];
        // Calculate target total width based on the total width of the compacted table
        // For compact mode, this is the sum of header widths (or 3 minimum) + padding
        const paddingPerCell = options.cellPadding ? 2 : 0;
        const separatorPadding = options.separatorPadding && options.cellPadding ? 2 : 0;
        
        // Calculate total table content width (excluding pipes)
        let totalContentWidth = 0;
        for (let i = 0; i < headerWidths.length; i++) {
            const width = options.alignSeparatorWithHeader 
                ? Math.max(3, headerWidths[i]) 
                : 3;
            totalContentWidth += width;
        }
        
        // Distribute proportionally among separator cells
        separatorWidths = calculateProportionalSeparatorWidths(separatorRow, totalContentWidth);
    }
    
    return table.rows.map((row, index) => {
        const isSeparator = index === table.separatorIndex;
        
        if (isSeparator && separatorWidths) {
            // Use proportional separator widths
            const compactedCells = row.map((cell, colIndex) => {
                const width = separatorWidths![colIndex] || 3;
                const alignment = table.alignments ? table.alignments[colIndex] : undefined;
                return createSeparatorCell(cell, width, options, alignment);
            });
            return '|' + compactedCells.join('|') + '|';
        }
        
        return compactTableRow(row, isSeparator, options, headerWidths, table.alignments);
    });
}

// ============================================================================
// FORMAT TABLE
// ============================================================================

/**
 * Formats a table with alignment and optional Unicode borders
 */
export function formatTable(
    table: MarkdownTable,
    options: FormatOptions = getDefaultFormatOptions(),
    compactOptions: CompactOptions = getDefaultCompactOptions()
): string[] {
    // Use table rows directly
    const processedRows = table.rows;
    
    // Calculate column widths based on content
    const columnCount = Math.max(...processedRows.map(row => row.length));
    const columnWidths: number[] = new Array(columnCount).fill(3);
    
    // Calculate header widths separately (minimum for separator alignment)
    const headerWidths: number[] = new Array(columnCount).fill(3);
    if (processedRows.length > 0) {
        for (let colIndex = 0; colIndex < processedRows[0].length; colIndex++) {
            headerWidths[colIndex] = Math.max(3, processedRows[0][colIndex].length);
        }
    }
    
    // Always align columns in format command - calculate max widths
    for (let rowIndex = 0; rowIndex < processedRows.length; rowIndex++) {
        if (rowIndex === table.separatorIndex) {
            continue;
        }
        for (let colIndex = 0; colIndex < processedRows[rowIndex].length; colIndex++) {
            columnWidths[colIndex] = Math.max(
                columnWidths[colIndex], 
                processedRows[rowIndex][colIndex].length
            );
        }
    }
    
    // Get alignments
    const alignments = options.preserveAlignment ? table.alignments : [];
    
    // For maxWidth formatting:
    // 1. Calculate which columns GLOBALLY fit within maxWidth (based on max content widths)
    // 2. Those columns are ALWAYS aligned across all rows
    // 3. For the break column, calculate max width of FITTING cells only
    // 4. Columns after the break point use actual cell content (compact)
    
    // Find the break column index - first column where accumulated width would exceed maxWidth
    let breakColumnIndex = columnCount; // Default: all columns fit
    let accumulatedBeforeBreak = 1; // Width accumulated before break column
    const paddingPerCell = options.cellPadding ? 2 : 0;
    
    if (options.maxWidth > 0) {
        let accumulatedWidth = 1; // Start with leading |
        
        for (let colIndex = 0; colIndex < columnCount; colIndex++) {
            const colWidth = columnWidths[colIndex] || 3;
            const cellWidth = colWidth + paddingPerCell + 1; // +1 for |
            
            if (accumulatedWidth + cellWidth > options.maxWidth) {
                breakColumnIndex = colIndex;
                accumulatedBeforeBreak = accumulatedWidth;
                break;
            }
            accumulatedWidth += cellWidth;
        }
    }
    
    // For the break column, calculate the max width of cells that FIT within maxWidth
    // Cells that would cause the row to exceed maxWidth are excluded from this calculation
    let breakColumnFittingWidth = 3; // Minimum width
    if (breakColumnIndex < columnCount && options.maxWidth > 0) {
        // Available width for break column content (excluding padding and |)
        const availableWidth = options.maxWidth - accumulatedBeforeBreak - paddingPerCell - 1;
        
        for (let rowIndex = 0; rowIndex < processedRows.length; rowIndex++) {
            if (rowIndex === table.separatorIndex) continue;
            
            const cell = processedRows[rowIndex][breakColumnIndex] || '';
            // Only include cells that fit within available width
            if (cell.length <= availableWidth) {
                breakColumnFittingWidth = Math.max(breakColumnFittingWidth, cell.length);
            }
        }
    }
    
    // Calculate proportional separator widths if keepSeparatorRatios is enabled
    let proportionalSeparatorWidths: number[] | undefined;
    if (options.keepSeparatorRatios && table.separatorIndex >= 0) {
        const separatorRow = table.rows[table.separatorIndex];
        // Calculate target total width = sum of column widths (the content widths)
        const targetTotalWidth = columnWidths.reduce((sum, w) => sum + w, 0);
        proportionalSeparatorWidths = calculateProportionalSeparatorWidths(separatorRow, targetTotalWidth);
    }
    
    // Format all rows
    return processedRows.map((row, rowIndex) => {
        if (rowIndex === table.separatorIndex) {
            // Format separator row
            const headerRow = processedRows[0] || [];
            
            // If keepSeparatorRatios is enabled, use proportional widths
            if (proportionalSeparatorWidths) {
                const separatorCells = row.map((cell, colIndex) => {
                    const width = proportionalSeparatorWidths![colIndex] || 3;
                    const alignment = alignments[colIndex] || 'none';
                    return createSeparatorCell(cell, width, options, alignment);
                });
                return '|' + separatorCells.join('|') + '|';
            }
            
            // Standard separator formatting
            
            const separatorCells = row.map((cell, colIndex) => {
                const colWidth = columnWidths[colIndex] || 3;
                const headerCell = headerRow[colIndex] || '';
                const alignment = alignments[colIndex] || 'none';
                
                if (colIndex < breakColumnIndex) {
                    // Column fits globally - use full width separator
                    return createSeparatorCell(cell, colWidth, options, alignment);
                } else if (colIndex === breakColumnIndex) {
                    // Break column - use fitting width if header fits, compact if it doesn't
                    if (headerCell.length <= breakColumnFittingWidth) {
                        return createSeparatorCell(cell, breakColumnFittingWidth, options, alignment);
                    } else {
                        const headerWidth = headerCell.length || 3;
                        return formatCompactSeparatorCell(cell, alignment, compactOptions, headerWidth);
                    }
                } else {
                    // Column after break - use compact separator (aligned to header text)
                    const headerWidth = headerCell.length || 3;
                    return formatCompactSeparatorCell(cell, alignment, compactOptions, headerWidth);
                }
            });
            return '|' + separatorCells.join('|') + '|';
        }
        
        // Header row with maxWidth
        if (rowIndex === 0 && options.maxWidth > 0) {
            const formattedCells = row.map((cell, colIndex) => {
                const colWidth = columnWidths[colIndex] || cell.length;
                const alignment = alignments[colIndex] || 'left';
                
                if (colIndex < breakColumnIndex) {
                    // Column fits globally - always pad to colWidth
                    const paddedCell = padCell(cell, colWidth, alignment);
                    if (options.cellPadding) {
                        return ' ' + paddedCell + ' ';
                    }
                    return paddedCell;
                } else if (colIndex === breakColumnIndex) {
                    // Break column - pad to fitting width if cell fits, compact if it doesn't
                    if (cell.length <= breakColumnFittingWidth) {
                        const paddedCell = padCell(cell, breakColumnFittingWidth, alignment);
                        if (options.cellPadding) {
                            return ' ' + paddedCell + ' ';
                        }
                        return paddedCell;
                    } else {
                        if (compactOptions.cellPadding) {
                            return ' ' + cell + ' ';
                        }
                        return cell;
                    }
                } else {
                    // Column after break - use compact formatting (actual content)
                    if (compactOptions.cellPadding) {
                        return ' ' + cell + ' ';
                    }
                    return cell;
                }
            });
            return '|' + formattedCells.join('|') + '|';
        }
        
        // Header row without maxWidth - use full column widths
        if (rowIndex === 0) {
            const formattedCells = row.map((cell, colIndex) => {
                const width = columnWidths[colIndex] || cell.length;
                const alignment = alignments[colIndex] || 'left';
                const paddedCell = padCell(cell, width, alignment);
                
                if (options.cellPadding) {
                    return ' ' + paddedCell + ' ';
                }
                return paddedCell;
            });
            return '|' + formattedCells.join('|') + '|';
        }
        
        // Format data row with maxWidth-aware logic
        if (options.maxWidth > 0) {
            return formatRowWithMaxWidth(row, columnWidths, alignments, options, compactOptions, breakColumnIndex, breakColumnFittingWidth);
        }
        
        // Standard formatting without maxWidth
        const formattedCells = row.map((cell, colIndex) => {
            const width = columnWidths[colIndex] || cell.length;
            const alignment = alignments[colIndex] || 'left';
            const paddedCell = padCell(cell, width, alignment);
            
            if (options.cellPadding) {
                return ' ' + paddedCell + ' ';
            }
            return paddedCell;
        });
        
        return '|' + formattedCells.join('|') + '|';
    });
}

/**
 * Formats a compact separator cell respecting compactOptions
 */
function formatCompactSeparatorCell(
    cell: string,
    alignment: ColumnAlignment,
    compactOptions: CompactOptions,
    headerWidth: number
): string {
    let separator: string;
    
    if (compactOptions.alignSeparatorWithHeader) {
        // Match separator width to header width
        separator = '-'.repeat(Math.max(3, headerWidth));
    } else {
        separator = '---';
    }
    
    // Apply alignment markers
    if (alignment === 'left') {
        separator = ':' + separator.slice(1);
    } else if (alignment === 'right') {
        separator = separator.slice(0, -1) + ':';
    } else if (alignment === 'center') {
        separator = ':' + separator.slice(1, -1) + ':';
    }
    
    // Apply padding based on compactOptions
    if (compactOptions.separatorPadding && compactOptions.cellPadding) {
        return ' ' + separator + ' ';
    }
    
    return separator;
}

/**
 * Formats a row with maxWidth constraint.
 * Columns before breakColumnIndex are always padded to column width.
 * Break column: padded to breakColumnFittingWidth if cell fits, compact if it doesn't.
 * Columns after breakColumnIndex use actual cell content (compact).
 */
function formatRowWithMaxWidth(
    row: string[],
    columnWidths: number[],
    alignments: ColumnAlignment[],
    options: FormatOptions,
    compactOptions: CompactOptions,
    breakColumnIndex: number,
    breakColumnFittingWidth: number
): string {
    const formattedCells: string[] = [];
    
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const cell = row[colIndex];
        const colWidth = columnWidths[colIndex] || cell.length;
        const alignment = alignments[colIndex] || 'left';
        
        if (colIndex < breakColumnIndex) {
            // Column fits globally - always pad to colWidth
            const paddedCell = padCell(cell, colWidth, alignment);
            if (options.cellPadding) {
                formattedCells.push(' ' + paddedCell + ' ');
            } else {
                formattedCells.push(paddedCell);
            }
        } else if (colIndex === breakColumnIndex) {
            // Break column - pad if cell fits within breakColumnFittingWidth, compact if it doesn't
            if (cell.length <= breakColumnFittingWidth) {
                const paddedCell = padCell(cell, breakColumnFittingWidth, alignment);
                if (options.cellPadding) {
                    formattedCells.push(' ' + paddedCell + ' ');
                } else {
                    formattedCells.push(paddedCell);
                }
            } else {
                // Cell exceeds fitting width - use compact
                if (compactOptions.cellPadding) {
                    formattedCells.push(' ' + cell + ' ');
                } else {
                    formattedCells.push(cell);
                }
            }
        } else {
            // Column after break - use compact formatting (actual content)
            if (compactOptions.cellPadding) {
                formattedCells.push(' ' + cell + ' ');
            } else {
                formattedCells.push(cell);
            }
        }
    }
    
    return '|' + formattedCells.join('|') + '|';
}

// ============================================================================
// ROW NUMBERS
// ============================================================================

/**
 * Checks if first column looks like row numbers
 */
export function hasRowNumbers(table: MarkdownTable, headerText: string = '#'): boolean {
    const knownHeaders = ['#', 'no', 'no.', 'nr', 'nr.', 'num', 'row', headerText.toLowerCase()];
    const firstHeader = table.rows[0][0]?.toLowerCase().trim();
    
    if (!knownHeaders.includes(firstHeader)) {
        return false;
    }
    
    // Check if data rows contain numbers
    for (let i = 2; i < table.rows.length; i++) {
        const cell = table.rows[i][0]?.trim();
        if (!/^\d+$/.test(cell)) {
            return false;
        }
    }
    
    return true;
}

/**
 * Adds or updates row numbers in a table
 */
export function addRowNumbers(
    table: MarkdownTable,
    options: RowNumberOptions = getDefaultRowNumberOptions()
): MarkdownTable {
    const hasNumbers = hasRowNumbers(table, options.headerText);
    const newRows: string[][] = [];
    
    let dataRowIndex = options.startNumber;
    
    for (let i = 0; i < table.rows.length; i++) {
        const row = [...table.rows[i]];
        
        if (i === 0) {
            // Header row
            if (hasNumbers) {
                row[0] = options.headerText;
            } else {
                row.unshift(options.headerText);
            }
        } else if (i === table.separatorIndex) {
            // Separator row
            const alignmentMarker = options.alignment === 'right' ? '---:' :
                                    options.alignment === 'center' ? ':---:' : ':---';
            if (hasNumbers) {
                row[0] = alignmentMarker;
            } else {
                row.unshift(alignmentMarker);
            }
        } else {
            // Data row
            const numStr = String(dataRowIndex);
            if (hasNumbers) {
                row[0] = numStr;
            } else {
                row.unshift(numStr);
            }
            dataRowIndex++;
        }
        
        newRows.push(row);
    }
    
    // Update alignments
    const newAlignments = hasNumbers 
        ? [options.alignment, ...table.alignments.slice(1)]
        : [options.alignment, ...table.alignments];
    
    return {
        ...table,
        rows: newRows,
        alignments: newAlignments
    };
}

/**
 * Removes row numbers from a table
 */
export function removeRowNumbers(table: MarkdownTable): MarkdownTable | null {
    if (!hasRowNumbers(table)) {
        return null;
    }
    
    const newRows = table.rows.map(row => row.slice(1));
    const newAlignments = table.alignments.slice(1);
    
    return {
        ...table,
        rows: newRows,
        alignments: newAlignments
    };
}

// ============================================================================
// SORTING
// ============================================================================

/**
 * Sorts a table by a column
 */
export function sortTable(
    table: MarkdownTable,
    options: SortOptions = getDefaultSortOptions()
): MarkdownTable {
    const headerRow = table.rows[0];
    const separatorRow = table.rows[table.separatorIndex];
    const dataRows = table.rows.filter((_, i) => i !== 0 && i !== table.separatorIndex);
    
    const sortedDataRows = [...dataRows].sort((a, b) => {
        const aVal = a[options.columnIndex] || '';
        const bVal = b[options.columnIndex] || '';
        
        let comparison: number;
        
        switch (options.sortType) {
            case 'numeric':
                const aNum = parseFloat(aVal.replace(/[^0-9.-]/g, '')) || 0;
                const bNum = parseFloat(bVal.replace(/[^0-9.-]/g, '')) || 0;
                comparison = aNum - bNum;
                break;
            case 'date':
                const aDate = new Date(aVal).getTime() || 0;
                const bDate = new Date(bVal).getTime() || 0;
                comparison = aDate - bDate;
                break;
            case 'text':
            default:
                const aText = options.caseSensitive ? aVal : aVal.toLowerCase();
                const bText = options.caseSensitive ? bVal : bVal.toLowerCase();
                comparison = aText.localeCompare(bText);
                break;
        }
        
        return options.direction === 'descending' ? -comparison : comparison;
    });
    
    const newRows = options.keepHeaderRow
        ? [headerRow, separatorRow, ...sortedDataRows]
        : [headerRow, separatorRow, ...sortedDataRows];
    
    return {
        ...table,
        rows: newRows
    };
}

// ============================================================================
// COLUMN OPERATIONS
// ============================================================================

/**
 * Inserts a new column at the specified index
 */
export function insertColumn(
    table: MarkdownTable,
    columnIndex: number,
    headerText: string = '',
    defaultValue: string = '',
    alignment: ColumnAlignment = 'left'
): MarkdownTable {
    const newRows = table.rows.map((row, rowIndex) => {
        const newRow = [...row];
        if (rowIndex === 0) {
            newRow.splice(columnIndex, 0, headerText);
        } else if (rowIndex === table.separatorIndex) {
            const alignmentMarker = alignment === 'right' ? '---:' :
                                    alignment === 'center' ? ':---:' : ':---';
            newRow.splice(columnIndex, 0, alignmentMarker);
        } else {
            newRow.splice(columnIndex, 0, defaultValue);
        }
        return newRow;
    });
    
    const newAlignments = [...table.alignments];
    newAlignments.splice(columnIndex, 0, alignment);
    
    return {
        ...table,
        rows: newRows,
        alignments: newAlignments
    };
}

/**
 * Removes a column at the specified index
 */
export function removeColumn(table: MarkdownTable, columnIndex: number): MarkdownTable {
    const newRows = table.rows.map(row => {
        const newRow = [...row];
        newRow.splice(columnIndex, 1);
        return newRow;
    });
    
    const newAlignments = [...table.alignments];
    newAlignments.splice(columnIndex, 1);
    
    return {
        ...table,
        rows: newRows,
        alignments: newAlignments
    };
}

/**
 * Moves a column left or right
 */
export function moveColumn(table: MarkdownTable, columnIndex: number, direction: 'left' | 'right'): MarkdownTable {
    const targetIndex = direction === 'left' ? columnIndex - 1 : columnIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= table.rows[0].length) {
        return table;
    }
    
    const newRows = table.rows.map(row => {
        const newRow = [...row];
        [newRow[columnIndex], newRow[targetIndex]] = [newRow[targetIndex], newRow[columnIndex]];
        return newRow;
    });
    
    const newAlignments = [...table.alignments];
    [newAlignments[columnIndex], newAlignments[targetIndex]] = [newAlignments[targetIndex], newAlignments[columnIndex]];
    
    return {
        ...table,
        rows: newRows,
        alignments: newAlignments
    };
}

/**
 * Sets alignment for a column
 */
export function setColumnAlignment(
    table: MarkdownTable,
    columnIndex: number,
    alignment: ColumnAlignment
): MarkdownTable {
    const newAlignments = [...table.alignments];
    newAlignments[columnIndex] = alignment;
    
    // Update separator row
    const newRows = table.rows.map((row, rowIndex) => {
        if (rowIndex !== table.separatorIndex) {
            return row;
        }
        const newRow = [...row];
        const alignmentMarker = alignment === 'right' ? '---:' :
                                alignment === 'center' ? ':---:' :
                                alignment === 'left' ? ':---' : '---';
        newRow[columnIndex] = alignmentMarker;
        return newRow;
    });
    
    return {
        ...table,
        rows: newRows,
        alignments: newAlignments
    };
}

// ============================================================================
// ROW OPERATIONS
// ============================================================================

/**
 * Inserts a new row at the specified index
 */
export function insertRow(
    table: MarkdownTable,
    rowIndex: number,
    cells?: string[]
): MarkdownTable {
    const columnCount = table.rows[0].length;
    const newCells = cells || new Array(columnCount).fill('');
    
    // Ensure we have the right number of cells
    while (newCells.length < columnCount) {
        newCells.push('');
    }
    
    const newRows = [...table.rows];
    newRows.splice(rowIndex, 0, newCells);
    
    // Adjust separator index if needed
    const newSeparatorIndex = rowIndex <= table.separatorIndex 
        ? table.separatorIndex + 1 
        : table.separatorIndex;
    
    return {
        ...table,
        rows: newRows,
        separatorIndex: newSeparatorIndex,
        endLine: table.endLine + 1
    };
}

/**
 * Removes a row at the specified index
 */
export function removeRow(table: MarkdownTable, rowIndex: number): MarkdownTable | null {
    // Don't remove header or separator
    if (rowIndex === 0 || rowIndex === table.separatorIndex) {
        return null;
    }
    
    const newRows = [...table.rows];
    newRows.splice(rowIndex, 1);
    
    const newSeparatorIndex = rowIndex < table.separatorIndex 
        ? table.separatorIndex - 1 
        : table.separatorIndex;
    
    return {
        ...table,
        rows: newRows,
        separatorIndex: newSeparatorIndex,
        endLine: table.endLine - 1
    };
}

/**
 * Moves a row up or down
 */
export function moveRow(table: MarkdownTable, rowIndex: number, direction: 'up' | 'down'): MarkdownTable | null {
    // Don't move header or separator
    if (rowIndex === 0 || rowIndex === table.separatorIndex) {
        return null;
    }
    
    const targetIndex = direction === 'up' ? rowIndex - 1 : rowIndex + 1;
    
    // Don't move into header or separator position, or out of bounds
    if (targetIndex === 0 || targetIndex === table.separatorIndex || 
        targetIndex < 0 || targetIndex >= table.rows.length) {
        return null;
    }
    
    const newRows = [...table.rows];
    [newRows[rowIndex], newRows[targetIndex]] = [newRows[targetIndex], newRows[rowIndex]];
    
    return {
        ...table,
        rows: newRows
    };
}

/**
 * Duplicates a row
 */
export function duplicateRow(table: MarkdownTable, rowIndex: number): MarkdownTable | null {
    // Don't duplicate header or separator
    if (rowIndex === 0 || rowIndex === table.separatorIndex) {
        return null;
    }
    
    const rowToDuplicate = [...table.rows[rowIndex]];
    return insertRow(table, rowIndex + 1, rowToDuplicate);
}

// ============================================================================
// TRANSPOSE
// ============================================================================

/**
 * Transposes a table (swaps rows and columns)
 */
export function transposeTable(table: MarkdownTable): MarkdownTable {
    // Get data rows only (exclude header and separator)
    const headerRow = table.rows[0];
    const dataRows = table.rows.filter((_, i) => i !== 0 && i !== table.separatorIndex);
    
    // New header is the first column of original data
    const newHeader = [headerRow[0], ...dataRows.map(row => row[0])];
    
    // New data rows are the remaining columns
    const newDataRows: string[][] = [];
    for (let col = 1; col < headerRow.length; col++) {
        const newRow = [headerRow[col], ...dataRows.map(row => row[col] || '')];
        newDataRows.push(newRow);
    }
    
    // Create new separator row
    const newSeparator = new Array(newHeader.length).fill('---');
    
    const newRows = [newHeader, newSeparator, ...newDataRows];
    const newAlignments = new Array(newHeader.length).fill('none' as ColumnAlignment);
    
    return {
        startLine: table.startLine,
        endLine: table.startLine + newRows.length - 1,
        rows: newRows,
        separatorIndex: 1,
        alignments: newAlignments
    };
}

// ============================================================================
// CSV CONVERSION
// ============================================================================

/**
 * Parses CSV text into a table
 */
export function parseCsv(
    text: string,
    options: CsvOptions = getDefaultCsvOptions()
): MarkdownTable {
    let delimiter = options.delimiter;
    
    // Auto-detect delimiter
    if (delimiter === 'auto') {
        const commaCount = (text.match(/,/g) || []).length;
        const semicolonCount = (text.match(/;/g) || []).length;
        const tabCount = (text.match(/\t/g) || []).length;
        
        if (tabCount > commaCount && tabCount > semicolonCount) {
            delimiter = '\t';
        } else if (semicolonCount > commaCount) {
            delimiter = ';';
        } else {
            delimiter = ',';
        }
    }
    
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    const rows: string[][] = [];
    
    for (const line of lines) {
        const cells = parseCsvLine(line, delimiter);
        if (options.trimCells) {
            rows.push(cells.map(cell => cell.trim()));
        } else {
            rows.push(cells);
        }
    }
    
    // Add separator row after header
    if (options.hasHeader && rows.length > 0) {
        const separatorRow = new Array(rows[0].length).fill('---');
        rows.splice(1, 0, separatorRow);
    }
    
    const alignments = new Array(rows[0]?.length || 0).fill('none' as ColumnAlignment);
    
    return {
        startLine: 0,
        endLine: rows.length - 1,
        rows,
        separatorIndex: options.hasHeader ? 1 : -1,
        alignments
    };
}

/**
 * Parses a single CSV line handling quoted values
 */
function parseCsvLine(line: string, delimiter: string): string[] {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === delimiter && !inQuotes) {
            cells.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    cells.push(current);
    return cells;
}

/**
 * Converts a table to CSV format
 */
export function tableToCsv(
    table: MarkdownTable,
    options: CsvOptions = getDefaultCsvOptions()
): string {
    const rowsToInclude = options.includeHeader
        ? table.rows.filter((_, i) => i !== table.separatorIndex)
        : table.rows.filter((_, i) => i !== 0 && i !== table.separatorIndex);
    
    return rowsToInclude.map(row => {
        return row.map(cell => {
            const needsQuotes = options.quoteStrings === 'always' ||
                (options.quoteStrings === 'auto' && 
                 (cell.includes(options.delimiter) || cell.includes('\n') || cell.includes('"')));
            
            if (needsQuotes) {
                return '"' + cell.replace(/"/g, '""') + '"';
            }
            return cell;
        }).join(options.delimiter);
    }).join('\n');
}

/**
 * Options for HTML table conversion
 */
export interface HtmlOptions {
    /** Include inline styles for alignment */
    includeStyles: boolean;
    /** Use <thead> and <tbody> elements */
    useSemanticTags: boolean;
    /** Indent with spaces (number of spaces, 0 = no indentation) */
    indentSpaces: number;
}

export function getDefaultHtmlOptions(): HtmlOptions {
    return {
        includeStyles: true,
        useSemanticTags: true,
        indentSpaces: 2
    };
}

/**
 * Converts a markdown table to HTML format
 */
export function tableToHtml(
    table: MarkdownTable,
    options: HtmlOptions = getDefaultHtmlOptions()
): string {
    const indent = (level: number) => options.indentSpaces > 0 ? ' '.repeat(options.indentSpaces * level) : '';
    const newline = options.indentSpaces > 0 ? '\n' : '';

    const getAlignStyle = (colIndex: number): string => {
        if (!options.includeStyles) return '';
        const alignment = table.alignments[colIndex] || 'left';
        if (alignment === 'none' || alignment === 'left') return '';
        return ` style="text-align: ${alignment}"`;
    };

    const lines: string[] = [];
    lines.push('<table>');

    // Filter out separator row
    const dataRows = table.rows.filter((_, i) => i !== table.separatorIndex);
    const headerRow = dataRows[0];
    const bodyRows = dataRows.slice(1);

    if (options.useSemanticTags) {
        // Header
        lines.push(`${indent(1)}<thead>`);
        lines.push(`${indent(2)}<tr>`);
        headerRow.forEach((cell, colIndex) => {
            lines.push(`${indent(3)}<th${getAlignStyle(colIndex)}>${escapeHtml(cell)}</th>`);
        });
        lines.push(`${indent(2)}</tr>`);
        lines.push(`${indent(1)}</thead>`);

        // Body
        if (bodyRows.length > 0) {
            lines.push(`${indent(1)}<tbody>`);
            bodyRows.forEach(row => {
                lines.push(`${indent(2)}<tr>`);
                row.forEach((cell, colIndex) => {
                    lines.push(`${indent(3)}<td${getAlignStyle(colIndex)}>${escapeHtml(cell)}</td>`);
                });
                lines.push(`${indent(2)}</tr>`);
            });
            lines.push(`${indent(1)}</tbody>`);
        }
    } else {
        // Simple format without semantic tags
        dataRows.forEach((row, rowIndex) => {
            lines.push(`${indent(1)}<tr>`);
            row.forEach((cell, colIndex) => {
                const tag = rowIndex === 0 ? 'th' : 'td';
                lines.push(`${indent(2)}<${tag}${getAlignStyle(colIndex)}>${escapeHtml(cell)}</${tag}>`);
            });
            lines.push(`${indent(1)}</tr>`);
        });
    }

    lines.push('</table>');

    return lines.join(newline);
}

/**
 * Escapes HTML special characters
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Creates a new empty table with specified dimensions
 */
export function createEmptyTable(rows: number, columns: number, alignment: ColumnAlignment = 'left'): MarkdownTable {
    const tableRows: string[][] = [];
    
    // Header row
    const headerRow: string[] = [];
    for (let c = 0; c < columns; c++) {
        headerRow.push(`Column ${c + 1}`);
    }
    tableRows.push(headerRow);

    // Separator row
    const separatorRow: string[] = [];
    for (let c = 0; c < columns; c++) {
        separatorRow.push(alignment === 'center' ? ':---:' : alignment === 'right' ? '---:' : ':---');
    }
    tableRows.push(separatorRow);

    // Data rows
    for (let r = 0; r < rows - 1; r++) {
        const dataRow: string[] = [];
        for (let c = 0; c < columns; c++) {
            dataRow.push('');
        }
        tableRows.push(dataRow);
    }

    const alignments: ColumnAlignment[] = [];
    for (let c = 0; c < columns; c++) {
        alignments.push(alignment);
    }

    return {
        startLine: 0,
        endLine: rows,
        rows: tableRows,
        separatorIndex: 1,
        alignments
    };
}

// ============================================================================
// TABLE TO STRING
// ============================================================================

/**
 * Converts a MarkdownTable to string lines
 */
export function tableToLines(table: MarkdownTable): string[] {
    return table.rows.map(row => '|' + row.join('|') + '|');
}
