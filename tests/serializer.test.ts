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
  isValidISO4217,
  isValidMIC,
  resolveMarketCode,
  normalizeLEI,
  isValidLEIFormat,
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
test('maps real estate', () => assert(mapAssetType('real estate') === 'PHY_RES_RESL', 'expected PHY_RES_RESL'));
test('maps cash', () => assert(mapAssetType('cash') === 'SEC_CSH_OTHC', 'expected SEC_CSH_OTHC'));

console.log('Helper: mapDepositaryType');
test('maps credit institution', () => assert(mapDepositaryType('credit_institution') === 'CDPS', 'expected CDPS'));

console.log('\nSerializer: serializeAnnexIVToXml');
const xml = serializeAnnexIVToXml(sampleReport);

test('produces XML declaration', () => assert(xml.startsWith('<?xml version="1.0"'), 'missing XML declaration'));
test('contains AIFReportingInfo root', () => assert(xml.includes('<AIFReportingInfo'), 'missing root element'));
test('uses noNamespaceSchemaLocation', () => assert(xml.includes('noNamespaceSchemaLocation'), 'should use noNamespaceSchemaLocation'));
test('contains Version attribute', () => assert(xml.includes('Version="1.2"'), 'missing Version'));
test('contains CreationDateAndTime attribute', () => assert(xml.includes('CreationDateAndTime='), 'missing CreationDateAndTime'));
test('contains ReportingMemberState DE', () => assert(xml.includes('ReportingMemberState="DE"'), 'missing member state'));
test('contains AIFRecordInfo (not AIFMRecordInfo)', () => assert(xml.includes('<AIFRecordInfo>') && !xml.includes('<AIFMRecordInfo>'), 'wrong record element'));
test('contains FilingType', () => assert(xml.includes('<FilingType>INIT</FilingType>'), 'missing FilingType'));
test('contains AIFContentType', () => assert(xml.includes('<AIFContentType>'), 'missing AIFContentType'));
test('contains fund name', () => assert(xml.includes('Test Immobilien Fonds I'), 'missing fund name'));
test('contains AIFM LEI as AIFMNationalCode', () => assert(xml.includes('529900TESTLEI000001'), 'missing AIFM LEI'));
test('contains PredominantAIFType REST', () => assert(xml.includes('<PredominantAIFType>REST</PredominantAIFType>'), 'expected REST type'));
test('contains AIFNetAssetValue', () => assert(xml.includes('<AIFNetAssetValue>212500000</AIFNetAssetValue>'), 'missing NAV'));
test('contains ShareClassFlag', () => assert(xml.includes('<ShareClassFlag>false</ShareClassFlag>'), 'missing ShareClassFlag'));
test('contains AIFMasterFeederStatus', () => assert(xml.includes('<AIFMasterFeederStatus>NONE</AIFMasterFeederStatus>'), 'missing master/feeder'));
test('contains MainInstrumentsTraded with 5 items', () => {
  const count = (xml.match(/<MainInstrumentTraded>/g) || []).length;
  assert(count === 5, `expected 5 MainInstrumentTraded, got ${count}`);
});
test('contains PrincipalExposures with 10 items', () => {
  const count = (xml.match(/<PrincipalExposure>/g) || []).length;
  assert(count === 10, `expected 10 PrincipalExposure, got ${count}`);
});
test('contains PortfolioConcentrations with 5 items', () => {
  const count = (xml.match(/<PortfolioConcentration>/g) || []).length;
  assert(count === 5, `expected 5 PortfolioConcentration, got ${count}`);
});
test('contains 3 AIFPrincipalMarkets', () => {
  const count = (xml.match(/<AIFPrincipalMarket>/g) || []).length;
  assert(count === 3, `expected 3 AIFPrincipalMarket, got ${count}`);
});
test('contains InvestorConcentration', () => assert(xml.includes('<InvestorConcentration>'), 'missing InvestorConcentration'));
test('contains NAVGeographicalFocus', () => assert(xml.includes('<NAVGeographicalFocus>'), 'missing NAVGeographicalFocus'));
test('contains leverage info', () => assert(xml.includes('<GrossMethodRate>'), 'missing leverage'));
test('contains LiquidityRiskProfile', () => assert(xml.includes('<LiquidityRiskProfile>'), 'missing liquidity'));
test('contains PortfolioLiquidityProfile', () => assert(xml.includes('<PortfolioLiquidityInDays365MoreRate>'), 'missing liquidity buckets'));
test('contains counterparty info', () => assert(xml.includes('Deutsche Bank AG'), 'missing counterparty'));
test('contains FundToCounterpartyExposures with 5 items', () => {
  const count = (xml.match(/<FundToCounterpartyExposure>/g) || []).length;
  assert(count === 5, `expected 5 FundToCounterpartyExposure, got ${count}`);
});
test('contains reporting period Q1', () => assert(xml.includes('<ReportingPeriodType>Q1</ReportingPeriodType>'), 'expected Q1'));
test('contains StressTests', () => assert(xml.includes('<StressTests>'), 'missing StressTests'));
test('contains AIFLeverageArticle24-2', () => assert(xml.includes('<AIFLeverageArticle24-2>'), 'missing leverage article'));
test('contains RealEstateFundInvestmentStrategies', () => assert(xml.includes('<RealEstateFundInvestmentStrategies>'), 'missing RE strategy'));
test('contains InvestorGroups', () => assert(xml.includes('<InvestorGroups>'), 'missing InvestorGroups'));
test('no custom namespace URI', () => assert(!xml.includes('urn:esma:xsd:aifmd-reporting'), 'should not have custom namespace'));
test('no CaelithComplianceExtension', () => assert(!xml.includes('CaelithComplianceExtension'), 'should not have Caelith extension'));
test('closes AIFReportingInfo', () => assert(xml.endsWith('</AIFReportingInfo>'), 'missing closing tag'));

