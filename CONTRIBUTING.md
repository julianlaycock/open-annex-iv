# Contributing to open-annex-iv

Thanks for your interest in contributing. This project aims to be the reference open-source implementation for AIFMD Annex IV regulatory reporting.

## Getting started

```bash
git clone https://github.com/julianlaycock/open-annex-iv.git
cd open-annex-iv
npm install
npm test
npm run build
```

## How to contribute

1. **Open an issue first** — describe the bug or feature before writing code
2. **Fork and branch** — create a feature branch from `main`
3. **Write tests** — all new functionality needs tests
4. **Run the test suite** — `npm test` must pass (179+ tests)
5. **Submit a PR** — reference the issue in your pull request

## Code style

- TypeScript strict mode
- Pure functions, no side effects
- Zero runtime dependencies
- XML output must align with ESMA technical standards (ESMA/2013/1358)

## Areas where help is needed

- XSD schema validation (we need the official ESMA schema files)
- Additional ESMA code mappings (strategy types, instrument classifications)
- NCA-specific filing documentation (BaFin, CSSF, AMF, CNMV, CBI)
- Python bindings
- AIFMD II (Directive 2024/927) field extensions

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.

## About

This project is maintained by [Caelith Technologies](https://caelith.tech) and open to community contributions.
