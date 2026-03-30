# Contributing to open-annex-iv

Thank you for your interest in contributing. This library is used for regulatory filings submitted to EU NCAs, so accuracy and reliability are paramount.

## How to Contribute

1. **Open an issue first** — describe the bug or feature before writing code
2. **Fork the repository** and create a branch from `main`
3. **Write tests** for any new functionality
4. **Run the test suite** before submitting: `npm test`
5. **Submit a pull request** with a clear description

## Development Setup

```bash
git clone https://github.com/julianlaycock/open-annex-iv.git
cd open-annex-iv
npm install
npm run build
npm test
```

## Code Standards

- **TypeScript strict mode** — all code must pass `tsc --strict`
- **Zero runtime dependencies** (except `zod` for validation)
- **Pure functions** — serializers must be deterministic (same input = same output)
- **ESMA compliance** — any field mapping change must reference the relevant ESMA technical standard or XSD schema

## Testing

- All exported functions must have tests
- Field mapping tests should include real-world values from ESMA sample files
- XSD validation tests require `libxmljs2` (optional native module)
- Run: `npm test` (uses the built-in test runner)

## Regulatory Accuracy

If you're changing field mappings, code lists, or XML structure:
- Reference the specific ESMA document (e.g., "AIFMD_DATAIF_V1.2.xsd Rev 6, element AIF_010")
- Include before/after XML output in the PR description
- Tag the PR with `regulatory` label

## Code of Conduct

Be respectful, constructive, and professional. This is a compliance tool used by regulated financial institutions — contributions should reflect that standard.

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.