console.log('\nSerializer: serializeAggregateAnnexIVToXml');
const aggXml = serializeAggregateAnnexIVToXml([sampleReport, sampleReport]);
test('produces valid aggregate XML', () => assert(aggXml.includes('<AIFReportingInfo'), 'missing root'));
test('contains multiple AIFRecordInfo', () => {
  const count = (aggXml.match(/<AIFRecordInfo>/g) || []).length;
  assert(count === 2, `expected 2 AIFRecordInfo, got ${count}`);
});
test('empty input returns empty string', () => assert(serializeAggregateAnnexIVToXml([]) === '', 'should be empty'));

// XSD Structural Tests
console.log('\nXSD Structure Compliance');
test('AIFRecordInfo sequence: FilingType before AIFContentType', () => {
  const filingIdx = xml.indexOf('<FilingType>');
  const contentIdx = xml.indexOf('<AIFContentType>');
  assert(filingIdx < contentIdx, 'FilingType must come before AIFContentType');
});
test('AIFRecordInfo sequence: ReportingPeriodStartDate before EndDate', () => {
  const startIdx = xml.indexOf('<ReportingPeriodStartDate>');
  const endIdx = xml.indexOf('<ReportingPeriodEndDate>');
  assert(startIdx < endIdx, 'StartDate must come before EndDate');
});
test('AIFPrincipalInfo before AIFIndividualInfo', () => {
  const principalIdx = xml.indexOf('<AIFPrincipalInfo>');
  const individualIdx = xml.indexOf('<AIFIndividualInfo>');
  assert(principalIdx < individualIdx, 'AIFPrincipalInfo must come before AIFIndividualInfo');
});
test('AIFIndividualInfo before AIFLeverageInfo', () => {
  const individualIdx = xml.indexOf('</AIFIndividualInfo>');
  const leverageIdx = xml.indexOf('<AIFLeverageInfo>');
  assert(individualIdx < leverageIdx, 'AIFIndividualInfo must come before AIFLeverageInfo');
});
test('valid SubAssetType codes used', () => {
  const validSubAssetTypes = [
    'SEC_CSH_CODP', 'SEC_CSH_COMP', 'SEC_CSH_OTHD', 'SEC_CSH_OTHC',
    'SEC_LEQ_IFIN', 'SEC_LEQ_OTHR', 'SEC_UEQ_UEQY',
    'SEC_CPN_INVG', 'SEC_CPN_NIVG', 'SEC_CPI_INVG', 'SEC_CPI_NIVG',
    'SEC_SBD_EUBY', 'SEC_SBD_EUBM', 'SEC_SBD_NOGY', 'SEC_SBD_NOGM',
    'SEC_SBD_EUGY', 'SEC_SBD_EUGM', 'SEC_MBN_MNPL',
    'SEC_CBN_INVG', 'SEC_CBN_NIVG', 'SEC_CBI_INVG', 'SEC_CBI_NIVG',
    'SEC_LON_LEVL', 'SEC_LON_OTHL',
    'SEC_SSP_SABS', 'SEC_SSP_RMBS', 'SEC_SSP_CMBS', 'SEC_SSP_AMBS',
    'SEC_SSP_ABCP', 'SEC_SSP_CDOC', 'SEC_SSP_STRC', 'SEC_SSP_SETP', 'SEC_SSP_OTHS',
    'DER_EQD_FINI', 'DER_EQD_OTHD', 'DER_FID_FIXI',
    'DER_CDS_SNFI', 'DER_CDS_SNSO', 'DER_CDS_SNOT', 'DER_CDS_INDX', 'DER_CDS_EXOT', 'DER_CDS_OTHR',
    'DER_FEX_INVT', 'DER_FEX_HEDG', 'DER_IRD_INTR',
    'DER_CTY_ECOL', 'DER_CTY_ENNG', 'DER_CTY_ENPW', 'DER_CTY_ENOT',
    'DER_CTY_PMGD', 'DER_CTY_PMOT', 'DER_CTY_OTIM', 'DER_CTY_OTLS', 'DER_CTY_OTAP', 'DER_CTY_OTHR',
    'DER_OTH_OTHR',
    'PHY_RES_RESL', 'PHY_RES_COML', 'PHY_RES_OTHR',
    'PHY_CTY_PCTY', 'PHY_TIM_PTIM', 'PHY_ART_PART', 'PHY_TPT_PTPT', 'PHY_OTH_OTHR',
    'CIU_OAM_MMFC', 'CIU_OAM_AETF', 'CIU_OAM_OTHR',
    'CIU_NAM_MMFC', 'CIU_NAM_AETF', 'CIU_NAM_OTHR',
    'OTH_OTH_OTHR', 'NTA_NTA_NOTA',
  ];
  const subAssetMatches = xml.match(/<SubAssetType>([^<]+)<\/SubAssetType>/g) || [];
  for (const match of subAssetMatches) {
    const value = match.replace(/<\/?SubAssetType>/g, '');
    assert(validSubAssetTypes.includes(value), `Invalid SubAssetType: ${value}`);
  }
});

