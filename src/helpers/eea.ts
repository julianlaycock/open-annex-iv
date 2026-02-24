/**
 * EEA (European Economic Area) domicile utilities for AIFMD reporting.
 */

const EEA_NAMES = [
  'Luxembourg', 'Ireland', 'Germany', 'France', 'Netherlands', 'Italy', 'Spain',
  'Belgium', 'Austria', 'Malta', 'Cyprus', 'Estonia', 'Portugal', 'Finland', 'Sweden',
  'Denmark', 'Lithuania', 'Latvia', 'Slovenia', 'Slovakia', 'Greece', 'Croatia',
  'Romania', 'Bulgaria', 'Czech Republic', 'Hungary', 'Poland',
  'Liechtenstein', 'Norway', 'Iceland',
];

const EEA_CODES = [
  'LU', 'IE', 'DE', 'FR', 'NL', 'IT', 'ES', 'BE', 'AT', 'MT', 'CY', 'EE',
  'PT', 'FI', 'SE', 'DK', 'LT', 'LV', 'SI', 'SK', 'GR', 'HR', 'RO', 'BG',
  'CZ', 'HU', 'PL', 'LI', 'NO', 'IS',
];

/** Map country name to ISO 3166-1 alpha-2 member state code. */
const DOMICILE_TO_MEMBER_STATE: Record<string, string> = {
  'Luxembourg': 'LU', 'Ireland': 'IE', 'Germany': 'DE', 'France': 'FR',
  'Netherlands': 'NL', 'Italy': 'IT', 'Spain': 'ES', 'Belgium': 'BE',
  'Austria': 'AT', 'Malta': 'MT', 'Cyprus': 'CY', 'Estonia': 'EE',
  'Portugal': 'PT', 'Finland': 'FI', 'Sweden': 'SE', 'Denmark': 'DK',
  'Lithuania': 'LT', 'Latvia': 'LV', 'Slovenia': 'SI', 'Slovakia': 'SK',
  'Greece': 'GR', 'Croatia': 'HR', 'Romania': 'RO', 'Bulgaria': 'BG',
  'Czech Republic': 'CZ', 'Hungary': 'HU', 'Poland': 'PL',
  'Liechtenstein': 'LI', 'Norway': 'NO', 'Iceland': 'IS',
};

/** Check whether a domicile (name or ISO code) is in the EEA. */
export function isEEADomicile(domicile: string): boolean {
  return EEA_NAMES.includes(domicile) || EEA_CODES.includes(domicile.toUpperCase());
}

/** Map a domicile name to an ESMA ReportingMemberState code. */
export function mapDomicileToMemberState(domicile: string): string {
  return DOMICILE_TO_MEMBER_STATE[domicile] || domicile.substring(0, 2).toUpperCase();
}

/**
 * Convert geographic region names to ISO 3166-1 alpha-2 codes for ESMA compliance.
 * Aggregate regions map to 'XS' (ESMA supranational code).
 */
export function toISOCountryCode(region: string): string {
  if (/^[A-Z]{2}$/.test(region)) return region;

  const regionAggregates: Record<string, string> = {
    'Eurozone (ex DE)': 'XS', 'Westeuropa (ex DE)': 'XS',
    'Nordamerika': 'US', 'Asien-Pazifik': 'XS', 'Benelux': 'XS',
    'Western Europe': 'XS', 'Southern Europe': 'XS', 'Central Europe': 'XS',
    'Northern Europe': 'XS', 'Eastern Europe': 'XS', 'Emerging Markets': 'XS',
    'Global': 'XS', 'Eurozone': 'XS', 'North America': 'US',
    'Asia-Pacific': 'XS', 'Asia Pacific': 'XS', 'Latin America': 'XS',
    'Middle East': 'XS', 'Sub-Saharan Africa': 'XS',
  };
  if (regionAggregates[region]) return regionAggregates[region];

  // Only use domicile mapper if it found a real match (not substring fallback)
  if (DOMICILE_TO_MEMBER_STATE[region]) return DOMICILE_TO_MEMBER_STATE[region];

  const extra: Record<string, string> = {
    'United States': 'US', 'USA': 'US', 'United Kingdom': 'GB', 'UK': 'GB',
    'Switzerland': 'CH', 'Japan': 'JP', 'China': 'CN', 'Singapore': 'SG',
    'Hong Kong': 'HK', 'Australia': 'AU', 'Canada': 'CA', 'Brazil': 'BR',
    'Cayman Islands': 'KY', 'British Virgin Islands': 'VG', 'Jersey': 'JE',
    'Guernsey': 'GG', 'Bermuda': 'BM', 'Mauritius': 'MU', 'Deutschland': 'DE',
  };
  return extra[region] || 'XS';
}
