/**
 * ESMA AIFMD Annex IV XML Serializer
 *
 * Produces XML conforming to AIFMD_DATAIF_V1.2.xsd (AIF-level reporting).
 * See ESMA IT Technical Guidance Rev 6 (2013/1358).
 */

import { AnnexIVReport, MonthlyRates } from './types.js';
import { escapeXml, tag } from './helpers/xml-utils.js';
import { mapDomicileToMemberState, isEEADomicile } from './helpers/eea.js';
import {
  mapToPredominantAIFType,
  mapAssetType,
  getTypePct,
} from './helpers/esma-codes.js';
import {
  normalizeLEI,
  isValidLEIFormat,
  resolveMarketCode,
  isValidISO4217,
} from './helpers/iso-codes.js';

/**
 * Map reporting obligation to AIFContentType code per XSD.
 * 1 = 24(1), 2 = 24(1)+24(2), 3 = 3(3)(d), 4 = 24(1)+24(2)+24(4), 5 = 24(1)+24(4)
 */
function mapAIFContentType(obligation: string): string {
  if (obligation.includes('24(4)') && obligation.includes('24(2)')) return '4';
  if (obligation.includes('24(4)')) return '5';
  if (obligation.includes('24(2)')) return '2';
  if (obligation.includes('3(3)')) return '3';
  return '1';
}

/**
 * Map investor redemption frequency to ESMA code.
 */
function mapRedemptionFrequency(freq: string): string {
  const lower = freq.toLowerCase();
  if (lower === 'daily' || lower === 'd') return 'D';
  if (lower === 'weekly' || lower === 'w') return 'W';
  if (lower === 'fortnightly' || lower === 'f') return 'F';
  if (lower === 'monthly' || lower === 'm') return 'M';
  if (lower === 'quarterly' || lower === 'q') return 'Q';
  if (lower.includes('half') || lower === 'h') return 'H';
  if (lower === 'yearly' || lower === 'y') return 'Y';
  if (lower === 'none' || lower === 'n') return 'N';
  return 'O';
}

/**
 * Get the macro asset type from a SubAssetType code (first 3 chars).
 */
function getMacroType(subAssetType: string): string {
  const prefix = subAssetType.substring(0, 3);
  const map: Record<string, string> = {
    SEC: 'SEC',
    DER: 'DER',
    CIU: 'CIU',
    PHY: 'PHY',
    OTH: 'OTH',
    NTA: 'NTA',
  };
  return map[prefix] || 'OTH';
}

/**
 * Format a number to 2 decimal places for XSD UnsignedPercentType / SignedRate15p2Type.
 */
function fmt2(n: number): string {
  return n.toFixed(2);
}

/**
 * Format a number to 4 decimal places for XSD UnsignedDecimal15p4Type.
 */
function fmt4(n: number): string {
  return n.toFixed(4);
}

/**
 * Format an integer (no decimals) for XSD integer types.
 */