// ── ISO 4217 Currency Validation ──

console.log('\nISO 4217: isValidISO4217');
test('accepts EUR', () => assert(isValidISO4217('EUR'), 'EUR should be valid'));
test('accepts USD', () => assert(isValidISO4217('USD'), 'USD should be valid'));
test('accepts GBP', () => assert(isValidISO4217('GBP'), 'GBP should be valid'));
test('accepts CHF', () => assert(isValidISO4217('CHF'), 'CHF should be valid'));
test('accepts JPY', () => assert(isValidISO4217('JPY'), 'JPY should be valid'));
test('accepts lowercase eur', () => assert(isValidISO4217('eur'), 'case-insensitive'));
test('rejects XYZ (not a real currency)', () => assert(!isValidISO4217('XYZ'), 'XYZ not a real currency'));
test('rejects AAA', () => assert(!isValidISO4217('AAA'), 'AAA not a real currency'));
test('rejects empty string', () => assert(!isValidISO4217(''), 'empty string invalid'));
test('rejects BTC (not ISO 4217)', () => assert(!isValidISO4217('BTC'), 'BTC not ISO 4217'));
test('accepts XAU (gold)', () => assert(isValidISO4217('XAU'), 'XAU is ISO 4217 for gold'));
test('accepts KYD (Cayman Dollar)', () => assert(isValidISO4217('KYD'), 'KYD valid for fund jurisdictions'));

