/**
 * Basic tests for @open-annex-iv/core serializer.
 * No test framework — just console.assert.
 */

import {
  serializeAnnexIVToXml,
  serializeAggregateAnnexIVToXml,
  isEEADomicile,
  mapDomicileToMemberState,
  toISOCountryCode,
  mapToPredominantAIFType,
  mapAssetType,
  mapDepositaryType,
  escapeXml,
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

// ── Sample Report ──

const sampleReport: AnnexIVReport = {
  aif_identification: {
    reporting_period: { start: '2024-01-01', end: '2024-03-31' },
    aif_name: 'Test Immobilien Fonds I',
    aif_national_code: 'DE-TEST-001',
    aif_type: 'Spezial_AIF',
    domicile: 'Germany',
    inception_date: '2020-06-15',
    aifm_name: 'Test KVG GmbH',
    aifm_lei: '529900TESTLEI000001',
    reporting_obligation: 'Article 24(2)',
    base_currency: 'EUR',
  },
  investor_concentration: {
    total_investors: 25,
    by_type: [
      { investor_type: 'professional', count: 20, percentage_of_nav: 85.5 },
      { investor_type: 'retail', count: 5, percentage_of_nav: 14.5 },
    ],
    by_domicile: [
      { domicile: 'DE', count: 18, percentage_of_nav: 72 },
      { domicile: 'LU', count: 7, percentage_of_nav: 28 },
    ],
    beneficial_owners_concentration: { top_5_investors_pct: 62.3 },
  },
  principal_exposures: {
    total_aum_units: 100000,
    total_allocated_units: 85000,
    total_aum_eur: 250000000,
    total_nav_eur: 212500000,
    utilization_pct: 85,
    asset_breakdown: [
      { asset_name: 'Office Berlin', asset_type: 'real estate', units: 1, value_eur: 120000000, percentage_of_total: 56.5 },
      { asset_name: 'Residential Munich', asset_type: 'real estate', units: 1, value_eur: 80000000, percentage_of_total: 37.6 },
      { asset_name: 'Cash Reserve', asset_type: 'cash', units: 12500000, value_eur: 12500000, percentage_of_total: 5.9 },
    ],
  },
  depositary: { name: 'Deutsche Depositary AG', lei: '529900DEPOEXAMPLE01', jurisdiction: 'DE', type: 'credit_institution' },
  sub_asset_type: 'PHY_RES_RESD',
  leverage: {
    commitment_method: 1.2,
    gross_method: 1.5,
    commitment_limit: 2.0,
    gross_limit: 3.0,
    leverage_compliant: true,
  },
  risk_profile: {
    liquidity: {
      investor_redemption_frequency: 'Quarterly',
      portfolio_liquidity_profile: [
        { bucket: '31-90d', pct: 5.9 },
        { bucket: '>365d', pct: 94.1 },
      ],
      liquidity_management_tools: [
        { type: 'notice_period', description: '90 days notice', active: true },
      ],
    },
    operational: { total_open_risk_flags: 2, high_severity_flags: 0 },
  },
  geographic_focus: [
    { region: 'Germany', pct: 85 },
    { region: 'Eurozone (ex DE)', pct: 15 },
  ],
  counterparty_risk: {
    top_5_counterparties: [
      { name: 'Deutsche Bank AG', lei: '7LTWFZYICNSX8D621K86', exposure_pct: 12.5 },
    ],
    total_counterparty_count: 3,
  },
  compliance_status: {
    kyc_coverage_pct: 96,
    eligible_investor_pct: 100,
    recent_violations: 0,
    last_compliance_check: '2024-03-31T12:00:00Z',
  },
  generated_at: '2024-03-31T14:00:00Z',
  report_version: '1.0',
  disclaimer: 'Test disclaimer text.',
};

// ── Tests ──

console.log('\n@open-annex-iv/core — Test Suite\n');

console.log('Helper: escapeXml');
test('escapes ampersands and angle brackets', () => {
  assert(escapeXml('A & B <C>') === 'A &amp; B &lt;C&gt;', 'escapeXml failed');
});

console.log('Helper: isEEADomicile');
test('recognizes Germany', () => assert(isEEADomicile('Germany'), 'Germany should be EEA'));
test('recognizes DE code', () => assert(isEEADomicile('DE'), 'DE should be EEA'));
test('rejects USA', () => assert(!isEEADomicile('USA'), 'USA should not be EEA'));

console.log('Helper: mapDomicileToMemberState');
test('maps Luxembourg to LU', () => assert(mapDomicileToMemberState('Luxembourg') === 'LU', 'expected LU'));
test('falls back to substring', () => assert(mapDomicileToMemberState('ZZ-land') === 'ZZ', 'expected ZZ'));

console.log('Helper: toISOCountryCode');
test('maps aggregate regions', () => assert(toISOCountryCode('Eurozone (ex DE)') === 'XS', 'expected XS'));
test('passes through 2-letter codes', () => assert(toISOCountryCode('DE') === 'DE', 'expected DE'));
test('maps Cayman Islands', () => assert(toISOCountryCode('Cayman Islands') === 'KY', 'expected KY'));

console.log('Helper: mapToPredominantAIFType');
test('detects real estate from name', () => assert(mapToPredominantAIFType('Spezial_AIF', 'Immobilien Fonds') === 'REST', 'expected REST'));
test('defaults to OTHR', () => assert(mapToPredominantAIFType('Spezial_AIF', 'Generic Fund') === 'OTHR', 'expected OTHR'));

console.log('Helper: mapAssetType');
test('maps real estate', () => assert(mapAssetType('real estate') === 'PHY_RES_RESD', 'expected PHY_RES_RESD'));
test('maps cash', () => assert(mapAssetType('cash') === 'SEC_CSH_MMKT', 'expected SEC_CSH_MMKT'));

console.log('Helper: mapDepositaryType');
test('maps credit institution', () => assert(mapDepositaryType('credit_institution') === 'CDPS', 'expected CDPS'));

console.log('\nSerializer: serializeAnnexIVToXml');
const xml = serializeAnnexIVToXml(sampleReport);

test('produces XML declaration', () => assert(xml.startsWith('<?xml version="1.0"'), 'missing XML declaration'));
test('contains AIFReportingInfo root', () => assert(xml.includes('<AIFReportingInfo'), 'missing root element'));
test('contains ESMA namespace', () => assert(xml.includes('urn:esma:xsd:aifmd-reporting'), 'missing namespace'));
test('contains ReportingMemberState DE', () => assert(xml.includes('ReportingMemberState="DE"'), 'missing member state'));
test('contains fund name', () => assert(xml.includes('Test Immobilien Fonds I'), 'missing fund name'));
test('contains AIFM LEI', () => assert(xml.includes('529900TESTLEI000001'), 'missing AIFM LEI'));
test('contains PredominantAIFType REST', () => assert(xml.includes('<PredominantAIFType>REST</PredominantAIFType>'), 'expected REST type'));
test('contains NAV in EUR', () => assert(xml.includes('<NetAssetValue>212500000</NetAssetValue>'), 'missing NAV'));
test('contains depositary info', () => assert(xml.includes('<DepositaryName>Deutsche Depositary AG</DepositaryName>'), 'missing depositary'));
test('contains leverage info', () => assert(xml.includes('<GrossMethodRate>1.5</GrossMethodRate>'), 'missing leverage'));
test('contains liquidity bucket', () => assert(xml.includes('<BucketPeriod>&gt;365d</BucketPeriod>'), 'missing liquidity bucket'));
test('contains counterparty', () => assert(xml.includes('Deutsche Bank AG'), 'missing counterparty'));
test('contains reporting period Q1', () => assert(xml.includes('<ReportingPeriodType>Q1</ReportingPeriodType>'), 'expected Q1'));
test('closes AIFReportingInfo', () => assert(xml.endsWith('</AIFReportingInfo>'), 'missing closing tag'));

console.log('\nSerializer: serializeAggregateAnnexIVToXml');
const aggXml = serializeAggregateAnnexIVToXml([sampleReport, sampleReport]);
test('produces valid aggregate XML', () => assert(aggXml.includes('<AIFReportingInfo'), 'missing root'));
test('contains fund records', () => assert(aggXml.includes('<AIFRecordInfo>') && aggXml.includes('AIFNationalCode'), 'missing fund records'));
test('empty input returns empty string', () => assert(serializeAggregateAnnexIVToXml([]) === '', 'should be empty'));

// Summary
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
