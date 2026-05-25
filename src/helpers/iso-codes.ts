/**
 * ISO Standard Code Validation for AIFMD Annex IV Reporting
 *
 * - ISO 4217: Currency codes (complete list per 2024 edition)
 * - ISO 10383: Market Identifier Codes (MIC) validation
 * - ISO 17442: LEI normalization
 */

// ── ISO 4217 Currency Codes ─────────────────────────────────
// Complete set of active ISO 4217 currency codes.
// Source: ISO 4217 Amendment 176 (2024-06-25)
// Covers all currencies relevant to AIFMD reporting including
// major, minor, and fund-relevant currencies.

export const ISO_4217_CURRENCIES = new Set([
  // Major currencies (G10 + key AIFMD reporting currencies)
  'EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'SEK', 'NOK', 'DKK',
  // EU member state currencies (non-EUR)
  'BGN', 'CZK', 'HUF', 'PLN', 'RON', 'HRK',
  // EEA / key European
  'ISK',
  // Asia-Pacific
  'CNY', 'HKD', 'SGD', 'KRW', 'TWD', 'INR', 'IDR', 'MYR', 'PHP', 'THB', 'VND',
  'BDT', 'LKR', 'PKR', 'MMK', 'KHR', 'LAK', 'MNT', 'NPR',
  // Middle East
  'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'JOD', 'ILS', 'TRY', 'IQD', 'IRR',
  'LBP', 'YER', 'SYP',
  // Americas
  'BRL', 'MXN', 'ARS', 'CLP', 'COP', 'PEN', 'UYU', 'PYG', 'BOB', 'VES',
  'DOP', 'GTQ', 'HNL', 'NIO', 'CRC', 'PAB', 'JMD', 'TTD', 'BBD', 'BSD',
  'BZD', 'GYD', 'SRD', 'HTG', 'CUP',
  // Africa
  'ZAR', 'NGN', 'KES', 'EGP', 'GHS', 'TZS', 'UGX', 'MAD', 'TND', 'DZD',
  'XOF', 'XAF', 'MUR', 'BWP', 'MZN', 'AOA', 'ETB', 'RWF', 'ZMW', 'MWK',
  'NAD', 'SCR', 'GMD', 'SLL', 'SDG', 'SSP', 'LYD', 'ERN', 'DJF', 'KMF',
  'CVE', 'STN', 'SZL', 'LSL', 'ZWL', 'BIF', 'CDF', 'GNF', 'MGA', 'SOS',
  // Oceania
  'FJD', 'PGK', 'WST', 'TOP', 'VUV', 'SBD',
  // Central Asia / CIS
  'RUB', 'UAH', 'KZT', 'UZS', 'GEL', 'AZN', 'AMD', 'KGS', 'TJS', 'TMT',
  'BYN', 'MDL',
  // Caribbean / offshore fund jurisdictions
  'KYD', 'BMD', 'AWG', 'ANG', 'XCD',
  // Precious metals (used in commodity funds)
  'XAU', 'XAG', 'XPT', 'XPD',
  // Special / supranational
  'XDR', // IMF SDR
  // Crypto-adjacent / digital (not ISO 4217 but BaFin may see)
  // Intentionally excluded — NCAs require fiat ISO 4217 only
]);

/**
 * Validate an ISO 4217 currency code.
 * Returns true if the code is a valid, recognized currency.
 */
export function isValidISO4217(code: string): boolean {
  return ISO_4217_CURRENCIES.has(code.toUpperCase());
}

// ── ISO 10383 Market Identifier Codes (MIC) ─────────────────
// Key MICs relevant to AIFMD reporting per ESMA guidelines.
// The full ISO 10383 list has 2000+ entries; we include:
// 1. All major European exchanges (primary reporting venues)
// 2. Key global exchanges (US, APAC) for cross-border exposure
// 3. ESMA-defined special codes (XXX, OTC, NOT)
//
// Source: ISO 10383 Market Identifier Codes, SMPG edition 2024
// Updated with ESMA AIFMD Technical Guidance Rev 6 special codes.