// ── ISO 10383 MIC Validation ──

console.log('\nISO 10383: isValidMIC');
test('accepts XETR (Xetra)', () => assert(isValidMIC('XETR'), 'XETR should be valid'));
test('accepts XFRA (Frankfurt)', () => assert(isValidMIC('XFRA'), 'XFRA should be valid'));
test('accepts XLON (London)', () => assert(isValidMIC('XLON'), 'XLON should be valid'));
test('accepts XXX (ESMA special code)', () => assert(isValidMIC('XXX'), 'XXX is ESMA special'));
test('accepts OTC', () => assert(isValidMIC('OTC'), 'OTC is ESMA special'));
test('accepts NOT', () => assert(isValidMIC('NOT'), 'NOT is ESMA special'));
test('accepts lowercase xetr', () => assert(isValidMIC('xetr'), 'case-insensitive'));
test('rejects ZZZZ', () => assert(!isValidMIC('ZZZZ'), 'ZZZZ not a valid MIC'));
test('rejects empty', () => assert(!isValidMIC(''), 'empty invalid'));

// ── resolveMarketCode ──

console.log('\nISO 10383: resolveMarketCode');
test('resolves XETR to MIC type with code', () => {
  const r = resolveMarketCode('XETR');
  assert(r.marketCodeType === 'MIC', 'type should be MIC');
  assert(r.marketCode === 'XETR', 'code should be XETR');
});
test('resolves XXX to XXX type without code', () => {
  const r = resolveMarketCode('XXX');
  assert(r.marketCodeType === 'XXX', 'type should be XXX');
  assert(!r.marketCode, 'no code for XXX');
});
test('resolves OTC to OTC type', () => {
  const r = resolveMarketCode('OTC');
  assert(r.marketCodeType === 'OTC', 'type should be OTC');
});
test('resolves null with isOtc=true to OTC', () => {
  const r = resolveMarketCode(null, true);
  assert(r.marketCodeType === 'OTC', 'should fall back to OTC');
});
test('resolves null/false to XXX', () => {
  const r = resolveMarketCode(null, false);
  assert(r.marketCodeType === 'XXX', 'should default to XXX');
});
test('resolves unknown MIC to XXX', () => {
  const r = resolveMarketCode('ZZZZ');
  assert(r.marketCodeType === 'XXX', 'unknown MIC should become XXX');
});

// ── ISO 17442 LEI Normalization ──

console.log('\nISO 17442: normalizeLEI / isValidLEIFormat');
test('normalizes lowercase to uppercase', () => {
  assert(normalizeLEI('549300dkbynoi0b1np44') === '549300DKBYNOI0B1NP44', 'should uppercase');
});
test('trims whitespace', () => {
  assert(normalizeLEI('  549300DKBYNOI0B1NP44  ') === '549300DKBYNOI0B1NP44', 'should trim');
});
test('returns null for null/undefined', () => {
  assert(normalizeLEI(null) === null, 'null in, null out');
  assert(normalizeLEI(undefined) === null, 'undefined in, null out');
});
test('isValidLEIFormat accepts valid LEI', () => {
  assert(isValidLEIFormat('549300DKBYNOI0B1NP44'), 'valid format');
});
test('isValidLEIFormat rejects lowercase', () => {
  assert(!isValidLEIFormat('549300dkbynoi0b1np44'), 'lowercase should fail');
});
test('isValidLEIFormat rejects wrong length', () => {
  assert(!isValidLEIFormat('549300DKBYNOI0B1NP4'), '19 chars should fail');
});

// ── Serializer: MIC codes in XML output ──

