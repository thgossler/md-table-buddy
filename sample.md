# Sample Markdown File for Testing

This file contains sample tables for testing the Markdown Table Buddy extension.

## Table 1: Simple Table

| Name       |   Age   |    City        |
|------------|---------|----------------|
| John Doe   |   30    | New York       |
| Jane Smith |   25    | Los Angeles    |
| Bob Wilson |   35    | Chicago        |

## Table 2: Aligned Table

| Left Aligned | Center Aligned | Right Aligned |
|:-------------|:--------------:|--------------:|
| Left         |     Center     |         Right |
| Data         |      More      |        Values |

## Table 3: Already Compact

|Name|Age|City|
|---|---|---|
|Test|20|Place|

## Some Text Between Tables

This is some regular paragraph text that should not be affected by the table compacting commands.

## Table 4: Wide Table

| Column 1                 | Column 2                 | Column 3                 |
|--------------------------|--------------------------|--------------------------|
| This is a longer cell    | Another long cell here   | And one more for testing |
| Short                    | Medium length            | Tiny                     |

## Table 5: Extremely Wide Table

| Column 1                 | Column 2                 | Column 3                 |
|--------------------------|--------------------------|--------------------------|
| This is a longer cell    | Another long cell here with long test exceeding typical line width   | And one more for testing that's also very long |
| Short                    | Medium length            | Yet another long cell with long test exceeding typical line width in the last column                    |

## Table 6: Test MaxWidth Behavior (set maxWidth to 80)

| Name | Age | City | Country | Description |
|---|---|---|---|---|
| John | 30 | New York | USA | Software Engineer with 10 years experience |
| Jane | 25 | Los Angeles | USA | Data Scientist specializing in machine learning |
| Bob | 35 | Chicago | USA | Project Manager with extensive background in agile methodologies |

## Table 7: Test keepSeparatorRatios with MaxWidth (set maxWidth to 80, keepSeparatorRatios to true)

| Name | Age | City | Country | Description |
|----------|-----|----------|----------|------------------------------------------------|
| John | 30 | New York | USA | Software Engineer with 10 years experience |
| Jane | 25 | Los Angeles | USA | Data Scientist specializing in machine learning |
| Bob | 35 | Chicago | USA | Project Manager with extensive background in agile methodologies |

## Table 8: Test Manual Separator Ratio Edits

This table has custom separator ratios. Try editing the separator dashes to different lengths
(e.g., change `|---` to `|----------`) and save with format-on-save enabled. Your custom
ratios should be preserved and scaled to fit maxWidth.

| Col1 | Col2 | Col3 | Col4 |
|---|----------|------|-------------|
| A | B | C | D |
| E | F | G | H |

## Table 9: Test Header Stretching for Narrow Headers (set maxWidth to 100)

This table has short header text but long data cells. The overflow header columns should be
stretched proportionally to use the available space up to maxWidth, while data cells remain
compacted (actual content width).

| ID | Type | Description |
|---|---|---|
| 1 | Error | This is a very long error message that exceeds the typical line width |
| 2 | Warning | Another lengthy warning text that would normally cause overflow |
| 3 | Info | Yet another message with substantial content that needs compacting |

## Table 10: Test Separator Alignment to Content Width (set maxWidth to 120, keepSeparatorRatios to true)

This table has content that fits well within maxWidth. The separator row should match the actual
content width, NOT stretch all the way to maxWidth (see issue in earlier versions).

| Abbreviation | Explanation |
|----------|-----------|
| AaaS | Archiving-as-a-Service (teamplay platform) |
| ADL | API and Data Link (VADL connectivity component) |
| AKS | Azure Kubernetes Service |

## End of Sample File