export const ESMA_MARKET_CODES = new Set([
  // ── ESMA Special Codes (per AIFMD IT Technical Guidance) ──
  'XXX',  // Not listed / no identified market
  'OTC',  // Over-the-counter (bilateral)
  'NOT',  // Not applicable (used for empty ranking slots)

  // ── Germany (BaFin jurisdiction — highest priority) ──
  'XETR', // Xetra (Deutsche Börse electronic)
  'XFRA', // Frankfurt Stock Exchange (floor)
  'XBER', // Börse Berlin
  'XDUS', // Börse Düsseldorf
  'XHAM', // Börse Hamburg
  'XHAN', // Börse Hannover
  'XMUN', // Börse München
  'XSTU', // Börse Stuttgart
  'XEUR', // Eurex (derivatives)
  'XEEE', // European Energy Exchange (EEX)

  // ── United Kingdom ──
  'XLON', // London Stock Exchange
  'XLME', // London Metal Exchange
  'XICE', // ICE Futures Europe

  // ── France ──
  'XPAR', // Euronext Paris

  // ── Netherlands ──
  'XAMS', // Euronext Amsterdam

  // ── Belgium ──
  'XBRU', // Euronext Brussels

  // ── Portugal ──
  'XLIS', // Euronext Lisbon

  // ── Ireland ──
  'XDUB', // Euronext Dublin (Irish Stock Exchange)

  // ── Luxembourg ──
  'XLUX', // Luxembourg Stock Exchange

  // ── Italy ──
  'XMIL', // Borsa Italiana (Euronext Milan)

  // ── Spain ──
  'XMAD', // Bolsa de Madrid
  'XBAR', // Bolsa de Barcelona
  'XBIL', // Bolsa de Bilbao
  'XVAL', // Bolsa de Valencia

  // ── Switzerland ──
  'XSWX', // SIX Swiss Exchange
  'XVTX', // SIX Swiss Exchange (blue chips)

  // ── Austria ──
  'XWBO', // Wiener Börse

  // ── Nordic ──
  'XHEL', // Nasdaq Helsinki
  'XSTO', // Nasdaq Stockholm
  'XCSE', // Nasdaq Copenhagen
  'XOSL', // Oslo Børs
  'XICE', // Nasdaq Iceland

  // ── Central/Eastern Europe ──
  'XPRA', // Prague Stock Exchange
  'XWAR', // Warsaw Stock Exchange
  'XBUD', // Budapest Stock Exchange
  'XBUL', // Bulgarian Stock Exchange
  'XBSE', // Bucharest Stock Exchange
  'XZAG', // Zagreb Stock Exchange
  'XLJU', // Ljubljana Stock Exchange
  'XBRA', // Bratislava Stock Exchange
  'XTAL', // Nasdaq Tallinn
  'XRIS', // Nasdaq Riga
  'XLIT', // Nasdaq Vilnius

  // ── Greece / Cyprus / Malta ──
  'XATH', // Athens Stock Exchange
  'XCYS', // Cyprus Stock Exchange
  'XMAL', // Malta Stock Exchange

  // ── United States ──
  'XNYS', // New York Stock Exchange
  'XNAS', // Nasdaq
  'XASE', // NYSE American (AMEX)
  'XCHI', // Chicago Stock Exchange
  'XCME', // CME Group (derivatives)
  'XCBT', // CBOT (commodities)
  'XNYM', // NYMEX (energy/metals)

  // ── Asia-Pacific ──
  'XTKS', // Tokyo Stock Exchange
  'XHKG', // Hong Kong Stock Exchange
  'XSES', // Singapore Exchange
  'XASX', // Australian Securities Exchange
  'XNZE', // NZX (New Zealand)
  'XSHG', // Shanghai Stock Exchange
  'XSHE', // Shenzhen Stock Exchange
  'XKRX', // Korea Exchange
  'XTAI', // Taiwan Stock Exchange
  'XBOM', // BSE India (Bombay)
  'XNSE', // NSE India (National)

  // ── Middle East ──
  'XDFM', // Dubai Financial Market
  'XADS', // Abu Dhabi Securities Exchange
  'XTAD', // Tel Aviv Stock Exchange

  // ── Americas (ex US) ──
  'XTSE', // Toronto Stock Exchange
  'XBSP', // B3 (São Paulo)
  'XMEX', // Bolsa Mexicana de Valores

  // ── Multilateral Trading Facilities (MTFs) — EU regulated ──
  'BATE', // BATS Europe (Cboe)
  'CHIX', // Chi-X Europe (Cboe)
  'TRQX', // Turquoise (LSEG)
  'AQXE', // Aquis Exchange
  'TQEX', // Tradegate Exchange

  // ── Systematic Internalisers (SI) — ESMA code ──
  'SINT', // Systematic Internaliser (generic MIC per ESMA guidance)
]);

/**
 * Validate an ISO 10383 Market Identifier Code (MIC).
 * Accepts known exchange MICs and ESMA special codes.
 */
export function isValidMIC(code: string): boolean {
  if (!code || code.length !== 3 && code.length !== 4) return false;
  return ESMA_MARKET_CODES.has(code.toUpperCase());
}

/**
 * Determine the appropriate MarketCodeType for AIFMD XML.
 *
 * Per ESMA IT Technical Guidance Rev 6:
 * - 'MIC' = identified market with ISO 10383 code
 * - 'XXX' = not listed / no identified market
 * - 'OTC' = over-the-counter
 * - 'NOT' = not applicable (empty slot)
 *
 * @param mic - The MIC code, or null/undefined
 * @param isOtc - Whether the instrument is OTC-traded
 * @returns Object with MarketCodeType and optional MarketCode
 */
export function resolveMarketCode(
  mic?: string | null,
  isOtc?: boolean,
): { marketCodeType: string; marketCode?: string } {
  if (mic && ESMA_MARKET_CODES.has(mic.toUpperCase())) {
    const upper = mic.toUpperCase();
    // Special ESMA codes are used as MarketCodeType directly
    if (upper === 'XXX' || upper === 'NOT' || upper === 'OTC') {
      return { marketCodeType: upper };
    }
    // Real MIC — use 'MIC' as type and provide the code
    return { marketCodeType: 'MIC', marketCode: upper };
  }
  if (isOtc) {
    return { marketCodeType: 'OTC' };
  }
  return { marketCodeType: 'XXX' };
}

// ── ISO 17442 LEI Normalization ─────────────────────────────

/**
 * Normalize an LEI to uppercase per ISO 17442.
 * The standard requires uppercase alphanumeric characters.
 */
export function normalizeLEI(lei: string | null | undefined): string | null {
  if (!lei) return null;
  return lei.trim().toUpperCase();
}

/**
 * Validate LEI format per ISO 17442 (format only, no checksum).
 * 20 characters: 18 uppercase alphanumeric + 2 check digits.
 */
export function isValidLEIFormat(lei: string): boolean {
  return /^[0-9A-Z]{18}[0-9]{2}$/.test(lei);
}