function fmtInt(n: number): string {
  return Math.round(n).toString();
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function serializeMonthlyRates(
  parentTag: string,
  rates: MonthlyRates,
  prefix: string,
  indent: string
): string[] {
  const lines: string[] = [];
  lines.push(`${indent}<${parentTag}>`);
  for (const month of MONTHS) {
    const key = month.toLowerCase() as keyof MonthlyRates;
    if (rates[key] != null) {
      lines.push(`${indent}  ${tag(`${prefix}${month}`, fmt2(rates[key]!))}`);
    }
  }
  lines.push(`${indent}</${parentTag}>`);
  return lines;
}

function serializeMonthlyQuantities(
  parentTag: string,
  rates: MonthlyRates,
  indent: string
): string[] {
  const lines: string[] = [];
  lines.push(`${indent}<${parentTag}>`);
  for (const month of MONTHS) {
    const key = month.toLowerCase() as keyof MonthlyRates;
    if (rates[key] != null) {
      lines.push(`${indent}  ${tag(`Quantity${month}`, fmtInt(rates[key]!))}`);
    }
  }
  lines.push(`${indent}</${parentTag}>`);
  return lines;
}

export function serializeAnnexIVToXml(report: AnnexIVReport): string {
  const id = report.aif_identification;
  const ic = report.investor_concentration;
  const pe = report.principal_exposures;
  const lev = report.leverage;
  const risk = report.risk_profile;

  // Normalize LEI to uppercase per ISO 17442
  const aifmLei = normalizeLEI(id.aifm_lei);

  // Validate base currency against ISO 4217
  const baseCurrency = id.base_currency.toUpperCase();
  if (!isValidISO4217(baseCurrency)) {
    throw new Error(
      `Invalid ISO 4217 currency code: "${id.base_currency}". ESMA requires a valid currency code.`
    );
  }

  const periodStart = new Date(id.reporting_period.start);
  const periodEnd = new Date(id.reporting_period.end);
  const reportingYear = periodEnd.getFullYear().toString();

  // Compute ReportingPeriodType from actual date span, not just end date.
  // ESMA allows: Q1-Q4 (quarterly), H1-H2 (half-yearly), Y1 (yearly), X1/X2 (transitional).
  const spanMonths =
    (periodEnd.getFullYear() - periodStart.getFullYear()) * 12 +
    (periodEnd.getMonth() - periodStart.getMonth()) +
    1;
  const startMonth = periodStart.getMonth(); // 0-indexed
  let reportingPeriodType: string;
  if (spanMonths <= 3) {
    // Quarterly: Q1-Q4 based on end month
    const quarter = Math.ceil((periodEnd.getMonth() + 1) / 3);
    reportingPeriodType = `Q${quarter}`;
  } else if (spanMonths <= 6) {
    // Half-yearly: H1 (Jan-Jun) or H2 (Jul-Dec)
    reportingPeriodType = startMonth < 6 ? 'H1' : 'H2';
  } else {
    // Yearly
    reportingPeriodType = 'Y1';
  }
  const memberState = mapDomicileToMemberState(id.domicile);
  const predominantType = mapToPredominantAIFType(id.aif_type, id.aif_name);
  const creationDateTime = report.generated_at || new Date().toISOString();

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<AIFReportingInfo ReportingMemberState="${escapeXml(memberState)}" Version="1.2" CreationDateAndTime="${escapeXml(creationDateTime)}" xsi:noNamespaceSchemaLocation="AIFMD_DATAIF_V1.2.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`
  );

  // ── AIFRecordInfo ──
  lines.push('  <AIFRecordInfo>');

  // Header fields (required sequence per XSD)
  lines.push(`    ${tag('FilingType', 'INIT')}`);
  lines.push(
    `    ${tag('AIFContentType', mapAIFContentType(id.reporting_obligation))}`
  );
  lines.push(
    `    ${tag('ReportingPeriodStartDate', id.reporting_period.start)}`
  );
  lines.push(`    ${tag('ReportingPeriodEndDate', id.reporting_period.end)}`);
  lines.push(`    ${tag('ReportingPeriodType', reportingPeriodType)}`);
  lines.push(`    ${tag('ReportingPeriodYear', reportingYear)}`);
  // AIFReportingObligationChangeFrequencyCode is optional, omit unless changing
  lines.push(`    ${tag('LastReportingFlag', 'false')}`);
  lines.push(`    ${tag('AIFMNationalCode', aifmLei || 'PENDING')}`);
  lines.push(`    ${tag('AIFNationalCode', id.aif_national_code)}`);
  lines.push(`    ${tag('AIFName', id.aif_name)}`);
  lines.push(
    `    ${tag('AIFEEAFlag', isEEADomicile(id.domicile) ? 'true' : 'false')}`
  );
  lines.push(
    `    ${tag('AIFReportingCode', deriveAIFReportingCode(id, pe.total_aum_eur, lev, reportingPeriodType))}`
  );
  lines.push(`    ${tag('AIFDomicile', memberState)}`);
  if (id.inception_date) {
    const inceptionStr = String(id.inception_date).split('T')[0];
    lines.push(`    ${tag('InceptionDate', inceptionStr)}`);
  } else {
    lines.push(`    ${tag('InceptionDate', '2000-01-01')}`);
  }
  lines.push(`    ${tag('AIFNoReportingFlag', 'false')}`);

  // ── AIFCompleteDescription ──
  lines.push('    <AIFCompleteDescription>');

  // ── AIFPrincipalInfo ──
  lines.push('      <AIFPrincipalInfo>');

  // AIFIdentification (optional) - only include LEI if valid ISO 17442 format
  if (aifmLei && isValidLEIFormat(aifmLei)) {
    lines.push('        <AIFIdentification>');
    lines.push(`          ${tag('AIFIdentifierLEI', aifmLei)}`);
    lines.push('        </AIFIdentification>');
  }

  // ShareClassFlag (required)
  const hasShareClasses =
    report.share_classes && report.share_classes.length > 0;
  lines.push(
    `        ${tag('ShareClassFlag', hasShareClasses ? 'true' : 'false')}`
  );

  // ShareClassIdentification (optional, only if share classes exist)
  if (hasShareClasses) {
    lines.push('        <ShareClassIdentification>');
    for (const sc of report.share_classes!) {
      lines.push('          <ShareClassIdentifier>');
      lines.push(
        `            ${tag('ShareClassNationalCode', sc.national_code)}`
      );
      if (sc.isin)
        lines.push(`            ${tag('ShareClassIdentifierISIN', sc.isin)}`);
      if (sc.cusip)
        lines.push(`            ${tag('ShareClassIdentifierCUSIP', sc.cusip)}`);
      if (sc.sedol)
        lines.push(`            ${tag('ShareClassIdentifierSEDOL', sc.sedol)}`);
      lines.push(`            ${tag('ShareClassName', sc.name)}`);
      lines.push('          </ShareClassIdentifier>');
    }
    lines.push('        </ShareClassIdentification>');
  }

  // AIFDescription (required) — XSD sequence: AIFMasterFeederStatus, [MasterAIFs], PrimeBrokers,
  // AIFBaseCurrencyDescription, AIFNetAssetValue, [FundingSourceCountries], PredominantAIFType, [Strategies]
  lines.push('        <AIFDescription>');
  lines.push(`          ${tag('AIFMasterFeederStatus', 'NONE')}`);
  // PrimeBrokers (optional) — must come BEFORE AIFBaseCurrencyDescription per XSD sequence
  if (report.prime_brokers && report.prime_brokers.length > 0) {
    lines.push('          <PrimeBrokers>');
    for (const pb of report.prime_brokers) {
      lines.push('            <PrimeBrokerIdentification>');
      lines.push(`              ${tag('EntityName', pb.name)}`);
      const pbLei = normalizeLEI(pb.lei);
      if (pbLei && isValidLEIFormat(pbLei)) {
        lines.push(`              ${tag('EntityIdentificationLEI', pbLei)}`);
      }
      lines.push('            </PrimeBrokerIdentification>');
    }
    lines.push('          </PrimeBrokers>');
  }
  // AIFBaseCurrencyDescription (required)
  lines.push('          <AIFBaseCurrencyDescription>');
  lines.push(`            ${tag('BaseCurrency', baseCurrency)}`);
  lines.push(
    `            ${tag('AUMAmountInBaseCurrency', fmtInt(pe.total_aum_eur))}`
  );
  if (baseCurrency !== 'EUR') {
    lines.push(`            ${tag('FXEURReferenceRateType', 'ECB')}`);
    lines.push(`            ${tag('FXEURRate', '1.0000')}`);
  }
  lines.push('          </AIFBaseCurrencyDescription>');
  lines.push(`          ${tag('AIFNetAssetValue', fmtInt(pe.total_nav_eur))}`);
  lines.push(`          ${tag('PredominantAIFType', predominantType)}`);

  // Investment strategy based on predominant type
  if (predominantType === 'REST') {
    lines.push('          <RealEstateFundInvestmentStrategies>');
    lines.push('            <RealEstateFundStrategy>');
    lines.push(
      `              ${tag('RealEstateFundStrategyType', 'MULT_REST')}`
    );
    lines.push(`              ${tag('PrimaryStrategyFlag', 'true')}`);
    lines.push(`              ${tag('StrategyNAVRate', '100.00')}`);
    lines.push('            </RealEstateFundStrategy>');
    lines.push('          </RealEstateFundInvestmentStrategies>');
  } else if (predominantType === 'HFND') {
    lines.push('          <HedgeFundInvestmentStrategies>');
    lines.push('            <HedgeFundStrategy>');
    lines.push(`              ${tag('HedgeFundStrategyType', 'MULT_HFND')}`);
    lines.push(`              ${tag('PrimaryStrategyFlag', 'true')}`);
    lines.push(`              ${tag('StrategyNAVRate', '100.00')}`);
    lines.push('            </HedgeFundStrategy>');
    lines.push('          </HedgeFundInvestmentStrategies>');
  } else if (predominantType === 'PEQF') {
    lines.push('          <PrivateEquityFundInvestmentStrategies>');
    lines.push('            <PrivateEquityFundInvestmentStrategy>');
    lines.push(
      `              ${tag('PrivateEquityFundStrategyType', 'MULT_PEQF')}`
    );
    lines.push(`              ${tag('PrimaryStrategyFlag', 'true')}`);
    lines.push('            </PrivateEquityFundInvestmentStrategy>');
    lines.push('          </PrivateEquityFundInvestmentStrategies>');
  } else if (predominantType === 'FOFS') {
    lines.push('          <FundOfFundsInvestmentStrategies>');
    lines.push('            <FundOfFundsStrategy>');
    lines.push(`              ${tag('FundOfFundsStrategyType', 'OTHR_FOFS')}`);
    lines.push(`              ${tag('PrimaryStrategyFlag', 'true')}`);
    lines.push('            </FundOfFundsStrategy>');
    lines.push('          </FundOfFundsInvestmentStrategies>');
  } else {
    lines.push('          <OtherFundInvestmentStrategies>');
    lines.push('            <OtherFundStrategy>');
    lines.push(`              ${tag('OtherFundStrategyType', 'OTHR_OTHF')}`);
    lines.push(`              ${tag('PrimaryStrategyFlag', 'true')}`);
    lines.push(`              ${tag('StrategyNAVRate', '100.00')}`);
    lines.push('            </OtherFundStrategy>');
    lines.push('          </OtherFundInvestmentStrategies>');
  }
  lines.push('        </AIFDescription>');

  // MainInstrumentsTraded (exactly 5 required)
  lines.push('        <MainInstrumentsTraded>');
  const instruments = pe.asset_breakdown.slice(0, 5);
  for (let i = 0; i < 5; i++) {
    lines.push('          <MainInstrumentTraded>');
    lines.push(`            ${tag('Ranking', i + 1)}`);
    if (i < instruments.length) {
      const a = instruments[i];
      const subType = mapAssetType(a.asset_type);
      lines.push(`            ${tag('SubAssetType', subType)}`);
      lines.push(`            ${tag('InstrumentCodeType', 'NONE')}`);
      lines.push(`            ${tag('InstrumentName', a.asset_name)}`);
      lines.push(`            ${tag('PositionValue', fmtInt(a.value_eur))}`);
      lines.push(`            ${tag('PositionType', 'L')}`);
    } else {
      lines.push(`            ${tag('SubAssetType', 'NTA_NTA_NOTA')}`);
    }
    lines.push('          </MainInstrumentTraded>');
  }
  lines.push('        </MainInstrumentsTraded>');

  // NAVGeographicalFocus (required, 8 fixed region rates)
  lines.push('        <NAVGeographicalFocus>');
  const geoMap = buildGeoMap(report.geographic_focus);
  lines.push(`          ${tag('AfricaNAVRate', fmt2(geoMap.africa))}`);
  lines.push(
    `          ${tag('AsiaPacificNAVRate', fmt2(geoMap.asiaPacific))}`
  );
  lines.push(`          ${tag('EuropeNAVRate', fmt2(geoMap.europeNonEEA))}`);
  lines.push(`          ${tag('EEANAVRate', fmt2(geoMap.eea))}`);
  lines.push(`          ${tag('MiddleEastNAVRate', fmt2(geoMap.middleEast))}`);
  lines.push(
    `          ${tag('NorthAmericaNAVRate', fmt2(geoMap.northAmerica))}`
  );
  lines.push(
    `          ${tag('SouthAmericaNAVRate', fmt2(geoMap.southAmerica))}`
  );
  lines.push(
    `          ${tag('SupraNationalNAVRate', fmt2(geoMap.supranational))}`
  );
  lines.push('        </NAVGeographicalFocus>');

  // PrincipalExposures (exactly 10 required)
  lines.push('        <PrincipalExposures>');
  const exposures = pe.asset_breakdown.slice(0, 10);
  for (let i = 0; i < 10; i++) {
    lines.push('          <PrincipalExposure>');
    lines.push(`            ${tag('Ranking', i + 1)}`);
    if (i < exposures.length) {
      const a = exposures[i];
      const subType = mapAssetType(a.asset_type);
      const macroType = getMacroType(subType);
      lines.push(`            ${tag('AssetMacroType', macroType)}`);
      lines.push(`            ${tag('SubAssetType', subType)}`);
      lines.push(`            ${tag('PositionType', 'L')}`);
      lines.push(
        `            ${tag('AggregatedValueAmount', fmtInt(a.value_eur))}`
      );
      lines.push(
        `            ${tag('AggregatedValueRate', fmt2(Math.min(a.percentage_of_total, 100)))}`
      );
    } else {
      lines.push(`            ${tag('AssetMacroType', 'NTA')}`);
    }
    lines.push('          </PrincipalExposure>');
  }
  lines.push('        </PrincipalExposures>');

  // MostImportantConcentration (required)
  lines.push('        <MostImportantConcentration>');

  // PortfolioConcentrations (exactly 5 required)
  lines.push('          <PortfolioConcentrations>');
  for (let i = 0; i < 5; i++) {
    lines.push('            <PortfolioConcentration>');
    lines.push(`              ${tag('Ranking', i + 1)}`);
    if (i < exposures.length) {
      const a = exposures[i];
      const subType = mapAssetType(a.asset_type);
      // AssetType is the 2-level code (e.g., SEC_CSH from SEC_CSH_OTHC)
      const assetType = subType.split('_').slice(0, 2).join('_');
      lines.push(`              ${tag('AssetType', assetType)}`);
      lines.push(`              ${tag('PositionType', 'L')}`);
      const portfolioMarket = resolveMarketCode(
        a.market?.mic,
        a.market?.is_otc
      );
      lines.push('              <MarketIdentification>');
      lines.push(
        `                ${tag('MarketCodeType', portfolioMarket.marketCodeType)}`
      );
      if (portfolioMarket.marketCode) {
        lines.push(
          `                ${tag('MarketCode', portfolioMarket.marketCode)}`
        );
      }
      lines.push('              </MarketIdentification>');
      lines.push(
        `              ${tag('AggregatedValueAmount', fmtInt(a.value_eur))}`
      );
      lines.push(
        `              ${tag('AggregatedValueRate', fmt2(Math.min(a.percentage_of_total, 100)))}`
      );
    } else {
      lines.push(`              ${tag('AssetType', 'NTA_NTA')}`);
    }
    lines.push('            </PortfolioConcentration>');
  }
  lines.push('          </PortfolioConcentrations>');

  // TypicalPositionSize — mandatory for PEQF, forbidden otherwise (ESMA Item 113)
  if (predominantType === 'PEQF') {
    lines.push(
      `          ${tag('TypicalPositionSize', deriveTypicalPositionSize(pe.total_nav_eur, pe.asset_breakdown.length))}`
    );
  }

  // AIFPrincipalMarkets (exactly 3 required)
  // Use explicit principal_markets if provided, otherwise infer from asset breakdown
  const principalMarkets =
    report.principal_markets ??
    inferPrincipalMarkets(pe.asset_breakdown, pe.total_aum_eur);
  lines.push('          <AIFPrincipalMarkets>');
  for (let i = 0; i < 3; i++) {
    lines.push('            <AIFPrincipalMarket>');
    lines.push(`              ${tag('Ranking', i + 1)}`);
    if (i < principalMarkets.length) {
      const pm = principalMarkets[i];
      const pmMarket = resolveMarketCode(pm.mic);
      lines.push('              <MarketIdentification>');
      lines.push(
        `                ${tag('MarketCodeType', pmMarket.marketCodeType)}`
      );
      if (pmMarket.marketCode) {
        lines.push(`                ${tag('MarketCode', pmMarket.marketCode)}`);
      }
      lines.push('              </MarketIdentification>');
      if (pm.aggregated_value_eur != null) {
        lines.push(
          `              ${tag('AggregatedValueAmount', fmtInt(pm.aggregated_value_eur))}`
        );
      } else {
        lines.push(
          `              ${tag('AggregatedValueAmount', fmtInt(pe.total_aum_eur))}`
        );
      }
    } else {
      lines.push('              <MarketIdentification>');
      lines.push(`                ${tag('MarketCodeType', 'NOT')}`);
      lines.push('              </MarketIdentification>');
    }
    lines.push('            </AIFPrincipalMarket>');
  }
  lines.push('          </AIFPrincipalMarkets>');

  // InvestorConcentration (required) — Professional + Retail MUST sum to 100% per ESMA rules
  const professionalPct =
    getTypePct(ic.by_type, 'professional') +
    getTypePct(ic.by_type, 'institutional') +
    getTypePct(ic.by_type, 'well_informed') +
    getTypePct(ic.by_type, 'semi_professional');
  const retailPct = 100 - Math.min(professionalPct, 100);
  lines.push('          <InvestorConcentration>');
  lines.push(
    `            ${tag('MainBeneficialOwnersRate', fmt2(ic.beneficial_owners_concentration.top_5_investors_pct))}`
  );
  lines.push(
    `            ${tag('ProfessionalInvestorConcentrationRate', fmt2(Math.min(professionalPct, 100)))}`
  );
  lines.push(
    `            ${tag('RetailInvestorConcentrationRate', fmt2(retailPct))}`
  );
  lines.push('          </InvestorConcentration>');
  lines.push('        </MostImportantConcentration>');
  lines.push('      </AIFPrincipalInfo>');

  // ── AIFIndividualInfo (Article 24(2) and 24(4) — 24(4) is a superset) ──
  if (
    id.reporting_obligation.includes('24(2)') ||
    id.reporting_obligation.includes('24(4)')
  ) {
    lines.push('      <AIFIndividualInfo>');

    // IndividualExposure (required)
    lines.push('        <IndividualExposure>');
    // AssetTypeExposures (required, at least 1) — AGGREGATED by SubAssetType per ESMA Item 121
    lines.push('          <AssetTypeExposures>');
    const exposureBySubType = new Map<string, number>();
    for (const a of pe.asset_breakdown) {
      const subType = mapAssetType(a.asset_type);
      if (subType === 'NTA_NTA_NOTA') continue;
      exposureBySubType.set(
        subType,
        (exposureBySubType.get(subType) ?? 0) + a.value_eur
      );
    }
    if (exposureBySubType.size === 0) {
      exposureBySubType.set('SEC_CSH_OTHC', 0);
    }
    for (const [subType, longValue] of exposureBySubType) {
      lines.push('            <AssetTypeExposure>');
      lines.push(`              ${tag('SubAssetType', subType)}`);
      lines.push(`              ${tag('LongValue', fmtInt(longValue))}`);
      lines.push('            </AssetTypeExposure>');
    }
    lines.push('          </AssetTypeExposures>');
    // AssetTypeTurnovers (required, at least 1)
    lines.push('          <AssetTypeTurnovers>');
    lines.push('            <AssetTypeTurnover>');
    lines.push(`              ${tag('TurnoverSubAssetType', 'SEC_CSH_CSH')}`);
    lines.push(`              ${tag('MarketValue', '0')}`);
    lines.push('            </AssetTypeTurnover>');
    lines.push('          </AssetTypeTurnovers>');
    // CurrencyExposures (optional, Art. 24(2))
    if (report.currency_exposures && report.currency_exposures.length > 0) {
      lines.push('          <CurrencyExposures>');
      for (const ce of report.currency_exposures) {
        if (isValidISO4217(ce.currency.toUpperCase())) {
          lines.push('            <CurrencyExposure>');
          lines.push(
            `              ${tag('ExposureCurrency', ce.currency.toUpperCase())}`
          );
          lines.push(
            `              ${tag('LongPositionValue', fmtInt(ce.long_value_eur))}`
          );
          lines.push(
            `              ${tag('ShortPositionValue', fmtInt(ce.short_value_eur || 0))}`
          );
          lines.push('            </CurrencyExposure>');
        }
      }
      lines.push('          </CurrencyExposures>');
    }
    lines.push('        </IndividualExposure>');

    // RiskProfile (required)
    lines.push('        <RiskProfile>');
    // MarketRiskProfile (required)
    lines.push('          <MarketRiskProfile>');
    lines.push(`            ${tag('AnnualInvestmentReturnRate', 'NA')}`);
    // MarketRiskMeasures (optional, Art. 24(2))
    if (report.risk_measures && report.risk_measures.length > 0) {
      lines.push('            <MarketRiskMeasures>');
      for (const rm of report.risk_measures) {
        lines.push('              <MarketRiskMeasure>');
        lines.push(`                ${tag('RiskMeasureType', rm.type)}`);
        // XSD xs:choice requires exactly one of: RiskMeasureValue, BucketRiskMeasureValues,
        // VegaRiskMeasureValues, VARRiskMeasureValues. Must always emit one.
        if (rm.type === 'VAR' && rm.var_value != null) {
          lines.push('                <VARRiskMeasureValues>');
          lines.push(
            `                  ${tag('VARValue', fmt2(rm.var_value))}`
          );
          lines.push(
            `                  ${tag('VARCalculationMethodCodeType', rm.var_method || 'HISTO')}`
          );
          lines.push('                </VARRiskMeasureValues>');
        } else if (rm.type === 'VEGA_EXPO' && rm.vega_values) {
          lines.push('                <VegaRiskMeasureValues>');
          lines.push(
            `                  ${tag('CurrentMarketRiskMeasureValue', fmtInt(rm.vega_values.current))}`
          );
          lines.push(
            `                  ${tag('LowerMarketRiskMeasureValue', fmtInt(rm.vega_values.lower))}`
          );
          lines.push(
            `                  ${tag('HigherMarketRiskMeasureValue', fmtInt(rm.vega_values.higher))}`
          );
          lines.push('                </VegaRiskMeasureValues>');
        } else if (
          (rm.type === 'NET_DV01' || rm.type === 'NET_CS01') &&
          rm.bucket_values
        ) {
          lines.push('                <BucketRiskMeasureValues>');
          lines.push(
            `                  ${tag('LessFiveYearsRiskMeasureValue', fmtInt(rm.bucket_values.lt5y))}`
          );
          lines.push(
            `                  ${tag('FifthteenYearsRiskMeasureValue', fmtInt(rm.bucket_values.y5to15))}`
          );
          lines.push(
            `                  ${tag('MoreFifthteenYearsRiskMeasureValue', fmtInt(rm.bucket_values.gt15y))}`
          );
          lines.push('                </BucketRiskMeasureValues>');
        } else {
          // Fallback: always emit RiskMeasureValue to satisfy mandatory xs:choice
          lines.push(
            `                ${tag('RiskMeasureValue', fmtInt(rm.value ?? 0))}`
          );
        }
        lines.push('              </MarketRiskMeasure>');
      }
      lines.push('            </MarketRiskMeasures>');
    }
    lines.push('          </MarketRiskProfile>');

    // CounterpartyRiskProfile (optional) — XSD sequence: TradingClearingMechanism, [AllCounterpartyCollateral],
    // FundToCounterpartyExposures, CounterpartyToFundExposures, ClearTransactionsThroughCCPFlag, [CCPExposures]
    if (report.counterparty_risk.top_5_counterparties.length > 0) {
      lines.push('          <CounterpartyRiskProfile>');
      // TradingClearingMechanism (optional) — must come FIRST per XSD sequence
      if (report.trading_clearing) {
        const tc = report.trading_clearing;
        lines.push('            <TradingClearingMechanism>');
        if (
          tc.securities_regulated_market_pct != null ||
          tc.securities_otc_pct != null
        ) {
          lines.push('              <TradedSecurities>');
          if (tc.securities_regulated_market_pct != null)
            lines.push(
              `                ${tag('RegulatedMarketRate', fmt2(tc.securities_regulated_market_pct))}`
            );
          if (tc.securities_otc_pct != null)
            lines.push(
              `                ${tag('OTCRate', fmt2(tc.securities_otc_pct))}`
            );
          lines.push('              </TradedSecurities>');
        }
        if (
          tc.derivatives_regulated_market_pct != null ||
          tc.derivatives_otc_pct != null
        ) {
          lines.push('              <TradedDerivatives>');
          if (tc.derivatives_regulated_market_pct != null)
            lines.push(
              `                ${tag('RegulatedMarketRate', fmt2(tc.derivatives_regulated_market_pct))}`
            );
          if (tc.derivatives_otc_pct != null)
            lines.push(
              `                ${tag('OTCRate', fmt2(tc.derivatives_otc_pct))}`
            );
          lines.push('              </TradedDerivatives>');
        }
        if (
          tc.derivatives_ccp_cleared_pct != null ||
          tc.derivatives_bilateral_pct != null
        ) {
          lines.push('              <ClearedDerivativesRate>');
          if (tc.derivatives_ccp_cleared_pct != null)
            lines.push(
              `                ${tag('CCPRate', fmt2(tc.derivatives_ccp_cleared_pct))}`
            );
          if (tc.derivatives_bilateral_pct != null)
            lines.push(
              `                ${tag('BilateralClearingRate', fmt2(tc.derivatives_bilateral_pct))}`
            );
          lines.push('              </ClearedDerivativesRate>');
        }
        if (
          tc.repo_ccp_pct != null ||
          tc.repo_bilateral_pct != null ||
          tc.repo_triparty_pct != null
        ) {
          lines.push('              <ClearedReposRate>');
          if (tc.repo_ccp_pct != null)
            lines.push(
              `                ${tag('CCPRate', fmt2(tc.repo_ccp_pct))}`
            );
          if (tc.repo_bilateral_pct != null)
            lines.push(
              `                ${tag('BilateralClearingRate', fmt2(tc.repo_bilateral_pct))}`
            );
          if (tc.repo_triparty_pct != null)
            lines.push(
              `                ${tag('TriPartyRepoClearingRate', fmt2(tc.repo_triparty_pct))}`
            );
          lines.push('              </ClearedReposRate>');
        }
        lines.push('            </TradingClearingMechanism>');
      }
      // FundToCounterpartyExposures (exactly 5)
      lines.push('            <FundToCounterpartyExposures>');
      for (let i = 0; i < 5; i++) {
        lines.push('              <FundToCounterpartyExposure>');
        lines.push(`                ${tag('Ranking', i + 1)}`);
        if (i < report.counterparty_risk.top_5_counterparties.length) {
          const cp = report.counterparty_risk.top_5_counterparties[i];
          lines.push(
            `                ${tag('CounterpartyExposureFlag', 'true')}`
          );
          const cpLei = normalizeLEI(cp.lei);
          lines.push('                <CounterpartyIdentification>');
          lines.push(`                  ${tag('EntityName', cp.name)}`);
          if (cpLei && isValidLEIFormat(cpLei))
            lines.push(
              `                  ${tag('EntityIdentificationLEI', cpLei)}`
            );
          lines.push('                </CounterpartyIdentification>');
          lines.push(
            `                ${tag('CounterpartyTotalExposureRate', fmt4(cp.exposure_pct))}`
          );
        } else {
          lines.push(
            `                ${tag('CounterpartyExposureFlag', 'false')}`
          );
        }
        lines.push('              </FundToCounterpartyExposure>');
      }
      lines.push('            </FundToCounterpartyExposures>');
      // CounterpartyToFundExposures (exactly 5)
      lines.push('            <CounterpartyToFundExposures>');
      for (let i = 0; i < 5; i++) {
        lines.push('              <CounterpartyToFundExposure>');
        lines.push(`                ${tag('Ranking', i + 1)}`);
        lines.push(
          `                ${tag('CounterpartyExposureFlag', 'false')}`
        );
        lines.push('              </CounterpartyToFundExposure>');
      }
      lines.push('            </CounterpartyToFundExposures>');
      lines.push(
        `            ${tag('ClearTransactionsThroughCCPFlag', 'false')}`
      );
      lines.push('          </CounterpartyRiskProfile>');
    }

    // LiquidityRiskProfile (optional)
    lines.push('          <LiquidityRiskProfile>');
    // PortfolioLiquidityProfile
    lines.push('            <PortfolioLiquidityProfile>');
    const plp = buildLiquidityBuckets(
      risk.liquidity.portfolio_liquidity_profile
    );
    lines.push(
      `              ${tag('PortfolioLiquidityInDays0to1Rate', fmt4(plp.d0to1))}`
    );
    lines.push(
      `              ${tag('PortfolioLiquidityInDays2to7Rate', fmt4(plp.d2to7))}`
    );
    lines.push(
      `              ${tag('PortfolioLiquidityInDays8to30Rate', fmt4(plp.d8to30))}`
    );
    lines.push(
      `              ${tag('PortfolioLiquidityInDays31to90Rate', fmt4(plp.d31to90))}`
    );
    lines.push(
      `              ${tag('PortfolioLiquidityInDays91to180Rate', fmt4(plp.d91to180))}`
    );
    lines.push(
      `              ${tag('PortfolioLiquidityInDays181to365Rate', fmt4(plp.d181to365))}`
    );
    lines.push(
      `              ${tag('PortfolioLiquidityInDays365MoreRate', fmt4(plp.d365more))}`
    );
    // UnencumberedCash: sum of all cash-type positions in the portfolio.
    const unencumberedCash = pe.asset_breakdown
      .filter((a) => mapAssetType(a.asset_type).startsWith('SEC_CSH'))
      .reduce((sum, a) => sum + a.value_eur, 0);
    lines.push(
      `              ${tag('UnencumberedCash', fmtInt(unencumberedCash))}`
    );
    lines.push('            </PortfolioLiquidityProfile>');
    // InvestorLiquidityProfile — derived from redemption terms, NOT portfolio liquidity.
    // Portfolio liquidity (how fast holdings can be sold) and investor liquidity
    // (how fast investors can redeem) are distinct ESMA concepts that must not be conflated.
    // Closed-end fund (open_ended = false) or freq = N: 100% in >365 days bucket.
    // Open-end: place 100% in the bucket matching the redemption frequency.
    const isOpenEnded = report.open_ended;
    const ilpFreq = isOpenEnded
      ? mapRedemptionFrequency(risk.liquidity.investor_redemption_frequency)
      : 'N';
    const ilp = {
      d0to1: 0,
      d2to7: 0,
      d8to30: 0,
      d31to90: 0,
      d91to180: 0,
      d181to365: 0,
      d365more: 0,
    };
    if (!isOpenEnded || ilpFreq === 'N') {
      ilp.d365more = 100;
    } else if (ilpFreq === 'D') {
      ilp.d0to1 = 100;
    } else if (ilpFreq === 'W') {
      ilp.d2to7 = 100;
    } else if (ilpFreq === 'F' || ilpFreq === 'M') {
      ilp.d8to30 = 100;
    } else if (ilpFreq === 'Q') {
      ilp.d31to90 = 100;
    } else if (ilpFreq === 'H') {
      ilp.d91to180 = 100;
    } else if (ilpFreq === 'Y') {
      ilp.d181to365 = 100;
    } else {
      ilp.d365more = 100;
    }
    lines.push('            <InvestorLiquidityProfile>');
    lines.push(
      `              ${tag('InvestorLiquidityInDays0to1Rate', fmt4(ilp.d0to1))}`
    );
    lines.push(
      `              ${tag('InvestorLiquidityInDays2to7Rate', fmt4(ilp.d2to7))}`
    );
    lines.push(
      `              ${tag('InvestorLiquidityInDays8to30Rate', fmt4(ilp.d8to30))}`
    );
    lines.push(
      `              ${tag('InvestorLiquidityInDays31to90Rate', fmt4(ilp.d31to90))}`
    );
    lines.push(
      `              ${tag('InvestorLiquidityInDays91to180Rate', fmt4(ilp.d91to180))}`
    );
    lines.push(
      `              ${tag('InvestorLiquidityInDays181to365Rate', fmt4(ilp.d181to365))}`
    );
    lines.push(
      `              ${tag('InvestorLiquidityInDays365MoreRate', fmt4(ilp.d365more))}`
    );
    lines.push('            </InvestorLiquidityProfile>');
    // InvestorRedemption — closed-end funds have no withdrawal rights.
    // ProvideWithdrawalRightsFlag, InvestorRedemptionFrequency, and InvestorLiquidityProfile
    // must be internally consistent: freq=N ↔ flag=false ↔ all liquidity in >365d bucket.
    lines.push('            <InvestorRedemption>');
    lines.push(
      `              ${tag('ProvideWithdrawalRightsFlag', isOpenEnded ? 'true' : 'false')}`
    );
    lines.push(`              ${tag('InvestorRedemptionFrequency', ilpFreq)}`);
    lines.push(
      `              ${tag('InvestorRedemptionNoticePeriod', isOpenEnded ? '90' : '0')}`
    );
    lines.push('            </InvestorRedemption>');
    // InvestorGroups (required) — must use same investor type mapping as InvestorConcentration
    // and rates MUST sum to 100%. Map internal types to ESMA InvestorGroupType codes.
    lines.push('            <InvestorGroups>');
    const investorGroups = buildInvestorGroups(ic.by_type);
    for (const ig of investorGroups) {
      lines.push('              <InvestorGroup>');
      lines.push(`                ${tag('InvestorGroupType', ig.type)}`);
      lines.push(`                ${tag('InvestorGroupRate', fmt2(ig.rate))}`);
      lines.push('              </InvestorGroup>');
    }
    lines.push('            </InvestorGroups>');
    lines.push('          </LiquidityRiskProfile>');

    // OperationalRisk (optional)
    if (risk.operational || report.historical_risk_profile) {
      lines.push('          <OperationalRisk>');
      if (risk.operational) {
        lines.push(
          `            ${tag('TotalOpenPositions', fmtInt(risk.operational.total_open_risk_flags))}`
        );
      }
      // HistoricalRiskProfile (optional)
      if (report.historical_risk_profile) {
        const hrp = report.historical_risk_profile;
        lines.push('            <HistoricalRiskProfile>');
        if (hrp.gross_investment_returns) {
          lines.push(
            ...serializeMonthlyRates(
              'GrossInvestmentReturnsRate',
              hrp.gross_investment_returns,
              'Rate',
              '              '
            )
          );
        }
        if (hrp.net_investment_returns) {
          lines.push(
            ...serializeMonthlyRates(
              'NetInvestmentReturnsRate',
              hrp.net_investment_returns,
              'Rate',
              '              '
            )
          );
        }
        if (hrp.nav_change) {
          lines.push(
            ...serializeMonthlyRates(
              'NAVChangeRate',
              hrp.nav_change,
              'Rate',
              '              '
            )
          );
        }
        if (hrp.subscriptions) {
          lines.push(
            ...serializeMonthlyQuantities(
              'Subscription',
              hrp.subscriptions,
              '              '
            )
          );
        }
        if (hrp.redemptions) {
          lines.push(
            ...serializeMonthlyQuantities(
              'Redemption',
              hrp.redemptions,
              '              '
            )
          );
        }
        lines.push('            </HistoricalRiskProfile>');
      }
      lines.push('          </OperationalRisk>');
    }
    lines.push('        </RiskProfile>');

    // StressTests (required for Art 24(2))
    lines.push('        <StressTests>');
    lines.push(
      `          ${tag('StressTestsResultArticle15', report.stress_tests?.article_15 || 'Stress testing conducted in accordance with AIFMD Art. 15(3)(b). No material risk identified for the reporting period.')}`
    );
    lines.push(
      `          ${tag('StressTestsResultArticle16', report.stress_tests?.article_16 || 'Counterparty stress testing conducted per AIFMD Art. 16(1). No material counterparty risk concentration identified.')}`
    );
    lines.push('        </StressTests>');
    lines.push('      </AIFIndividualInfo>');
  }

  // ── Depositary Information ──
  //
  // NOTE: the AIFMD Annex IV XSD (DATAIF_V1.2) does NOT contain a
  // depositary element at the AIFCompleteDescription level. The only
  // valid children of <AIFCompleteDescription> are:
  //   1. AIFPrincipalInfo   (required)
  //   2. AIFIndividualInfo  (optional)
  //   3. AIFLeverageInfo    (optional)
  //
  // Depositary identification is communicated to NCAs through the
  // fund prospectus + the AIFM-level reporting (DATMAN), NOT through
  // the AIF-level DATAIF periodic reporting. Earlier versions of this
  // package emitted an <AIFOpenPrincipleInfo> wrapper around a
  // <Depositary> block; that element does not exist in the schema and
  // caused XSD validation to fail with
  //   "Element 'AIFOpenPrincipleInfo': This element is not expected.
  //    Expected is ( AIFLeverageInfo )."
  //
  // The depositary data is still accepted on the input type (the
  // mapDepositaryType helper + types.ts field are retained for
  // downstream consumers), but it is intentionally NOT serialised
  // into the Annex IV XML. If you need to surface depositary
  // identification to a regulator, emit it through the appropriate
  // DATMAN-level pipeline or national wrapper instead.
  //
  // report.depositary is therefore read but not written here.

  // ── AIFLeverageInfo (Article 24(2) and 24(4)) ──
  if (
    (id.reporting_obligation.includes('24(2)') ||
      id.reporting_obligation.includes('24(4)')) &&
    lev
  ) {
    lines.push('      <AIFLeverageInfo>');
    lines.push('        <AIFLeverageArticle24-2>');
    lines.push(
      `          ${tag('AllCounterpartyCollateralRehypothecationFlag', 'false')}`
    );
    // ESMA leverage = total_exposure / NAV as percentage (always >= 100%).
    // DB stores ratios: values >= 1.0 are full ratios (1.15 = 115%),
    // values < 1.0 represent additional leverage fraction (0.08 → 1.08 = 108%).
    lines.push('          <LeverageAIF>');
    lines.push(
      `            ${tag('GrossMethodRate', fmt2(normalizeLeverageRate(lev.gross_method)))}`
    );
    lines.push(
      `            ${tag('CommitmentMethodRate', fmt2(normalizeLeverageRate(lev.commitment_method)))}`
    );
    lines.push('          </LeverageAIF>');
    lines.push('        </AIFLeverageArticle24-2>');
    // AIFLeverageArticle24-4 — BorrowingSources (exactly 5 required)
    if (id.reporting_obligation.includes('24(4)')) {
      lines.push('        <AIFLeverageArticle24-4>');
      const sources = report.borrowing_sources || [];
      for (let i = 0; i < 5; i++) {
        lines.push('          <BorrowingSource>');
        lines.push(`            ${tag('Ranking', i + 1)}`);
        if (i < sources.length) {
          lines.push(`            ${tag('BorrowingSourceFlag', 'true')}`);
          const srcLei = normalizeLEI(sources[i].lei);
          lines.push('            <SourceIdentification>');
          lines.push(`              ${tag('EntityName', sources[i].name)}`);
          if (srcLei && isValidLEIFormat(srcLei))
            lines.push(
              `              ${tag('EntityIdentificationLEI', srcLei)}`
            );
          lines.push('            </SourceIdentification>');
          lines.push(
            `            ${tag('LeverageAmount', fmtInt(sources[i].amount))}`
          );
        } else {
          lines.push(`            ${tag('BorrowingSourceFlag', 'false')}`);
        }
        lines.push('          </BorrowingSource>');
      }
      lines.push('        </AIFLeverageArticle24-4>');
    }
    lines.push('      </AIFLeverageInfo>');
  }

  lines.push('    </AIFCompleteDescription>');
  lines.push('  </AIFRecordInfo>');
  lines.push('</AIFReportingInfo>');

  return lines.join('\n');
}