console.log('\nSerializer: MIC codes in XML');
const reportWithMICs: AnnexIVReport = {
  ...sampleReport,
  principal_exposures: {
    ...sampleReport.principal_exposures,
    asset_breakdown: [
      { asset_name: 'Office Berlin', asset_type: 'real estate', units: 1, value_eur: 120000000, percentage_of_total: 56.5, market: { mic: 'XETR' } },
      { asset_name: 'Residential Munich', asset_type: 'real estate', units: 1, value_eur: 80000000, percentage_of_total: 37.6, market: { is_otc: true } },
      { asset_name: 'Cash Reserve', asset_type: 'cash', units: 12500000, value_eur: 12500000, percentage_of_total: 5.9 },
    ],
  },
  principal_markets: [
    { mic: 'XETR', aggregated_value_eur: 120000000 },
    { mic: 'OTC', aggregated_value_eur: 80000000 },
  ],
};
const xmlWithMICs = serializeAnnexIVToXml(reportWithMICs);

test('contains MarketCodeType MIC for exchange-traded assets', () => {
  assert(xmlWithMICs.includes('<MarketCodeType>MIC</MarketCodeType>'), 'should have MIC type');
});
test('contains MarketCode XETR', () => {
  assert(xmlWithMICs.includes('<MarketCode>XETR</MarketCode>'), 'should have XETR code');
});
test('contains MarketCodeType OTC for OTC assets', () => {
  assert(xmlWithMICs.includes('<MarketCodeType>OTC</MarketCodeType>'), 'should have OTC type');
});
test('still contains MarketCodeType XXX for assets without market data', () => {
  assert(xmlWithMICs.includes('<MarketCodeType>XXX</MarketCodeType>'), 'cash has no market');
});
test('principal markets use actual MIC codes', () => {
  // Should have MIC type in AIFPrincipalMarkets section
  const principalMarketsSection = xmlWithMICs.substring(
    xmlWithMICs.indexOf('<AIFPrincipalMarkets>'),
    xmlWithMICs.indexOf('</AIFPrincipalMarkets>')
  );
  assert(principalMarketsSection.includes('<MarketCode>XETR</MarketCode>'), 'principal market should use XETR');
});

// ── Serializer: LEI normalization ──

console.log('\nSerializer: LEI normalization');
const reportWithLowerLEI: AnnexIVReport = {
  ...sampleReport,
  aif_identification: {
    ...sampleReport.aif_identification,
    aifm_lei: '529900testlei000001', // lowercase
  },
};
const xmlWithNormalizedLEI = serializeAnnexIVToXml(reportWithLowerLEI);
test('normalizes lowercase LEI to uppercase in XML', () => {
  assert(xmlWithNormalizedLEI.includes('529900TESTLEI000001'), 'LEI should be uppercase in XML');
  assert(!xmlWithNormalizedLEI.includes('529900testlei000001'), 'lowercase LEI should not appear');
});

// ── Serializer: Currency validation ──

console.log('\nSerializer: currency validation');
test('throws on invalid currency code', () => {
  const reportWithBadCurrency: AnnexIVReport = {
    ...sampleReport,
    aif_identification: {
      ...sampleReport.aif_identification,
      base_currency: 'XYZ',
    },
  };
  let threw = false;
  try {
    serializeAnnexIVToXml(reportWithBadCurrency);
  } catch (e) {
    threw = true;
    assert((e as Error).message.includes('ISO 4217'), 'error should mention ISO 4217');
  }
  assert(threw, 'should throw for invalid currency');
});
test('accepts valid non-EUR currency (USD)', () => {
  const reportWithUSD: AnnexIVReport = {
    ...sampleReport,
    aif_identification: {
      ...sampleReport.aif_identification,
      base_currency: 'USD',
    },
  };
  const usdXml = serializeAnnexIVToXml(reportWithUSD);
  assert(usdXml.includes('<BaseCurrency>USD</BaseCurrency>'), 'should contain USD');
  assert(usdXml.includes('<FXEURReferenceRateType>ECB</FXEURReferenceRateType>'), 'non-EUR should have FX rate');
});

// Summary
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
