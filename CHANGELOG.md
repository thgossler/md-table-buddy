# Changelog

All notable changes to the "Markdown Table Buddy" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-01-19

### Added
- Initial release of Markdown Table Buddy
- **Compact Table** command - removes unnecessary whitespace from the table at cursor position
- **Compact All Tables** command - compacts all tables in the current Markdown document
- Context menu integration in Markdown files
- Command palette integration with "Markdown Table Buddy" category
- Support for table alignment markers (`:---`, `:---:`, `---:`)

### Technical
- TypeScript-based implementation
- Comprehensive unit tests for table parsing utilities
- ESLint configuration for code quality
- GitHub Actions workflows (disabled by default) for CI/CD