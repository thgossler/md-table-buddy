import * as assert from 'assert';
import {
    isTableRow,
    isTableSeparator,
    parseTableRow,
    compactTableRow,
    findTables,
    compactTable,
    findTableAtPosition,
    getDefaultCompactOptions,
    CompactOptions
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
});
