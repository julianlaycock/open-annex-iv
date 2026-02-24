/**
 * @open-annex-iv/core
 *
 * Open-source AIFMD Annex IV XML serialization library.
 * Takes a plain AnnexIVReport object and produces ESMA-compliant XML.
 *
 * Zero dependencies. Pure functions only.
 */

// Types
export type { AnnexIVReport, LiquidityManagementTool, LiquidityBucket, GeographicExposure, CounterpartyExposure } from './types.js';

// Serializers
export { serializeAnnexIVToXml, serializeAggregateAnnexIVToXml } from './serializer.js';

// Helpers — EEA
export { isEEADomicile, mapDomicileToMemberState, toISOCountryCode } from './helpers/eea.js';

// Helpers — ESMA codes
export { mapReportingObligationToFrequencyCode, mapToPredominantAIFType, mapDepositaryType, mapAssetType, getTypePct } from './helpers/esma-codes.js';

// Helpers — XML utilities
export { escapeXml, tag } from './helpers/xml-utils.js';