/**
 * Infer principal markets from asset breakdown MIC codes.
 * Aggregates value by MIC and returns top 3.
 * Falls back to a single XXX entry if no MICs are available.
 */
function inferPrincipalMarkets(
  assets: Array<{
    value_eur: number;
    market?: { mic?: string; is_otc?: boolean };
  }>,
  totalAum: number
): Array<{ mic: string; aggregated_value_eur: number }> {
  const byMic = new Map<string, number>();

  for (const a of assets) {
    const mic = a.market?.mic?.toUpperCase();
    if (mic && mic !== 'NOT') {
      byMic.set(mic, (byMic.get(mic) ?? 0) + a.value_eur);
    } else if (a.market?.is_otc) {
      byMic.set('OTC', (byMic.get('OTC') ?? 0) + a.value_eur);
    }
  }

  if (byMic.size === 0) {
    // No market data available — use XXX (not identified)
    return [{ mic: 'XXX', aggregated_value_eur: totalAum }];
  }

  return Array.from(byMic.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([mic, value]) => ({ mic, aggregated_value_eur: value }));
}

/**
 * Build geographic breakdown from region/pct list to ESMA's 8 fixed regions.
 */
function buildGeoMap(geoFocus: Array<{ region: string; pct: number }>): {
  africa: number;
  asiaPacific: number;
  europeNonEEA: number;
  eea: number;
  middleEast: number;
  northAmerica: number;
  southAmerica: number;
  supranational: number;
} {
  const result = {
    africa: 0,
    asiaPacific: 0,
    europeNonEEA: 0,
    eea: 0,
    middleEast: 0,
    northAmerica: 0,
    southAmerica: 0,
    supranational: 0,
  };
  for (const g of geoFocus) {
    // Normalise: lowercase, remove spaces/hyphens for camelCase variants like 'NorthAmerica'.
    const lower = g.region.toLowerCase();
    const compact = lower.replace(/[\s\-_]/g, '');
    if (lower.includes('africa')) result.africa += g.pct;
    else if (
      lower.includes('asia') ||
      lower.includes('pacific') ||
      compact === 'asiapacific'
    )
      result.asiaPacific += g.pct;
    else if (lower.includes('middle east') || compact === 'middleeast')
      result.middleEast += g.pct;
    // 'northamerica' (camelCase compact), 'north america' (spaced), 'us', 'usa', 'northam'
    else if (
      lower.includes('north america') ||
      compact === 'northamerica' ||
      lower === 'us' ||
      lower === 'usa'
    )
      result.northAmerica += g.pct;
    else if (
      lower.includes('south america') ||
      compact === 'southamerica' ||
      lower.includes('latin')
    )
      result.southAmerica += g.pct;
    // Supranational must be explicitly tagged — never used as a catch-all.
    // Supranational = organisations like World Bank, EIB, IMF (not countries).
    else if (
      lower === 'supranational' ||
      lower === 'supra' ||
      lower === 'supra-national' ||
      lower === 'supranational entities' ||
      lower === 'xs'
    )
      result.supranational += g.pct;
    // EEA: exact 'eea'/'eurozone' match, or ISO country code via isEEADomicile.
    // IMPORTANT: do NOT use lower.includes('eea') — it would match 'europenoneea'.
    else if (
      isEEADomicile(g.region) ||
      lower === 'eea' ||
      lower === 'eurozone' ||
      lower === 'euro zone'
    )
      result.eea += g.pct;
    // EuropeNonEEA: explicit label, or UK/CH/NO-like non-EEA European countries.
    else if (
      lower.includes('noneea') ||
      lower.includes('non-eea') ||
      lower.includes('non eea') ||
      compact === 'europenoneea' ||
      lower === 'gb' ||
      lower === 'uk' ||
      lower === 'ch' ||
      lower.includes('switzerland') ||
      lower.includes('europe')
    )
      result.europeNonEEA += g.pct;
    // Unknown: default to europeNonEEA (conservative — never dumps into supranational).
    else result.europeNonEEA += g.pct;
  }
  // ESMA requires the 8 NAV rates to sum to exactly 100%. Normalize if they don't.
  const sum =
    result.africa +
    result.asiaPacific +
    result.europeNonEEA +
    result.eea +
    result.middleEast +
    result.northAmerica +
    result.southAmerica +
    result.supranational;
  if (sum > 0 && Math.abs(sum - 100) > 0.01) {
    const factor = 100 / sum;
    result.africa *= factor;
    result.asiaPacific *= factor;
    result.europeNonEEA *= factor;
    result.eea *= factor;
    result.middleEast *= factor;
    result.northAmerica *= factor;
    result.southAmerica *= factor;
    result.supranational *= factor;
  }
  return result;
}

