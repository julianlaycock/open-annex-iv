/**
 * @open-annex-iv/core
 *
 * Open-source AIFMD Annex IV XML serialization library.
 * Takes a plain AnnexIVReport object and produces ESMA-compliant XML.
 *
 * Includes Zod-based input validation (no native C++ dependencies required).
 */

// Types
export type {
  AnnexIVReport,
  LiquidityManagementTool,
  LiquidityBucket,
  GeographicExposure,
  CounterpartyExposure,
  ShareClassInfo,
  MonthlyRates,
  HistoricalRiskProfile,
  TradingClearingMechanism,
  BorrowingSource,
  MarketIdentification,
} from './types.js';

// Serializers — non-strict (human-in-loop paths, tooling, preview)
export {
  serializeAnnexIVToXml,
  serializeAggregateAnnexIVToXml,
} from './serializer.js';

// Serializers — strict (production NCA submission paths).
// Runs XSD validation on every output and throws on schema violation.
// Prevents schema-drift bugs (like the H3 AIFOpenPrincipleInfo regression)
// from reaching a regulator.
export {
  serializeAnnexIVToXmlStrict,
  serializeAggregateAnnexIVToXmlStrict,
  AnnexIVSchemaValidationError,
} from './serializer-strict.js';

// Helpers - EEA
export {
  isEEADomicile,
  mapDomicileToMemberState,
  toISOCountryCode,
} from './helpers/eea.js';

// Helpers - ESMA codes
export {
  mapReportingObligationToFrequencyCode,
  mapToPredominantAIFType,
  mapDepositaryType,
  mapAssetType,
  getTypePct,
} from './helpers/esma-codes.js';

// Helpers - ISO standard validation (4217, 10383, 17442)
export {
  isValidISO4217,
  isValidMIC,
  resolveMarketCode,
  normalizeLEI,
  isValidLEIFormat,
  ISO_4217_CURRENCIES,
  ESMA_MARKET_CODES,
} from './helpers/iso-codes.js';

// Helpers - XML utilities
export { escapeXml, tag } from './helpers/xml-utils.js';

// Validators
export { validateAnnexIVXml, validateAnnexIVData } from './validator.js';
export type { ValidationResult } from './validator.js';

// Zod schemas (for direct use / custom validation)
export {
  AnnexIVReportSchema,
  validateReportData,
  LeiSchema,
  DateSchema,
  CurrencySchema,
  MicSchema,
  MarketIdentificationSchema,
  PrincipalMarketSchema,
} from './zod-schemas.js';
export type { ValidatedAnnexIVReport } from './zod-schemas.js';
