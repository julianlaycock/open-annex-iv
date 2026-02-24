/**
 * Edge case tests for serializer — minimal inputs, missing fields, boundary values.
 */

import {
  serializeAnnexIVToXml,
  serializeAggregateAnnexIVToXml,
  type AnnexIVReport,
} from '../src/index.js';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${(e as Error).message}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

// Minimal valid report
function minimalReport(overrides?: Partial<AnnexIVReport>): AnnexIVReport {
  return {
    aif_identification: {
      reporting_period: { start: '2025-01-01', end: '2025-12-31' },
      aif_name: 'Minimal Fund',
      aif_national_code: 'DE-MIN-001',
      aif_type: 'AIF',
      domicile: 'Germany',
      inception_date: null,
      aifm_name: null,
      aifm_lei: null,
      reporting_obligation: 'Article 24(1)',
      base_currency: 'EUR',
    },
    investor_concentration: {
      total_investors: 0,
      by_type: [],
      by_domicile: [],
      beneficial_owners_concentration: { top_5_investors_pct: 0 },
    },
    principal_exposures: {
      total_aum_units: 0,
      total_allocated_units: 0,
      total_aum_eur: 0,
      total_nav_eur: 0,
      utilization_pct: 0,
      asset_breakdown: [],
    },
    depositary: { name: null, lei: null, jurisdiction: null, type: null },
    sub_asset_type: 'OTHR_OTHR',
    leverage: {
      commitment_method: null,
      gross_method: null,
      commitment_limit: null,
      gross_limit: null,
      leverage_compliant: true,
    },
    risk_profile: {
      liquidity: {
        investor_redemption_frequency: 'None',
        portfolio_liquidity_profile: [],
        liquidity_management_tools: [],
      },
      operational: { total_open_risk_flags: 0, high_severity_flags: 0 },
    },
    geographic_focus: [],
    counterparty_risk: { top_5_counterparties: [], total_counterparty_count: 0 },
    compliance_status: {
      kyc_coverage_pct: 0,
      eligible_investor_pct: 0,
      recent_violations: 0,
      last_compliance_check: '2025-12-31T00:00:00Z',
    },
    generated_at: '2025-12-31T12:00:00Z',
    report_version: '1.0',
    disclaimer: '',
    ...overrides,
  };
}

console.log('\n@open-annex-iv/core — Edge Case Tests\n');

console.log('Minimal report');
test('serializes minimal report without error', () => {
  const xml = serializeAnnexIVToXml(minimalReport());
  assert(xml.length > 100, 'XML too short');
  assert(xml.startsWith('<?xml'), 'missing declaration');
  assert(xml.includes('Minimal Fund'), 'missing fund name');
});

test('handles null AIFM name/LEI', () => {
  const xml = serializeAnnexIVToXml(minimalReport());
  assert(xml.includes('PENDING'), 'should use PENDING for null LEI');
  assert(xml.includes('Not specified'), 'should use Not specified for null name');
});

test('handles null inception date', () => {
  const xml = serializeAnnexIVToXml(minimalReport());
  assert(!xml.includes('null'), 'should not contain literal null');
});

test('handles empty asset breakdown', () => {
  const xml = serializeAnnexIVToXml(minimalReport());
  assert(xml.includes('<NetAssetValue>0</NetAssetValue>'), 'should show 0 NAV');
});

test('handles empty geographic focus', () => {
  const xml = serializeAnnexIVToXml(minimalReport());
  // Should not crash with empty arrays
  assert(xml.includes('</AIFReportingInfo>'), 'should complete');
});

test('handles empty counterparties without crashing', () => {
  const xml = serializeAnnexIVToXml(minimalReport());
  assert(xml.includes('</AIFReportingInfo>'), 'should complete successfully');
});

console.log('Reporting periods');
test('Q1 detected correctly', () => {
  const r = minimalReport();
  r.aif_identification.reporting_period = { start: '2025-01-01', end: '2025-03-31' };
  const xml = serializeAnnexIVToXml(r);
  assert(xml.includes('<ReportingPeriodType>Q1</ReportingPeriodType>'), 'expected Q1');
});

test('Q2 detected correctly', () => {
  const r = minimalReport();
  r.aif_identification.reporting_period = { start: '2025-04-01', end: '2025-06-30' };
  const xml = serializeAnnexIVToXml(r);
  assert(xml.includes('<ReportingPeriodType>Q2</ReportingPeriodType>'), 'expected Q2');
});