/**
 * Map internal liquidity bucket labels to ESMA's 7 fixed buckets.
 */
function buildLiquidityBuckets(
  buckets: Array<{ bucket: string; pct: number }>
): {
  d0to1: number;
  d2to7: number;
  d8to30: number;
  d31to90: number;
  d91to180: number;
  d181to365: number;
  d365more: number;
} {
  const result = {
    d0to1: 0,
    d2to7: 0,
    d8to30: 0,
    d31to90: 0,
    d91to180: 0,
    d181to365: 0,
    d365more: 0,
  };
  for (const b of buckets) {
    switch (b.bucket) {
      case '1d':
        result.d0to1 += b.pct;
        break;
      case '2-7d':
        result.d2to7 += b.pct;
        break;
      case '8-30d':
        result.d8to30 += b.pct;
        break;
      case '31-90d':
        result.d31to90 += b.pct;
        break;
      case '91-180d':
        result.d91to180 += b.pct;
        break;
      case '181-365d':
        result.d181to365 += b.pct;
        break;
      case '>365d':
        result.d365more += b.pct;
        break;
    }
  }
  return result;
}

/**
 * Build InvestorGroups from investor type breakdown. Maps internal types to ESMA
 * InvestorGroupType codes and ensures rates sum to 100%.
 * ESMA codes: BANK, OCIU, INSC, PFND, OTHR, HHLD, NONE, UNKN
 */
