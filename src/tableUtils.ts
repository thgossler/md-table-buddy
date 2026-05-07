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
/**
 * Calculates proportional separator widths based on the current separator row.
 * IMPORTANT: This function reads the actual dash counts from the separator cells
 * in the table being formatted. If a user manually edits the separator dashes
 * to adjust Pandoc column width hints, those changes are preserved and scaled
 * to fit the target width while maintaining the user's chosen ratios.
 * 
 * @param originalSeparators - Array of separator cells from the current table state
 * @param targetTotalWidth - Total width to distribute across all separators
 * @returns Array of widths proportional to the original separator lengths
 */
function calculateProportionalSeparatorWidths(
    originalSeparators: string[],
    targetTotalWidth: number
): number[] {
    // Get original lengths (the actual separator content length, e.g., ":---:" = 5)
    // This reads the CURRENT state, including any user modifications
    const originalLengths = originalSeparators.map(cell => cell.trim().length);
    const originalTotal = originalLengths.reduce((sum, len) => sum + len, 0);
    
    if (originalTotal === 0) {
        // Fallback: equal distribution
        const perColumn = Math.max(3, Math.floor(targetTotalWidth / originalSeparators.length));
        return originalSeparators.map(() => perColumn);
    }
    
    // Calculate proportional widths maintaining current ratios
    const proportions = originalLengths.map(len => len / originalTotal);
    const newWidths = proportions.map(prop => Math.max(3, Math.round(prop * targetTotalWidth)));
    
    // Adjust if total doesn't match target exactly (due to rounding)
    let actualTotal = newWidths.reduce((sum, w) => sum + w, 0);
    
    if (actualTotal > targetTotalWidth) {
        // Reduce the last column by the excess (ensure it stays at least 3)
        const excess = actualTotal - targetTotalWidth;
        const lastIndex = newWidths.length - 1;
        newWidths[lastIndex] = Math.max(3, newWidths[lastIndex] - excess);
    } else if (actualTotal < targetTotalWidth) {
        // Distribute the remaining width to columns with the largest fractional parts
        const deficit = targetTotalWidth - actualTotal;
        const fractionalParts = proportions.map((prop, i) => ({
            index: i,
            frac: (prop * targetTotalWidth) - Math.floor(prop * targetTotalWidth)
        })).sort((a, b) => b.frac - a.frac); // Sort descending by fractional part
        
        // Add 1 to the columns with largest fractional parts
        for (let i = 0; i < deficit && i < fractionalParts.length; i++) {
            newWidths[fractionalParts[i].index]++;
        }
    }
    
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
    const processedRows = table.rows;
    const columnCount = Math.max(...processedRows.map(row => row.length));
    
    // Get alignments
    const alignments = options.preserveAlignment ? table.alignments : [];
    
    // Determine break column index and calculate aligned column widths
    // Strategy: accumulate columns until adding the next would exceed maxWidth
    // Columns before break point: aligned based on max(header, data)
    // Columns from break point onward: independently compacted
    
    let breakColumnIndex = columnCount; // Default: all columns fit
    const columnWidths: number[] = new Array(columnCount).fill(3);
    const paddingPerCell = options.cellPadding ? 2 : 0;
    
    if (options.maxWidth > 0) {
        let accumulatedWidth = 1; // Start with leading |
        
        for (let colIndex = 0; colIndex < columnCount; colIndex++) {
            // Calculate max width for this column (all rows)
            let maxWidth = 3; // Minimum width
            
            for (let rowIndex = 0; rowIndex < processedRows.length; rowIndex++) {
                if (rowIndex === table.separatorIndex) continue;
                if (colIndex < processedRows[rowIndex].length) {
                    maxWidth = Math.max(maxWidth, processedRows[rowIndex][colIndex].length);
                }
            }
            
            const cellWidth = maxWidth + paddingPerCell + 1; // +1 for |
            
            if (accumulatedWidth + cellWidth > options.maxWidth) {
                // This column would exceed maxWidth - it becomes the break point
                breakColumnIndex = colIndex;
                break;
            }
            
            columnWidths[colIndex] = maxWidth;
            accumulatedWidth += cellWidth;
        }
    } else {
        // No maxWidth limit - calculate all column widths
        for (let rowIndex = 0; rowIndex < processedRows.length; rowIndex++) {
            if (rowIndex === table.separatorIndex) continue;
            for (let colIndex = 0; colIndex < processedRows[rowIndex].length; colIndex++) {
                columnWidths[colIndex] = Math.max(
                    columnWidths[colIndex],
                    processedRows[rowIndex][colIndex].length
                );
            }
        }
    }

    // Pre-compute max content widths for overflow columns so that empty cells in
    // those columns can be padded to a reasonable width (matching the widest content).
    const overflowColumnMaxWidths: number[] = [];
    if (breakColumnIndex < columnCount) {
        for (let colIndex = breakColumnIndex; colIndex < columnCount; colIndex++) {
            let maxW = 0;
            for (let rowIndex = 0; rowIndex < processedRows.length; rowIndex++) {
                if (rowIndex === table.separatorIndex) continue;
                if (colIndex < processedRows[rowIndex].length) {
                    maxW = Math.max(maxW, processedRows[rowIndex][colIndex].length);
                }
            }
            overflowColumnMaxWidths.push(maxW);
        }
    }

    // Calculate stretched widths for overflow header columns
    // When header row width < maxWidth, distribute space among overflow columns
    // proportional to their text length
    let stretchedOverflowWidths: number[] | undefined;
    if (options.maxWidth > 0 && breakColumnIndex < columnCount && processedRows.length > 0) {
        const headerRow = processedRows[0];
        
        // Calculate total width used by aligned columns
        let alignedWidth = 1; // Leading |
        for (let i = 0; i < breakColumnIndex; i++) {
            alignedWidth += columnWidths[i] + paddingPerCell + 1; // +1 for |
        }
        
        const overflowHeaderLengths: number[] = [];
        let overflowHeaderTextWidth = 0;
        for (let i = breakColumnIndex; i < headerRow.length; i++) {
            const len = headerRow[i].length;
            overflowHeaderLengths.push(len);
            overflowHeaderTextWidth += len;
        }
        
        // Calculate minimum width needed for overflow header columns (text + padding + pipes)
        const overflowColumnCount = headerRow.length - breakColumnIndex;
        const minOverflowWidth = overflowColumnCount * (paddingPerCell + 1); // pipes and padding
        
        // Total width of header row with minimum overflow columns
        const headerRowWidth = alignedWidth + minOverflowWidth + overflowHeaderTextWidth;
        
        // Stretch if header row width < maxWidth
        if (headerRowWidth < options.maxWidth && overflowHeaderTextWidth > 0) {
            const availableForOverflow = options.maxWidth - alignedWidth - minOverflowWidth;
            
            // Distribute space proportionally based on header text length
            stretchedOverflowWidths = overflowHeaderLengths.map(len => {
                const proportion = len / overflowHeaderTextWidth;
                return Math.max(len, Math.floor(proportion * availableForOverflow));
            });
        }
    }
    
    // Calculate proportional separator widths if keepSeparatorRatios is enabled
    // When enabled, maintain ratios across ALL columns
    // IMPORTANT: The separator row is read from the current table state, so any
    // manual edits to separator dashes (for Pandoc column width hints) are preserved
    // This is calculated AFTER stretchedOverflowWidths so we can match actual content width
    let proportionalSeparatorWidths: number[] | undefined;
    if (options.keepSeparatorRatios && table.separatorIndex >= 0) {
        const separatorRow = table.rows[table.separatorIndex]; // Current state with user edits
        
        if (options.maxWidth > 0) {
            // Calculate the actual header row total width (including padding and pipes)
            const headerPaddingPerCell = options.cellPadding ? 2 : 0;
            const headerRow = processedRows[0];
            
            let headerRowWidth = 1; // Leading pipe
            
            // Add width of aligned columns
            for (let i = 0; i < breakColumnIndex; i++) {
                headerRowWidth += columnWidths[i] + headerPaddingPerCell + 1; // content + padding + pipe
            }
            
            // Add width of overflow columns
            if (stretchedOverflowWidths) {
                for (let i = 0; i < stretchedOverflowWidths.length; i++) {
                    headerRowWidth += stretchedOverflowWidths[i] + headerPaddingPerCell + 1;
                }
            } else {
                // Overflow columns without stretching use actual content (compacted)
                for (let i = breakColumnIndex; i < headerRow.length; i++) {
                    const cell = headerRow[i] || '';
                    const cellPaddingForOverflow = compactOptions.cellPadding ? 2 : 0;
                    headerRowWidth += cell.length + cellPaddingForOverflow + 1;
                }
            }
            
            // Target separator row width should match header (capped at maxWidth)
            const targetSeparatorRowWidth = Math.min(options.maxWidth, headerRowWidth);
            
            // Calculate target content width for separators (excluding pipes and padding)
            const separatorPaddingPerCell = options.separatorPadding ? 2 : 0;
            const pipesWidth = columnCount + 1; // Leading | plus one | per column
            const paddingWidth = columnCount * separatorPaddingPerCell;
            
            const targetSeparatorContentWidth = targetSeparatorRowWidth - pipesWidth - paddingWidth;
            
            proportionalSeparatorWidths = calculateProportionalSeparatorWidths(
                separatorRow, 
                Math.max(columnCount * 3, targetSeparatorContentWidth)
            );
        } else {
            // No maxWidth constraint - use column widths as target
            const targetTotalWidth = columnWidths.reduce((sum, w) => sum + w, 0);
            proportionalSeparatorWidths = calculateProportionalSeparatorWidths(separatorRow, targetTotalWidth);
        }
    }
    
    // Format all rows
    return processedRows.map((row, rowIndex) => {
        if (rowIndex === table.separatorIndex) {
            // Format separator row
            const separatorCells = row.map((cell, colIndex) => {
                const alignment = alignments[colIndex] || 'none';
                
                if (proportionalSeparatorWidths && colIndex < proportionalSeparatorWidths.length) {
                    // Use proportional width (keepSeparatorRatios is enabled)
                    const width = proportionalSeparatorWidths[colIndex];
                    return createSeparatorCell(cell, width, options, alignment);
                } else if (colIndex < breakColumnIndex) {
                    // Column fits - use aligned width
                    return createSeparatorCell(cell, columnWidths[colIndex], options, alignment);
                } else {
                    // Overflow column - check if we have stretched width
                    const overflowIndex = colIndex - breakColumnIndex;
                    if (stretchedOverflowWidths && overflowIndex < stretchedOverflowWidths.length) {
                        // Use stretched width to match header
                        return createSeparatorCell(cell, stretchedOverflowWidths[overflowIndex], options, alignment);
                    } else {
                        // Use minimum 3-dash separator
                        return createMinimalSeparatorCell(alignment, options);
                    }
                }
            });
            return '|' + separatorCells.join('|') + '|';
        }
        
        // Format header row (with stretching for overflow columns)
        if (rowIndex === 0) {
            const formattedCells = row.map((cell, colIndex) => {
                const alignment = alignments[colIndex] || 'left';
                
                if (colIndex < breakColumnIndex) {
                    // Column fits - align to column width
                    const paddedCell = padCell(cell, columnWidths[colIndex], alignment);
                    if (options.cellPadding) {
                        return ' ' + paddedCell + ' ';
                    }
                    return paddedCell;
                } else {
                    // Overflow column - check if we have stretched width
                    const overflowIndex = colIndex - breakColumnIndex;
                    if (stretchedOverflowWidths && overflowIndex < stretchedOverflowWidths.length) {
                        // Use stretched width
                        const paddedCell = padCell(cell, stretchedOverflowWidths[overflowIndex], alignment);
                        if (options.cellPadding) {
                            return ' ' + paddedCell + ' ';
                        }
                        return paddedCell;
                    } else {
                        // Use actual cell content (compact)
                        if (compactOptions.cellPadding) {
                            return ' ' + cell + ' ';
                        }
                        return cell;
                    }
                }
            });
            return '|' + formattedCells.join('|') + '|';
        }
        
        // Format data rows (overflow columns can be stretched if row width < maxWidth)
        const formattedCells = row.map((cell, colIndex) => {
            const alignment = alignments[colIndex] || 'left';
            
            if (colIndex < breakColumnIndex) {
                // Column fits - align to column width
                const paddedCell = padCell(cell, columnWidths[colIndex], alignment);
                if (options.cellPadding) {
                    return ' ' + paddedCell + ' ';
                }
                return paddedCell;
            } else {
                // Overflow column - will be handled below with potential stretching
                if (compactOptions.cellPadding) {
                    return ' ' + cell + ' ';
                }
                return cell;
            }
        });
        
        // Calculate if we should stretch overflow columns for this data row
        if (options.maxWidth > 0 && breakColumnIndex < row.length) {
            // Calculate current row width
            let currentRowWidth = 1; // Leading |
            
            // Add aligned columns
            for (let i = 0; i < breakColumnIndex; i++) {
                currentRowWidth += columnWidths[i] + (options.cellPadding ? 2 : 0) + 1; // content + padding + |
            }
            
            // Add compacted overflow columns
            const overflowCells = row.slice(breakColumnIndex);
            for (const cell of overflowCells) {
                currentRowWidth += cell.length + (compactOptions.cellPadding ? 2 : 0) + 1; // content + padding + |
            }
            
            // If row is shorter than maxWidth, stretch overflow columns proportionally
            if (currentRowWidth < options.maxWidth) {
                const overflowStartIndex = breakColumnIndex;
                const overflowCount = row.length - breakColumnIndex;
                
                // Calculate width used by aligned columns (including pipes and padding)
                let alignedWidth = 1; // Leading |
                for (let i = 0; i < breakColumnIndex; i++) {
                    alignedWidth += columnWidths[i] + (options.cellPadding ? 2 : 0) + 1; // content + padding + |
                }
                
                // Calculate available space for overflow columns
                const pipesForOverflow = overflowCount; // One pipe per overflow column
                const paddingForOverflow = overflowCount * (compactOptions.cellPadding ? 2 : 0);
                const minOverflowWidth = pipesForOverflow + paddingForOverflow;
                
                const overflowCellLengths = overflowCells.map(cell => cell.length);
                const totalOverflowTextWidth = overflowCellLengths.reduce((sum, len) => sum + len, 0);
                
                if (totalOverflowTextWidth > 0) {
                    const availableForOverflow = options.maxWidth - alignedWidth - minOverflowWidth;
                    
                    // Distribute space proportionally based on cell content length
                    const proportions = overflowCellLengths.map(len => len / totalOverflowTextWidth);
                    const floored = proportions.map((prop, i) => Math.max(overflowCellLengths[i], Math.floor(prop * availableForOverflow)));
                    const flooredSum = floored.reduce((sum, w) => sum + w, 0);
                    
                    // Distribute remaining space to columns with largest fractional parts
                    const remainder = availableForOverflow - flooredSum;
                    if (remainder > 0) {
                        const fractionals = proportions.map((prop, i) => {
                            const target = prop * availableForOverflow;
                            return { index: i, frac: target - floored[i] };
                        }).sort((a, b) => b.frac - a.frac);
                        
                        for (let i = 0; i < remainder && i < fractionals.length; i++) {
                            floored[fractionals[i].index]++;
                        }
                    }
                    
                    // Apply stretched widths to overflow columns
                    for (let i = 0; i < overflowCells.length; i++) {
                        const colIndex = overflowStartIndex + i;
                        const stretchedWidth = floored[i];
                        const cellAlignment = alignments[colIndex] || 'left';
                        const paddedCell = padCell(overflowCells[i], stretchedWidth, cellAlignment);
                        
                        if (compactOptions.cellPadding) {
                            formattedCells[colIndex] = ' ' + paddedCell + ' ';
                        } else {
                            formattedCells[colIndex] = paddedCell;
                        }
                    }
                } else {
                    // All overflow cells are empty. Distribute the same available
                    // budget (options.maxWidth) proportionally using the pre-computed
                    // max content widths as proportions — never exceeding maxWidth.
                    const availableForOverflow = options.maxWidth - alignedWidth - minOverflowWidth;
                    const overflowTotalMaxWidth = overflowColumnMaxWidths.reduce((sum, w) => sum + w, 0);
                    if (overflowTotalMaxWidth > 0 && availableForOverflow > 0) {
                        const widths = overflowColumnMaxWidths.map(w =>
                            Math.min(w, Math.floor((w / overflowTotalMaxWidth) * availableForOverflow))
                        );
                        for (let i = 0; i < overflowCells.length; i++) {
                            const colIndex = overflowStartIndex + i;
                            const targetWidth = widths[i];
                            if (targetWidth > 0) {
                                const cellAlignment = alignments[colIndex] || 'left';
                                const paddedCell = padCell('', targetWidth, cellAlignment);
                                if (compactOptions.cellPadding) {
                                    formattedCells[colIndex] = ' ' + paddedCell + ' ';
                                } else {
                                    formattedCells[colIndex] = paddedCell;
                                }
                            }
                        }
                    }
                }
            }
        }
        
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
 * Creates a minimal separator cell (3 dashes minimum) for overflow columns
 */
function createMinimalSeparatorCell(
    alignment: ColumnAlignment,
    options: CompactOptions | FormatOptions
): string {
    let separator: string;
    
    // Create minimum separator based on alignment
    // Minimum is 3 characters: --- or :-- or --: or :-:
    if (alignment === 'left') {
        separator = ':--';
    } else if (alignment === 'right') {
        separator = '--:';
    } else if (alignment === 'center') {
        separator = ':-:';
    } else {
        separator = '---';
    }
    
    // Apply padding based on options
    const cellPadding = 'cellPadding' in options ? options.cellPadding : false;
    const separatorPadding = 'separatorPadding' in options ? options.separatorPadding : false;
    
    if (cellPadding && separatorPadding) {
        return ' ' + separator + ' ';
    }
    
    return separator;
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

// ============================================================================
// ADJUST SEPARATOR RATIOS
// ============================================================================

/**
 * Strips markdown formatting and HTML tags from text to get visible length
 */
function getVisibleTextLength(text: string): number {
    let cleaned = text;
    
    // Preserve autolinks <url> by extracting the URL (before HTML tag removal)
    // Autolinks are <URL> or <email@domain> that render as visible links
    cleaned = cleaned.replace(/<([^\s<>]+(?:@[^\s<>]+|:\/\/[^\s<>]+))>/g, '$1');
    
    // Remove HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    
    // Remove markdown links [text](url) -> text
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    // Remove markdown images ![alt](url) -> alt
    cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
    
    // Remove bold/italic markers **, __, *, _
    cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, '$2');
    cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, '$2');
    
    // Remove strikethrough ~~text~~ -> text
    cleaned = cleaned.replace(/~~(.*?)~~/g, '$1');
    
    // Remove inline code `code` -> code
    cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
    
    // Remove reference-style links [text][ref] -> text
    cleaned = cleaned.replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1');
    
    return cleaned.trim().length;
}

/**
 * Adjusts separator column ratios based on visible text lengths in data rows.
 * Only modifies the separator row, preserving all other table formatting.
 */
export function adjustSeparatorRatios(table: MarkdownTable, lines: string[]): string[] {
    if (table.separatorIndex < 0 || table.rows.length < 2) {
        // Return original lines for the table range
        return lines.slice(table.startLine, table.endLine + 1);
    }
    
    const columnCount = table.rows[0].length;
    const columnWidths: number[] = new Array(columnCount).fill(3);
    
    // Calculate max visible width for each column from all rows (including header)
    for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex++) {
        if (rowIndex === table.separatorIndex) {
            continue; // Skip separator row
        }
        
        const row = table.rows[rowIndex];
        for (let colIndex = 0; colIndex < Math.min(row.length, columnCount); colIndex++) {
            const visibleLength = getVisibleTextLength(row[colIndex]);
            columnWidths[colIndex] = Math.max(columnWidths[colIndex], visibleLength);
        }
    }
    
    // Get current separator row and calculate current total dash count
    const separatorRow = table.rows[table.separatorIndex];
    let currentTotalDashes = 0;
    const currentDashCounts: number[] = [];
    
    for (const cell of separatorRow) {
        const trimmed = cell.trim();
        // Count dashes (excluding alignment colons)
        const dashCount = (trimmed.match(/-/g) || []).length;
        currentDashCounts.push(dashCount);
        currentTotalDashes += dashCount;
    }
    
    // Calculate total proportional width
    const totalProportionalWidth = columnWidths.reduce((sum, w) => sum + w, 0);
    
    // Redistribute the same total dash count proportionally
    const newDashCounts: number[] = [];
    let assignedDashes = 0;
    
    for (let i = 0; i < columnCount - 1; i++) {
        const proportion = totalProportionalWidth > 0 ? columnWidths[i] / totalProportionalWidth : 1 / columnCount;
        const dashes = Math.max(1, Math.round(proportion * currentTotalDashes));
        newDashCounts.push(dashes);
        assignedDashes += dashes;
    }
    
    // Last column gets the remainder to ensure exact total
    newDashCounts.push(Math.max(1, currentTotalDashes - assignedDashes));
    
    // Detect padding from original separator line
    const originalSeparatorLine = lines[table.startLine + table.separatorIndex];
    const hasPadding = originalSeparatorLine.includes(' -') || originalSeparatorLine.includes('- ');
    
    // Build new separator cells preserving alignment and padding
    const newSeparatorCells = separatorRow.map((cell, colIndex) => {
        const alignment = getAlignmentFromSeparator(cell);
        const dashCount = newDashCounts[colIndex];
        const dashes = '-'.repeat(dashCount);
        
        let separator: string;
        if (alignment === 'center') {
            separator = ':' + dashes + ':';
        } else if (alignment === 'left') {
            separator = ':' + dashes;
        } else if (alignment === 'right') {
            separator = dashes + ':';
        } else {
            separator = dashes;
        }
        
        // Add padding if original had padding
        if (hasPadding) {
            separator = ' ' + separator + ' ';
        }
        
        return separator;
    });
    
    // Build new separator line
    const newSeparatorLine = '|' + newSeparatorCells.join('|') + '|';
    
    // Return original lines with only separator line replaced
    const result = lines.slice(table.startLine, table.endLine + 1);
    result[table.separatorIndex] = newSeparatorLine;
    
    return result;
}
