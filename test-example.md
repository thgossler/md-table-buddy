# Test Example for Data Row Stretching

This file demonstrates the data row stretching feature.

## Before Fix

When a table had overflow columns (columns that exceeded maxWidth), data rows with short content in those overflow columns would remain compacted, even if the row total width was less than maxWidth:

```
| ID  | Type  | Description        |  <- 40 chars (maxWidth = 80)
| --- | ----- | ------------------ |
| 1   | Error | This is a very long error message that exceeds maxWidth causing overflow |  <- 85 chars
| 2   | Warn  | Short |  <- Only 20 chars (wasted space!)
```

## After Fix

Now data rows with short content in overflow columns are stretched proportionally to use available space up to maxWidth:

```
| ID  | Type  | Description                                                      |  <- 80 chars
| --- | ----- | ---------------------------------------------------------------- |
| 1   | Error | This is a very long error message that exceeds maxWidth causing overflow |  <- 85 chars
| 2   | Warn  | Short                                                            |  <- 80 chars (stretched!)
```

## Test Table

Use this table to test:
- Set `md-table-buddy.formatTable.maxWidth` to 80
- Place cursor in table
- Run "Format Table" command

| ID | Type | Description |
| ------ | ------ | ------ |
| 1 | Error | This is a very long error message that exceeds maxWidth causing the Description column to overflow |
| 2 | Warning | Medium length text |
| 3 | Info | Short |