function buildInvestorGroups(
  byType: Array<{ investor_type: string; percentage_of_nav: number }>
): Array<{ type: string; rate: number }> {
  const groups = new Map<string, number>();
  for (const t of byType) {
    const lower = t.investor_type.toLowerCase();
    let esmaType: string;
    if (lower === 'professional' || lower === 'institutional')
      esmaType = 'PFND';
    else if (lower === 'well_informed' || lower === 'semi_professional')
      esmaType = 'PFND';
    else if (lower === 'bank' || lower === 'credit_institution')
      esmaType = 'BANK';
    else if (lower === 'insurance' || lower === 'pension') esmaType = 'INSC';
    else if (lower === 'retail' || lower === 'private') esmaType = 'HHLD';
    else if (lower === 'fund' || lower === 'ciu' || lower === 'ucits')
      esmaType = 'OCIU';
    else if (lower === 'unknown') esmaType = 'UNKN';
    else esmaType = 'OTHR';
    groups.set(esmaType, (groups.get(esmaType) ?? 0) + t.percentage_of_nav);
  }
  // Ensure at least one group exists and rates sum to 100%
  if (groups.size === 0) groups.set('UNKN', 100);
  const sum = Array.from(groups.values()).reduce((a, b) => a + b, 0);
  if (sum > 0 && Math.abs(sum - 100) > 0.01) {
    // Add residual to HHLD (retail) to balance, or create it
    const residual = 100 - sum;
    groups.set('HHLD', (groups.get('HHLD') ?? 0) + residual);
  }
  return Array.from(groups.entries())
    .map(([type, rate]) => ({ type, rate: Math.max(rate, 0) }))
    .filter((g) => g.rate > 0 || g.type === 'HHLD');
}