test('Q3 detected correctly', () => {
  const r = minimalReport();
  r.aif_identification.reporting_period = { start: '2025-07-01', end: '2025-09-30' };
  const xml = serializeAnnexIVToXml(r);
  assert(xml.includes('<ReportingPeriodType>Q3</ReportingPeriodType>'), 'expected Q3');
});

test('Q4 detected correctly', () => {
  const r = minimalReport();
  r.aif_identification.reporting_period = { start: '2025-10-01', end: '2025-12-31' };
  const xml = serializeAnnexIVToXml(r);
  assert(xml.includes('<ReportingPeriodType>Q4</ReportingPeriodType>'), 'expected Q4');
});

test('year extracted from period end', () => {
  const r = minimalReport();
  r.aif_identification.reporting_period = { start: '2026-01-01', end: '2026-03-31' };
  const xml = serializeAnnexIVToXml(r);
  assert(xml.includes('<ReportingPeriodYear>2026</ReportingPeriodYear>'), 'expected 2026');
});

console.log('Reporting obligations');
test('Article 24(1) maps to Y frequency', () => {
  const r = minimalReport();
  r.aif_identification.reporting_obligation = 'Article 24(1)';
  const xml = serializeAnnexIVToXml(r);
  assert(xml.includes('FrequencyCode>Y<'), 'expected Y');
});

test('Article 24(2) maps to H frequency', () => {
  const r = minimalReport();
  r.aif_identification.reporting_obligation = 'Article 24(2)';
  const xml = serializeAnnexIVToXml(r);
  assert(xml.includes('FrequencyCode>H<'), 'expected H');
});

test('Article 24(4) maps to Q frequency', () => {
  const r = minimalReport();
  r.aif_identification.reporting_obligation = 'Article 24(4)';
  const xml = serializeAnnexIVToXml(r);
  assert(xml.includes('FrequencyCode>Q<'), 'expected Q');
});

console.log('Non-EEA domicile');
test('non-EEA fund sets AIFEEAFlag false', () => {
  const r = minimalReport();
  r.aif_identification.domicile = 'Cayman Islands';
  const xml = serializeAnnexIVToXml(r);
  assert(xml.includes('<AIFMEEAFlag>false</AIFMEEAFlag>'), 'expected false');
});

console.log('Special characters in fund names');
test('XML-escapes fund name with &', () => {
  const r = minimalReport();
  r.aif_identification.aif_name = 'Smith & Partners Fund <I>';
  const xml = serializeAnnexIVToXml(r);
  assert(xml.includes('Smith &amp; Partners Fund &lt;I&gt;'), 'should escape special chars');
});

test('XML-escapes AIFM name with quotes', () => {
  const r = minimalReport();
  r.aif_identification.aifm_name = 'Test "KVG" GmbH';
  const xml = serializeAnnexIVToXml(r);
  assert(xml.includes('Test &quot;KVG&quot; GmbH'), 'should escape quotes');
});

console.log('Large values');
test('handles large AUM (€10B)', () => {
  const r = minimalReport();
  r.principal_exposures.total_aum_eur = 10_000_000_000;
  r.principal_exposures.total_nav_eur = 8_500_000_000;
  const xml = serializeAnnexIVToXml(r);
  assert(xml.includes('<GrossAssetValue>10000000000</GrossAssetValue>'), 'should handle 10B');
});

console.log('Aggregate XML');
test('aggregate with single fund', () => {
  const xml = serializeAggregateAnnexIVToXml([minimalReport()]);
  assert(xml.includes('<AIFReportingInfo'), 'should have root');
  assert(xml.includes('Minimal Fund'), 'should have fund name');
});

test('aggregate with 3 funds', () => {
  const funds = [1, 2, 3].map(i => {
    const r = minimalReport();
    r.aif_identification.aif_name = `Fund ${i}`;
    return r;
  });
  const xml = serializeAggregateAnnexIVToXml(funds);
  assert(xml.includes('Fund 1'), 'should have Fund 1');
  assert(xml.includes('Fund 2'), 'should have Fund 2');
  assert(xml.includes('Fund 3'), 'should have Fund 3');
});

test('aggregate empty array returns empty', () => {
  const xml = serializeAggregateAnnexIVToXml([]);
  assert(xml === '', 'should be empty string');
});

// Summary
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
