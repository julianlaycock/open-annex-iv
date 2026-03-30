# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-01

### Added
- `serializeAnnexIVToXml()` — serialize a single AIF report to ESMA-compliant XML
- `serializeAggregateAnnexIVToXml()` — serialize multiple AIFs into a single AIFM-level report
- `validateAnnexIVData()` — Zod-based structural validation of report objects
- `validateAnnexIVXml()` — XSD validation against ESMA AIFMD_DATAIF_V1.2.xsd (Rev 6)
- EEA country helpers: `isEEADomicile()`, `mapDomicileToMemberState()`, `toISOCountryCode()`
- ESMA code mapping: `mapToPredominantAIFType()`, `mapAssetType()`, `mapDepositaryType()`
- ISO validators: `isValidISO4217()`, `isValidMIC()`, `normalizeLEI()`, `isValidLEIFormat()`
- Reporting frequency mapping: `mapReportingObligationToFrequencyCode()`
- Full ESMA XSD schemas included (AIFMD_DATAIF_V1.2.xsd, AIFMD_DATMAN_V1.2.xsd)
- ESMA sample XML files for validation reference
- 179 tests covering serialization, field mapping, ISO validation, and XSD compliance
- TypeScript strict mode, zero-dependency core (only `zod` for validation)
- Apache 2.0 license

### Supported NCAs
- BaFin (Germany) — KAGB-compliant field mappings
- CSSF (Luxembourg) — SIF/RAIF regime support
- FMA (Austria), AMF (France), AFM (Netherlands), CBI (Ireland) — standard ESMA fields

[1.0.0]: https://github.com/julianlaycock/open-annex-iv/releases/tag/v1.0.0