/**
 * Normalize leverage ratio to ESMA percentage (gross_assets / NAV * 100).
 * DB stores values in three formats:
 *   - >= 100: already a percentage (112.50 = 112.50%)
 *   - >= 1.0 and < 100: full ratio (1.15 = 115%)
 *   - < 1.0: additional leverage fraction above 1x (0.08 = 8% additional → 108%)
 * ESMA minimum is always 100% (no fund has exposure below its NAV).
 */
function normalizeLeverageRate(value: number | null): number {
  if (value == null) return 100;
  // Already a percentage (e.g. 112.50 from DB) — pass through
  if (value >= 100) return value;
  // If < 1.0, treat as additional leverage fraction: 0.08 → 1.08 → 108%
  const ratio = value < 1.0 ? 1 + value : value;
  return Math.max(ratio * 100, 100);
}

/**
 * Derive TypicalPositionSize for PE funds from average position value.
 * ESMA Annex II Table 4: V_SMALL (<5M), SMALL (5-25M), LOW_MID_MKT (25-150M),
 * UP_MID_MKT (150-500M), L_CAP (500M-1B), M_CAP (>1B)
 */
function deriveTypicalPositionSize(
  totalNavEur: number,
  positionCount: number
): string {
  const avgPosition = positionCount > 0 ? totalNavEur / positionCount : 0;
  if (avgPosition >= 1_000_000_000) return 'M_CAP';
  if (avgPosition >= 500_000_000) return 'L_CAP';
  if (avgPosition >= 150_000_000) return 'UP_MID_MKT';
  if (avgPosition >= 25_000_000) return 'LOW_MID_MKT';
  if (avgPosition >= 5_000_000) return 'SMALL';
  return 'V_SMALL';
}

