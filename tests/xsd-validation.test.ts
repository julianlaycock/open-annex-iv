/**
 * XSD Validation Test
 *
 * Validates the serializer output against ESMA's official AIFMD_DATAIF_V1.2.xsd schema.
 * This is a dev/test-only dependency — XSD validation as a feature stays proprietary.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { serializeAnnexIVToXml, type AnnexIVReport } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Dynamic import for libxmljs2 (native module)
let libxmljs: any;
try {
  libxmljs = await import('libxmljs2');
} catch (_e) {
  console.error('libxmljs2 not available, skipping XSD validation tests');
  console.log('Install with: npm install --save-dev libxmljs2');
  process.exit(0);
}

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
      {
        asset_name: 'Office Berlin',
        asset_type: 'real estate',
        units: 1,
        value_eur: 120000000,
        percentage_of_total: 56.5,
      },
      {
        asset_name: 'Residential Munich',
        asset_type: 'real estate',
        units: 1,
        value_eur: 80000000,
        percentage_of_total: 37.6,
      },
      {
        asset_name: 'Cash Reserve',
        asset_type: 'cash',
        units: 12500000,
        value_eur: 12500000,
        percentage_of_total: 5.9,
      },
    ],
  },
  depositary: {
    name: 'Deutsche Depositary AG',
    lei: '529900DEPOEXAMPLE01',
    jurisdiction: 'DE',
    type: 'credit_institution',
  },
  sub_asset_type: 'PHY_RES_RESL',
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
      {
        name: 'Deutsche Bank AG',
        lei: '7LTWFZYICNSX8D621K86',
        exposure_pct: 12.5,
      },
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

console.log('\n@open-annex-iv/core — XSD Validation Tests\n');

// Load XSD - need to set baseUrl so xs:include can resolve the DataTypes XSD
const schemaDir = resolve(__dirname, '..', 'schema');
const schemaPath = resolve(schemaDir, 'AIFMD_DATAIF_V1.2.xsd');
const schemaXml = readFileSync(schemaPath, 'utf-8');
const xsdDoc = libxmljs.parseXml(schemaXml, { baseUrl: schemaDir + '/' });

// Generate XML
const xml = serializeAnnexIVToXml(sampleReport);

console.log('Generated XML (first 200 chars):');
console.log(xml.substring(0, 200) + '...\n');

test('XML is well-formed', () => {
  try {
    libxmljs.parseXml(xml);
  } catch (e: any) {
    throw new Error(`XML parse error: ${e.message}`);
  }
});

test('XML validates against AIFMD_DATAIF_V1.2.xsd', () => {
  const xmlDoc = libxmljs.parseXml(xml);
  const isValid = xmlDoc.validate(xsdDoc);
  if (!isValid) {
    const errors = xmlDoc.validationErrors;
    console.error('\n  Validation errors:');
    for (const err of errors) {
      console.error(`    Line ${err.line}: ${err.message.trim()}`);
    }
    throw new Error(`XSD validation failed with ${errors.length} error(s)`);
  }
});

// Summary
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
