# open-annex-iv

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm version](https://img.shields.io/npm/v/open-annex-iv.svg)](https://www.npmjs.com/package/open-annex-iv)
[![Tests: 104 passing](https://img.shields.io/badge/tests-104%20passing-brightgreen.svg)]()

**Open-source AIFMD Annex IV XML serialization library.**

Zero runtime dependencies. Pure functions. TypeScript-first. Output validated against ESMA AIFMD_DATAIF_V1.2.xsd (Rev 6).

---

## Why this exists

Every AIFM in Europe must file Annex IV reports to regulators (BaFin, CSSF, AMF, CNMV, etc.) under [Article 24 of the AIFMD](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32011L0061). The XML format follows ESMA's technical standards, but there are **zero open-source tools** to generate it. Fund managers either pay €15–50K/yr for enterprise software or build fragile in-house pipelines.

This library changes that.

## Features

- **XML Serialization** — Convert a plain `AnnexIVReport` object to ESMA Annex IV XML
- **Aggregate Reports** — Generate AIFM-level XML covering multiple funds
- **ESMA Code Mappings** — Fund types, asset classes, depositary types → ESMA codes
- **EEA Helpers** — Country name/code validation, domicile-to-member-state mapping
- **Reporting Obligation Detection** — Article 24(1)/24(2)/24(4) classification
- **XSD Validated** — Output passes ESMA AIFMD_DATAIF_V1.2.xsd Rev 6 schema validation
- **104 tests passing** (97 serializer + 5 strict + 2 XSD validation)

## What this library does NOT do

To stay honest about scope (this is a serializer, not a filing platform):

- **Does NOT submit to regulators.** No BaFin MVP Portal SOAP client, no CSSF eDesk S3 client. You generate the XML; submission is your responsibility.
- **Does NOT include four-eyes / Vier-Augen approval workflow.** No state machine, no second-reviewer enforcement.
- **Does NOT compute risk metrics, leverage, or stress tests.** Inputs must be pre-computed and passed in.
- **Does NOT include depositary at the AIF level.** ESMA's AIFMD DATAIF V1.2 schema does not carry a depositary element at the AIF level; depositary data is reported via DATMAN (AIFM-level) or through national wrappers. This library reads `depositary` from the input type but does not emit it into Annex IV XML.
- **Does NOT validate against national wrappers** (e.g. BaFin's NCA-specific envelope). The XML is ESMA-baseline only.
- **Does NOT include an audit trail / hash chain / four-eyes approval log.** Those concerns belong upstream.

For the production-grade filing pipeline (submission + approval + audit chain + cross-NCA orchestration), see [Caelith](https://caelith.tech).

## Installation

```bash
npm install open-annex-iv
```

## Quick Start

```typescript
import { serializeAnnexIVToXml, type AnnexIVReport } from 'open-annex-iv';

const report: AnnexIVReport = {
  aif_identification: {
    reporting_period: { start: '2025-01-01', end: '2025-03-31' },
    aif_name: 'Muster Immobilien Spezial-AIF',
    aif_national_code: 'DE000001',
    aif_type: 'Spezial_AIF',
    domicile: 'Germany',
    inception_date: '2020-01-15',
    aifm_name: 'Muster KVG GmbH',
    aifm_lei: '529900EXAMPLE000LEI00',
    reporting_obligation: 'Article 24(2)',
    base_currency: 'EUR',
  },
  investor_concentration: {
    total_investors: 12,
    by_type: [
      { investor_type: 'professional', count: 8, percentage_of_nav: 72.5 },
    ],
    by_domicile: [{ domicile: 'Germany', count: 10, percentage_of_nav: 85.0 }],
    beneficial_owners_concentration: { top_5_investors_pct: 45.2 },
  },
  principal_exposures: {
    total_aum_units: 10000,
    total_allocated_units: 8500,
    total_aum_eur: 150_000_000,
    total_nav_eur: 127_500_000,
    utilization_pct: 85.0,
    asset_breakdown: [
      {
        asset_name: 'Berlin Office Portfolio',
        asset_type: 'real_estate',
        units: 5000,
        value_eur: 75_000_000,
        percentage_of_total: 58.8,
      },
    ],
  },
  depositary: {
    name: 'CACEIS Bank',
    lei: '96950023O5B6JXLY0S86',
    jurisdiction: 'Germany',
    type: 'credit_institution',
  },
  sub_asset_type: 'OTHR_OTHR',
  leverage: {
    commitment_method: 1.2,
    gross_method: 1.4,
    commitment_limit: 2.0,
    gross_limit: 3.0,
    leverage_compliant: true,
  },
  risk_profile: {
    liquidity: {
      investor_redemption_frequency: 'Quarterly',
      portfolio_liquidity_profile: [],
      liquidity_management_tools: [],
    },
    operational: { total_open_risk_flags: 0, high_severity_flags: 0 },
  },
  geographic_focus: [{ region: 'Germany', percentage: 85.0 }],
  counterparty_risk: { top_5_counterparties: [], total_counterparty_count: 0 },
  compliance_status: {
    kyc_coverage_pct: 100,
    eligible_investor_pct: 100,
    recent_violations: 0,
    last_compliance_check: '2025-03-31T00:00:00Z',
  },
  generated_at: '2025-03-31T12:00:00Z',
  report_version: '1.0',
  disclaimer: 'For regulatory reporting purposes only.',
};

const xml = serializeAnnexIVToXml(report);
// → Valid ESMA AIFMD_DATAIF_V1.2.xsd Rev 6 schema-compliant XML.
// NCA submission (BaFin/CSSF/AMF/CNMV) is your responsibility — see the
// "What this library does NOT do" section above.
```

## API Reference

### Serializers

| Function                                  | Description                               |
| ----------------------------------------- | ----------------------------------------- |
| `serializeAnnexIVToXml(report)`           | Single fund → ESMA Annex IV XML string    |
| `serializeAggregateAnnexIVToXml(reports)` | Multiple funds → AIFM-level aggregate XML |

### Helpers

| Function                                            | Description                                            |
| --------------------------------------------------- | ------------------------------------------------------ |
| `isEEADomicile(domicile)`                           | Check if country name or ISO code is in the EEA        |
| `mapDomicileToMemberState(domicile)`                | Country name → ISO 3166-1 alpha-2 code                 |
| `toISOCountryCode(region)`                          | Region/country → ISO code (supports aggregate regions) |
| `mapToPredominantAIFType(legalForm, name?)`         | Legal form → ESMA PredominantAIFType code              |
| `mapAssetType(assetType)`                           | Asset type → ESMA SubAssetType code                    |
| `mapDepositaryType(type)`                           | Depositary type → ESMA code                            |
| `mapReportingObligationToFrequencyCode(obligation)` | Reporting obligation → frequency code                  |
| `escapeXml(str)`                                    | XML-safe string escaping                               |
| `tag(name, value, attrs?)`                          | XML element builder                                    |

### Types

```typescript
import type {
  AnnexIVReport,
  LiquidityManagementTool,
  LiquidityBucket,
  GeographicExposure,
  CounterpartyExposure,
} from 'open-annex-iv';
```

## XSD Validation

The XML output is validated against the official ESMA schemas included in `schema/`:

- `AIFMD_DATAIF_V1.2.xsd` — AIF-level reporting
- `AIFMD_DATMAN_V1.2.xsd` — AIFM-level reporting
- `AIFMD_REPORTING_DataTypes_V1.2.xsd` — Shared data types

All 104 tests pass — including 2 dedicated XSD-validation tests that run the live ESMA schemas against generated XML fixtures.

```bash
npm test          # 97 serializer + 5 strict-validation tests
npm run test:xsd  # 2 dedicated XSD validation tests
```

## ESMA Alignment

The XML output follows the ESMA AIFMD Reporting Technical Standards structure:

```
AIFReportingInfo → AIFMRecordInfo → AIFRecordInfo → sections
```

Covers: AIF Identification, Investor Concentration, Principal Exposures, Leverage, Liquidity Risk, Counterparty Risk, Geographic Focus. Depositary identification is read from the input type but is not emitted into Annex IV XML — the AIFMD DATAIF V1.2 schema does not include a depositary element at the AIF level; depositary data is reported via DATMAN (AIFM-level) or through national wrappers.

## Contributing

Contributions welcome. Please open an issue first to discuss what you'd like to change.

```bash
git clone https://github.com/julianlaycock/open-annex-iv.git
cd open-annex-iv
npm install
npm test
```

## License

[Apache 2.0](./LICENSE)

---

Built by [Caelith](https://caelith.tech) — Agentic Compliance Infrastructure for European alternative investment fund managers.

`open-annex-iv` is the serialization core that Caelith uses internally. We open-sourced it under Apache-2.0 because every AIFM in Europe needs to generate this XML, and there were zero open-source tools to do it. If you need the full filing platform (NCA submission, four-eyes approval, audit trail, cross-jurisdiction orchestration), Caelith ships that. If you just need the serializer, this library is enough.
