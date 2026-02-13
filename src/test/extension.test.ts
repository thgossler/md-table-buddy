import * as assert from 'assert';
import {
    isTableRow,
    isTableSeparator,
    parseTableRow,
    compactTableRow,
    findTables,
    compactTable,
    findTableAtPosition,
    formatTable,
    getDefaultCompactOptions,
    getDefaultFormatOptions,
    CompactOptions,
    FormatOptions
} from '../tableUtils';

suite('Table Utils Test Suite', () => {

    suite('isTableRow', () => {
        test('should return true for valid table rows', () => {
            assert.strictEqual(isTableRow('| cell1 | cell2 |'), true);
            assert.strictEqual(isTableRow('|cell1|cell2|'), true);
            assert.strictEqual(isTableRow('  | cell1 | cell2 |  '), true);
        });

        test('should return false for non-table rows', () => {
            assert.strictEqual(isTableRow('not a table row'), false);
            assert.strictEqual(isTableRow('| missing end'), false);
            assert.strictEqual(isTableRow('missing start |'), false);
            assert.strictEqual(isTableRow(''), false);
        });
    });

    suite('isTableSeparator', () => {
        test('should return true for valid separators', () => {
            assert.strictEqual(isTableSeparator('|---|---|'), true);
            assert.strictEqual(isTableSeparator('| --- | --- |'), true);
            assert.strictEqual(isTableSeparator('|:---|---:|'), true);
            assert.strictEqual(isTableSeparator('|:---:|:---:|'), true);
            assert.strictEqual(isTableSeparator('|---------|---------|'), true);
        });

        test('should return false for non-separators', () => {
            assert.strictEqual(isTableSeparator('| cell | cell |'), false);
            assert.strictEqual(isTableSeparator('|abc|def|'), false);
            assert.strictEqual(isTableSeparator('not a separator'), false);
        });
    });

    suite('parseTableRow', () => {
        test('should parse cells correctly', () => {
            const cells = parseTableRow('| cell1 | cell2 | cell3 |');
            assert.deepStrictEqual(cells, ['cell1', 'cell2', 'cell3']);
        });

        test('should trim whitespace from cells', () => {
            const cells = parseTableRow('|  padded  |   extra   |');
            assert.deepStrictEqual(cells, ['padded', 'extra']);
        });
    });

    suite('compactTableRow', () => {
        test('should compact regular rows with padding by default', () => {
            const result = compactTableRow(['cell1', 'cell2', 'cell3'], false);
            assert.strictEqual(result, '| cell1 | cell2 | cell3 |');
        });

        test('should compact separator rows with alignment and padding by default', () => {
            assert.strictEqual(compactTableRow([':---', '---:', ':---:'], true), '| :-- | --: | :-: |');
            assert.strictEqual(compactTableRow(['---', '---', '---'], true), '| --- | --- | --- |');
        });

        test('should add cell padding when option enabled', () => {
            const options: CompactOptions = { cellPadding: true, separatorPadding: false, alignSeparatorWithHeader: false, keepSeparatorRatios: false };
            const result = compactTableRow(['cell1', 'cell2'], false, options);
            assert.strictEqual(result, '| cell1 | cell2 |');
        });

        test('should add separator padding when both options enabled', () => {
            const options: CompactOptions = { cellPadding: true, separatorPadding: true, alignSeparatorWithHeader: false, keepSeparatorRatios: false };
            const result = compactTableRow(['---', ':---:'], true, options);
            assert.strictEqual(result, '| --- | :-: |');
        });

        test('should not add separator padding when only separatorPadding enabled', () => {
            const options: CompactOptions = { cellPadding: false, separatorPadding: true, alignSeparatorWithHeader: false, keepSeparatorRatios: false };
            const result = compactTableRow(['---', '---'], true, options);
            assert.strictEqual(result, '|---|---|');
        });
    });

    suite('findTables', () => {
        test('should find a single table', () => {
            const lines = [
                '| Header1 | Header2 |',
                '|---------|---------|',
                '| Cell1   | Cell2   |'
            ];
            const tables = findTables(lines);
            assert.strictEqual(tables.length, 1);
            assert.strictEqual(tables[0].startLine, 0);
            assert.strictEqual(tables[0].endLine, 2);
            assert.strictEqual(tables[0].separatorIndex, 1);
        });

        test('should find multiple tables', () => {
            const lines = [
                '# Heading',
                '',
                '| Header1 | Header2 |',
                '|---------|---------|',
                '| Cell1   | Cell2   |',
                '',
                'Some text',
                '',
                '| A | B |',
                '|---|---|',
                '| 1 | 2 |'
            ];
            const tables = findTables(lines);
            assert.strictEqual(tables.length, 2);
        });

        test('should return empty array for no tables', () => {
            const lines = ['Just some text', 'No tables here'];
            const tables = findTables(lines);
            assert.strictEqual(tables.length, 0);
        });
    });

    suite('compactTable', () => {
        test('should compact a table with default options', () => {
            const lines = [
                '| Header1   | Header2   |',
                '|-----------|-----------|',
                '| Cell1     | Cell2     |'
            ];
            const tables = findTables(lines);
            const compacted = compactTable(tables[0]);
            assert.deepStrictEqual(compacted, [
                '| Header1 | Header2 |',
                '| ------- | ------- |',
                '| Cell1 | Cell2 |'
            ]);
        });

        test('should compact with cell padding', () => {
            const lines = [
                '| Header1 | Header2 |',
                '|---------|---------|',
                '| Cell1   | Cell2   |'
            ];
            const tables = findTables(lines);
            const options: CompactOptions = { cellPadding: true, separatorPadding: false, alignSeparatorWithHeader: false, keepSeparatorRatios: false };
            const compacted = compactTable(tables[0], options);
            assert.deepStrictEqual(compacted, [
                '| Header1 | Header2 |',
                '|---|---|',
                '| Cell1 | Cell2 |'
            ]);
        });

        test('should align separator with header widths', () => {
            const lines = [
                '| LongHeader | Short |',
                '|------------|-------|',
                '| Data       | X     |'
            ];
            const tables = findTables(lines);
            const options: CompactOptions = { cellPadding: false, separatorPadding: false, alignSeparatorWithHeader: true, keepSeparatorRatios: false };
            const compacted = compactTable(tables[0], options);
            assert.strictEqual(compacted[0], '|LongHeader|Short|');
            assert.strictEqual(compacted[1], '|----------|-----|');
        });

        test('should combine all options', () => {
            const lines = [
                '| Header1 | Header2 |',
                '|---------|---------|',
                '| Cell    | Data    |'
            ];
            const tables = findTables(lines);
            const options: CompactOptions = { cellPadding: true, separatorPadding: true, alignSeparatorWithHeader: true, keepSeparatorRatios: false };
            const compacted = compactTable(tables[0], options);
            assert.strictEqual(compacted[0], '| Header1 | Header2 |');
            assert.strictEqual(compacted[1], '| ------- | ------- |');
            assert.strictEqual(compacted[2], '| Cell | Data |');
        });
    });

    suite('findTableAtPosition', () => {
        test('should find table at cursor position', () => {
            const lines = [
                '# Heading',
                '',
                '| Header1 | Header2 |',
                '|---------|---------|',
                '| Cell1   | Cell2   |',
                '',
                'Text'
            ];
            
            const table = findTableAtPosition(lines, 3);
            assert.ok(table);
            assert.strictEqual(table.startLine, 2);
            assert.strictEqual(table.endLine, 4);
        });

        test('should return undefined when cursor not in table', () => {
            const lines = [
                '# Heading',
                '',
                '| Header1 | Header2 |',
                '|---------|---------|',
                '| Cell1   | Cell2   |'
            ];
            
            const table = findTableAtPosition(lines, 0);
            assert.strictEqual(table, undefined);
        });
    });

    suite('formatTable', () => {
        test('separator width should match header width with keepSeparatorRatios and maxWidth', () => {
            // Simplified test case with known widths
            const lines = [
                '| Name | Age | City |',
                '|------|-----|------|',
                '| John | 30  | NYC  |'
            ];
            
            const tables = findTables(lines);
            assert.strictEqual(tables.length, 1);
            
            const formatOptions: FormatOptions = {
                maxWidth: 40,
                cellPadding: true,
                separatorPadding: true,
                preserveAlignment: true,
                keepSeparatorRatios: true
            };
            
            const formatted = formatTable(tables[0], formatOptions);
            
            const headerWidth = formatted[0].length;
            const separatorWidth = formatted[1].length;
            
            // The separator width should match the header width
            assert.strictEqual(separatorWidth, headerWidth, 
                `Separator width (${separatorWidth}) should match header width (${headerWidth})`);
        });

        test('separator should not exceed maxWidth when keepSeparatorRatios is true', () => {
            // Test when all content fits within maxWidth
            const lines = [
                '| A | B | C |',
                '|---|---|---|',
                '| 1 | 2 | 3 |'
            ];
            
            const tables = findTables(lines);
            const formatOptions: FormatOptions = {
                maxWidth: 30,
                cellPadding: true,
                separatorPadding: true,
                preserveAlignment: true,
                keepSeparatorRatios: true
            };
            
            const formatted = formatTable(tables[0], formatOptions);
            
            const headerWidth = formatted[0].length;
            const separatorWidth = formatted[1].length;
            
            assert.strictEqual(separatorWidth, headerWidth,
                `Separator width (${separatorWidth}) should match header width (${headerWidth})`);
            assert.ok(headerWidth <= formatOptions.maxWidth,
                `Header width (${headerWidth}) should be <= maxWidth (${formatOptions.maxWidth})`);
        });

        test('separator matches header when header has stretched overflow columns', () => {
            // Test the original bug: header columns get stretched to use available space,
            // and separator should match that width
            const lines = [
                '| Option | Description | Status |',
                '|--------|-------------|--------|',
                '| A | B | C |',
                '| D | E | F |'
            ];
            
            const tables = findTables(lines);
            const formatOptions: FormatOptions = {
                maxWidth: 60,
                cellPadding: true,
                separatorPadding: true,
                preserveAlignment: true,
                keepSeparatorRatios: true
            };
            
            const formatted = formatTable(tables[0], formatOptions);
            
            const headerWidth = formatted[0].length;
            const separatorWidth = formatted[1].length;
            
            // All rows should have matching widths
            assert.strictEqual(separatorWidth, headerWidth,
                `Separator width (${separatorWidth}) should match header width (${headerWidth})`);
            
            // Should not exceed maxWidth
            assert.ok(headerWidth <= formatOptions.maxWidth,
                `Header width (${headerWidth}) should be <= maxWidth (${formatOptions.maxWidth})`);
            assert.ok(separatorWidth <= formatOptions.maxWidth,
                `Separator width (${separatorWidth}) should be <= maxWidth (${formatOptions.maxWidth})`);
        });

        test('data rows stretch to maxWidth when overflow columns have short content', () => {
            // Test that data rows with short content in overflow columns get stretched
            // This table has long content in Description column for some rows, causing it to be an overflow column
            const lines = [
                '| ID | Type | Description |',
                '|---|---|---|',
                '| 1 | Error | This is a very long error message that exceeds typical line width |',
                '| 2 | Warn | Short |'
            ];
            
            const tables = findTables(lines);
            const formatOptions: FormatOptions = {
                maxWidth: 70,
                cellPadding: true,
                separatorPadding: true,
                preserveAlignment: true,
                keepSeparatorRatios: false
            };
            
            const formatted = formatTable(tables[0], formatOptions);
            
            // Row 2 has a long description - it will exceed maxWidth
            // Row 3 has a short description - it should be stretched to use available space up to maxWidth
            const row2Width = formatted[3].length;
            
            // Row 2 should be stretched closer to maxWidth (not just minimal compacted width)
            assert.ok(row2Width >= 50, `Row 2 width (${row2Width}) should be stretched to use available space`);
            assert.ok(row2Width <= formatOptions.maxWidth,
                `Row 2 width (${row2Width}) should not exceed maxWidth (${formatOptions.maxWidth})`);
        });
    });
});
