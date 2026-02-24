# open-annex-iv

Open-source toolkit for generating **AIFMD Annex IV XML reports** — the regulatory filing every EU alternative investment fund manager (AIFM) must submit to their national competent authority (NCA) under [Article 24 of the AIFMD](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32011L0061).

**Zero dependencies. Pure functions. TypeScript-first.**

## Why this exists

Every AIFM in Europe must file Annex IV reports — quarterly or annually — to regulators like BaFin (DE), CSSF (LU), AMF (FR), or CNMV (ES). The XML format follows ESMA's technical standards ([ESMA/2013/1358](https://www.esma.europa.eu/document/aifmd-reporting-it-technical-guidance-rev-4)), but there are **zero open-source tools** to generate it. Fund managers either pay €15-50K/yr for enterprise software or build fragile Excel-to-XML pipelines in-house.

This library changes that.

## Features

- **XML Serialization** — Convert a plain `AnnexIVReport` object to ESMA-compliant Annex IV XML
- **Aggregate Reports** — Generate AIFM-level XML covering multiple funds
- **ESMA Code Mappings** — Automated mapping of fund types, asset classes, depositary types to ESMA codes
- **EEA Helpers** — Country name/code validation, domicile-to-member-state mapping
- **Reporting Obligation Detection** — Automatic Article 24(1)/24(2)/24(4) classification based on AUM thresholds
- **Pure Functions** — No database, no framework, no side effects. Bring your own data.

## Installation

```bash
npm install @open-annex-iv/core
```

## Quick Start

```typescript
import { serializeAnnexIVToXml, type AnnexIVReport } from '@open-annex-iv/core';

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
    by_type: [{ investor_type: 'professional', count: 8, percentage_of_nav: 72.5 }],
    by_domicile: [{ domicile: 'Germany', count: 10, percentage_of_nav: 85.0 }],
    beneficial_owners_concentration: { top_5_investors_pct: 45.2 },
  },
  principal_exposures: {
    total_aum_units: 10000,
    total_allocated_units: 8500,
    total_aum_eur: 150_000_000,
    total_nav_eur: 127_500_000,
    utilization_pct: 85.0,
    asset_breakdown: [{
      asset_name: 'Berlin Office Portfolio',
      asset_type: 'real_estate',
      units: 5000,
      value_eur: 75_000_000,
      percentage_of_total: 58.8,
    }],
  },
  depositary: { name: 'CACEIS Bank', lei: '96950023O5B6JXLY0S86', jurisdiction: 'Germany', type: 'credit_institution' },
  sub_asset_type: 'OTHR_OTHR',
  leverage: { commitment_method: 1.2, gross_method: 1.4, commitment_limit: 2.0, gross_limit: 3.0, leverage_compliant: true },
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
  compliance_status: { kyc_coverage_pct: 100, eligible_investor_pct: 100, recent_violations: 0, last_compliance_check: '2025-03-31T00:00:00Z' },
  generated_at: '2025-03-31T12:00:00Z',
  report_version: '1.0',
  disclaimer: 'For regulatory reporting purposes only.',
};

const xml = serializeAnnexIVToXml(report);
// → Valid ESMA Annex IV XML ready for NCA submission
```

## API Reference

### Serializers

| Function | Description |
|---|---|
| `serializeAnnexIVToXml(report)` | Single fund → ESMA Annex IV XML string |
| `serializeAggregateAnnexIVToXml(reports)` | Multiple funds → AIFM-level aggregate XML |

### Helpers

| Function | Description |
|---|---|
| `isEEADomicile(domicile)` | Check if country name or ISO code is in the EEA |
| `mapDomicileToMemberState(domicile)` | Country name → ISO 3166-1 alpha-2 code |
| `toISOCountryCode(region)` | Region/country → ISO code (supports aggregate regions) |
| `mapToPredominantAIFType(legalForm, name?)` | Legal form → ESMA PredominantAIFType code |
| `mapAssetType(assetType)` | Asset type → ESMA SubAssetType code |
| `mapDepositaryType(type)` | Depositary type → ESMA code |
| `escapeXml(str)` | XML-safe string escaping |
| `tag(name, value, attrs?)` | XML element builder |

### Types

All TypeScript types are exported:

```typescript
import type {
  AnnexIVReport,
  LiquidityManagementTool,
  LiquidityBucket,
  GeographicExposure,
  CounterpartyExposure,
} from '@open-annex-iv/core';
```

## ESMA Alignment

The XML output follows the ESMA AIFMD Reporting Technical Standards structure:

```
AIFReportingInfo → AIFMRecordInfo → AIFRecordInfo → sections
```

Covers: AIF Identification, Investor Concentration, Principal Exposures, Leverage, Liquidity Risk, Counterparty Risk, Geographic Focus, Depositary Information.

## Roadmap

- [ ] XSD validation against ESMA schema (rev 6)
- [ ] CLI tool for file-based report generation
- [ ] AIFMD II (Directive 2024/927) field extensions
- [ ] Python bindings
- [ ] NCA submission format variants (BaFin, CSSF, AMF)

## Contributing

Contributions welcome. Please open an issue first to discuss what you'd like to change.

```bash
git clone https://github.com/caelith-tech/open-annex-iv.git
cd open-annex-iv
npm install
npm test
```

## License

[Apache 2.0](./LICENSE)

## About

Built by [Caelith Technologies](https://www.caelith.tech) — compliance infrastructure for EU fund managers.