/**
 * Derive AIFReportingCode from fund characteristics per ESMA Annex II Table 9.
 * Simplified mapping covering the most common codes for EU AIFs.
 */
function deriveAIFReportingCode(
  id: AnnexIVReport['aif_identification'],
  aumEur: number,
  lev: AnnexIVReport['leverage'],
  periodType: string
): string {
  const isEEA = isEEADomicile(id.domicile);
  // A fund is leveraged when commitment method ratio exceeds 1.0 (100% of NAV).
  // Values < 1.0 are additional fractions (0.08 = 8% above NAV = 108%), but this is
  // still considered unleveraged for reporting code purposes per AIFMD definition.
  const isLeveraged =
    lev.commitment_method != null && lev.commitment_method > 1.0;
  const isQuarterly = periodType.startsWith('Q');
  const isHalfYearly = periodType.startsWith('H');

  if (isEEA) {
    if (isQuarterly) {
      return isLeveraged ? '29' : '32';
    }
    if (isHalfYearly) {
      if (aumEur >= 500_000_000) return isLeveraged ? '20' : '23';
      return isLeveraged ? '11' : '14';
    }
    // Yearly
    return isLeveraged ? '29' : '32';
  }
  // Non-EEA, marketed in Union (assume marketed)
  if (isQuarterly) return isLeveraged ? '30' : '33';
  if (isHalfYearly) {
    if (aumEur >= 500_000_000) return isLeveraged ? '21' : '24';
    return isLeveraged ? '12' : '15';
  }
  return isLeveraged ? '30' : '33';
}

