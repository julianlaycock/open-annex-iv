/**
 * Comprehensive tests for helper modules.
 */

import {
  isEEADomicile,
  mapDomicileToMemberState,
  toISOCountryCode,
  mapToPredominantAIFType,
  mapAssetType,
  mapDepositaryType,
  mapReportingObligationToFrequencyCode,
  getTypePct,
  escapeXml,
  tag,
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

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

console.log('\n@open-annex-iv/core — Helper Tests\n');

// ── escapeXml ──

console.log('escapeXml');
test('escapes &', () => assertEqual(escapeXml('A & B'), 'A &amp; B', '&'));
test('escapes <', () => assertEqual(escapeXml('a < b'), 'a &lt; b', '<'));
test('escapes >', () => assertEqual(escapeXml('a > b'), 'a &gt; b', '>'));
test('escapes "', () => assertEqual(escapeXml('say "hi"'), 'say &quot;hi&quot;', '"'));
test("escapes '", () => assertEqual(escapeXml("it's"), 'it&apos;s', "'"));
test('handles empty string', () => assertEqual(escapeXml(''), '', 'empty'));
test('handles no special chars', () => assertEqual(escapeXml('hello world'), 'hello world', 'plain'));
test('escapes multiple special chars', () => assertEqual(escapeXml('<a & b>'), '&lt;a &amp; b&gt;', 'multi'));

// ── tag ──

console.log('tag');
test('creates simple element', () => assert(tag('Name', 'value').includes('<Name>value</Name>'), 'simple tag'));
test('escapes content', () => assert(tag('Name', 'A & B').includes('A &amp; B'), 'escaped content'));
test('handles empty value', () => assert(tag('Name', '').includes('<Name></Name>') || tag('Name', '').includes('<Name/>'), 'empty'));

// ── isEEADomicile ──

console.log('isEEADomicile');
const eeaCountries = ['Germany', 'France', 'Luxembourg', 'Ireland', 'Netherlands', 'Italy', 'Spain',
  'Belgium', 'Austria', 'Malta', 'Cyprus', 'Estonia', 'Portugal', 'Finland', 'Sweden',
  'Denmark', 'Lithuania', 'Latvia', 'Slovenia', 'Slovakia', 'Greece', 'Croatia',
  'Romania', 'Bulgaria', 'Czech Republic', 'Hungary', 'Poland',
  'Liechtenstein', 'Norway', 'Iceland'];
for (const c of eeaCountries) {
  test(`recognizes ${c}`, () => assert(isEEADomicile(c), `${c} should be EEA`));
}
const eeaCodes = ['DE', 'FR', 'LU', 'IE', 'NL', 'IT', 'ES', 'AT', 'MT', 'CY', 'NO', 'IS', 'LI'];
for (const c of eeaCodes) {
  test(`recognizes code ${c}`, () => assert(isEEADomicile(c), `${c} should be EEA`));
}
test('rejects USA', () => assert(!isEEADomicile('USA'), 'USA not EEA'));
test('rejects United Kingdom', () => assert(!isEEADomicile('United Kingdom'), 'UK not EEA'));
test('rejects Switzerland', () => assert(!isEEADomicile('Switzerland'), 'CH not EEA'));
test('rejects Cayman Islands', () => assert(!isEEADomicile('Cayman Islands'), 'KY not EEA'));
test('rejects empty string', () => assert(!isEEADomicile(''), 'empty not EEA'));

// ── mapDomicileToMemberState ──

console.log('mapDomicileToMemberState');
const domicileMap: Record<string, string> = {
  'Germany': 'DE', 'France': 'FR', 'Luxembourg': 'LU', 'Ireland': 'IE',
  'Netherlands': 'NL', 'Italy': 'IT', 'Spain': 'ES', 'Austria': 'AT',
  'Greece': 'GR', 'Czech Republic': 'CZ', 'Norway': 'NO', 'Iceland': 'IS',
};
for (const [name, code] of Object.entries(domicileMap)) {
  test(`maps ${name} to ${code}`, () => assertEqual(mapDomicileToMemberState(name), code, name));
}
test('falls back to first 2 chars for unknown', () => assertEqual(mapDomicileToMemberState('Xanadu'), 'XA', 'fallback'));

// ── toISOCountryCode ──

console.log('toISOCountryCode');
test('passes through DE', () => assertEqual(toISOCountryCode('DE'), 'DE', 'DE'));
test('passes through US', () => assertEqual(toISOCountryCode('US'), 'US', 'US'));
test('maps Germany', () => assertEqual(toISOCountryCode('Germany'), 'DE', 'Germany'));
test('maps United States', () => assertEqual(toISOCountryCode('United States'), 'US', 'US'));
test('maps United Kingdom', () => assertEqual(toISOCountryCode('United Kingdom'), 'GB', 'UK'));
test('maps Switzerland', () => assertEqual(toISOCountryCode('Switzerland'), 'CH', 'CH'));
test('maps Cayman Islands', () => assertEqual(toISOCountryCode('Cayman Islands'), 'KY', 'KY'));
test('maps Hong Kong', () => assertEqual(toISOCountryCode('Hong Kong'), 'HK', 'HK'));
test('maps Singapore', () => assertEqual(toISOCountryCode('Singapore'), 'SG', 'SG'));
test('maps Eurozone to XS', () => assertEqual(toISOCountryCode('Eurozone'), 'XS', 'Eurozone'));
test('maps Western Europe to XS', () => assertEqual(toISOCountryCode('Western Europe'), 'XS', 'Western Europe'));
test('maps Global to XS', () => assertEqual(toISOCountryCode('Global'), 'XS', 'Global'));
test('maps Deutschland to DE', () => assertEqual(toISOCountryCode('Deutschland'), 'DE', 'Deutschland'));
test('unknown region defaults to XS', () => assertEqual(toISOCountryCode('Atlantis'), 'XS', 'Atlantis'));

// ── mapToPredominantAIFType ──

console.log('mapToPredominantAIFType');
test('real estate from name (Immobilien)', () => assertEqual(mapToPredominantAIFType('Spezial_AIF', 'Immobilien Fonds I'), 'REST', 'Immobilien'));
test('real estate from name (Real Estate)', () => assertEqual(mapToPredominantAIFType('AIF', 'Real Estate Fund'), 'REST', 'Real Estate'));
test('real estate from name (REIT)', () => assertEqual(mapToPredominantAIFType('AIF', 'REIT Investment'), 'REST', 'REIT'));
test('real estate from name (Property)', () => assertEqual(mapToPredominantAIFType('AIF', 'Property Fund'), 'REST', 'Property'));
test('hedge fund', () => assertEqual(mapToPredominantAIFType('AIF', 'Hedge Fund Global'), 'HFND', 'Hedge'));
test('private equity', () => assertEqual(mapToPredominantAIFType('AIF', 'Private Equity Fund III'), 'PEQF', 'PE'));
test('fund of funds', () => assertEqual(mapToPredominantAIFType('AIF', 'Fund of Funds'), 'FOFS', 'FoF'));
test('fund of funds (Dachfonds)', () => assertEqual(mapToPredominantAIFType('AIF', 'Dachfonds Europa'), 'FOFS', 'Dachfonds'));
test('venture capital', () => assertEqual(mapToPredominantAIFType('AIF', 'Venture Capital Fund'), 'VCAP', 'VC'));
test('infrastructure', () => assertEqual(mapToPredominantAIFType('AIF', 'Infrastructure Fund'), 'INFR', 'Infra'));
test('infrastructure (Infrastruktur)', () => assertEqual(mapToPredominantAIFType('AIF', 'Infrastruktur Fonds'), 'INFR', 'Infrastruktur'));
test('commodity', () => assertEqual(mapToPredominantAIFType('AIF', 'Commodity Trading Fund'), 'COMF', 'Commodity'));
test('commodity (Rohstoff)', () => assertEqual(mapToPredominantAIFType('AIF', 'Rohstoff Fonds'), 'COMF', 'Rohstoff'));
test('defaults to OTHR', () => assertEqual(mapToPredominantAIFType('Spezial_AIF', 'Generic Fund'), 'OTHR', 'Other'));
test('no name defaults to OTHR', () => assertEqual(mapToPredominantAIFType('Spezial_AIF'), 'OTHR', 'No name'));

// ── mapAssetType ──

console.log('mapAssetType');
test('real estate', () => assertEqual(mapAssetType('real estate'), 'PHY_RES_RESD', 'real estate'));
test('property', () => assertEqual(mapAssetType('property'), 'PHY_RES_RESD', 'property'));
test('cash', () => assertEqual(mapAssetType('cash'), 'SEC_CSH_MMKT', 'cash'));
test('money market', () => assertEqual(mapAssetType('money market'), 'SEC_CSH_MMKT', 'money market'));
test('equity', () => assertEqual(mapAssetType('equity'), 'SEC_LEQ_IFIN', 'equity'));
test('shares', () => assertEqual(mapAssetType('share class A'), 'SEC_LEQ_IFIN', 'shares'));
test('bond', () => assertEqual(mapAssetType('bond'), 'SEC_CSH_BOND', 'bond'));
test('fixed income', () => assertEqual(mapAssetType('fixed income'), 'SEC_CSH_BOND', 'fixed'));
test('derivative', () => assertEqual(mapAssetType('derivative'), 'DER_EQD_SWPS', 'derivative'));
test('swap', () => assertEqual(mapAssetType('interest rate swap'), 'DER_EQD_SWPS', 'swap'));
test('fund', () => assertEqual(mapAssetType('fund'), 'SEC_LEQ_IFIN', 'fund'));
test('unknown defaults to NTA', () => assertEqual(mapAssetType('artwork'), 'NTA_NTA_NOTA', 'unknown'));
test('empty defaults to NTA', () => assertEqual(mapAssetType(''), 'NTA_NTA_NOTA', 'empty'));

// ── mapDepositaryType ──

console.log('mapDepositaryType');
test('credit institution', () => assertEqual(mapDepositaryType('credit_institution'), 'CDPS', 'credit'));
test('investment firm', () => assertEqual(mapDepositaryType('investment_firm'), 'INVF', 'investment'));
test('unknown defaults to OTHR', () => assertEqual(mapDepositaryType('national_bank'), 'OTHR', 'unknown'));
test('null defaults to OTHR', () => assertEqual(mapDepositaryType(null), 'OTHR', 'null'));
test('undefined defaults to OTHR', () => assertEqual(mapDepositaryType(undefined), 'OTHR', 'undefined'));

// ── mapReportingObligationToFrequencyCode ──

console.log('mapReportingObligationToFrequencyCode');
test('Article 24(1) → Y (yearly)', () => assertEqual(mapReportingObligationToFrequencyCode('Article 24(1)'), 'Y', '24(1)'));
test('Article 24(2) → H (half-yearly)', () => assertEqual(mapReportingObligationToFrequencyCode('Article 24(2)'), 'H', '24(2)'));
test('Article 24(4) → Q (quarterly)', () => assertEqual(mapReportingObligationToFrequencyCode('Article 24(4)'), 'Q', '24(4)'));
test('unknown defaults to Y', () => assertEqual(mapReportingObligationToFrequencyCode('unknown'), 'Y', 'unknown'));

// ── getTypePct ──

console.log('getTypePct');
const byType = [
  { investor_type: 'professional', percentage_of_nav: 68.5 },
  { investor_type: 'retail', percentage_of_nav: 14.5 },
];
test('finds professional', () => assertEqual(getTypePct(byType, 'professional'), 68.5, 'professional'));
test('finds retail', () => assertEqual(getTypePct(byType, 'retail'), 14.5, 'retail'));
test('returns 0 for missing type', () => assertEqual(getTypePct(byType, 'institutional'), 0, 'missing'));
test('returns 0 for empty array', () => assertEqual(getTypePct([], 'professional'), 0, 'empty'));

// Summary
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