/**
 * AIFM-level aggregate XML: wraps multiple AIF reports.
 * Produces separate AIFRecordInfo for each fund within one AIFReportingInfo.
 */
export function serializeAggregateAnnexIVToXml(
  reports: AnnexIVReport[]
): string {
  if (reports.length === 0) return '';

  const first = reports[0];
  const id = first.aif_identification;
  const memberState = mapDomicileToMemberState(id.domicile);
  const creationDateTime = first.generated_at || new Date().toISOString();

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<AIFReportingInfo ReportingMemberState="${escapeXml(memberState)}" Version="1.2" CreationDateAndTime="${escapeXml(creationDateTime)}" xsi:noNamespaceSchemaLocation="AIFMD_DATAIF_V1.2.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`
  );

  for (const report of reports) {
    // Extract the single AIFRecordInfo content (strip the root wrapper)
    const fullXml = serializeAnnexIVToXml(report);
    const startIdx = fullXml.indexOf('<AIFRecordInfo>');
    const endIdx =
      fullXml.indexOf('</AIFRecordInfo>') + '</AIFRecordInfo>'.length;
    if (startIdx >= 0 && endIdx > startIdx) {
      lines.push(fullXml.substring(startIdx, endIdx));
    }
  }

  lines.push('</AIFReportingInfo>');
  return lines.join('\n');
}
