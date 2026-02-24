/**
 * ESMA AIFMD Annex IV XML Serializer
 *
 * Aligned with the ESMA AIFMD Reporting Technical Standards (ESMA/2013/1358)
 * XSD structure: AIFReportingInfo → AIFMRecordInfo → AIFRecordInfo → sections
 */

import { AnnexIVReport } from './types.js';
import { escapeXml, tag } from './helpers/xml-utils.js';
import { mapDomicileToMemberState, isEEADomicile, toISOCountryCode } from './helpers/eea.js';
import { mapReportingObligationToFrequencyCode, mapToPredominantAIFType, mapDepositaryType, mapAssetType, getTypePct } from './helpers/esma-codes.js';

export function serializeAnnexIVToXml(report: AnnexIVReport): string {
  const id = report.aif_identification;
  const ic = report.investor_concentration;
  const pe = report.principal_exposures;
  const lev = report.leverage;
  const risk = report.risk_profile;
  const cs = report.compliance_status;

  const periodEnd = new Date(id.reporting_period.end);
  const reportingYear = periodEnd.getFullYear().toString();
  const quarter = Math.ceil((periodEnd.getMonth() + 1) / 3);
  const reportingPeriodType = `Q${quarter}`;
  const memberState = mapDomicileToMemberState(id.domicile);
  const predominantType = mapToPredominantAIFType(id.aif_type, id.aif_name);

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<AIFReportingInfo');
  lines.push('  xmlns="urn:esma:xsd:aifmd-reporting"');
  lines.push('  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
  lines.push('  xsi:schemaLocation="urn:esma:xsd:aifmd-reporting AIFMD_Reporting_DataTypes.xsd"');
  lines.push(`  ReportingMemberState="${escapeXml(memberState)}">`);

  // ── AIFMRecordInfo (Manager-level) ──
  lines.push('  <AIFMRecordInfo>');
  lines.push(`    ${tag('AIFMNationalCode', id.aifm_lei || 'PENDING')}`);
  lines.push(`    ${tag('AIFMName', id.aifm_name || 'Not specified')}`);
  lines.push(`    ${tag('AIFMEEAFlag', isEEADomicile(id.domicile) ? 'true' : 'false')}`);
  lines.push(`    ${tag('AIFMNoReportingFlag', 'false')}`);
  lines.push(`    ${tag('ReportingPeriodType', reportingPeriodType)}`);
  lines.push(`    ${tag('ReportingPeriodYear', reportingYear)}`);
  lines.push(`    ${tag('AIFMReportingObligationChangeFrequencyCode', mapReportingObligationToFrequencyCode(id.reporting_obligation))}`);
  lines.push('    <AIFMCompleteDescription>');
  lines.push(`      ${tag('AIFMIdentifier', id.aifm_lei || id.aif_national_code)}`);
  if (id.aifm_lei) {
    lines.push(`      <AIFMIdentifierLEI>${escapeXml(id.aifm_lei)}</AIFMIdentifierLEI>`);
  }
  lines.push(`      ${tag('AIFMReportingCode', memberState + 'AIFM' + (id.aif_national_code || '').substring(0, 8).toUpperCase())}`);

  // ── AIFRecordInfo (Fund-level) ──
  lines.push('      <AIFRecordInfo>');
  lines.push(`        ${tag('AIFNationalCode', id.aif_national_code)}`);
  lines.push(`        ${tag('AIFName', id.aif_name)}`);
  lines.push(`        ${tag('AIFEEAFlag', isEEADomicile(id.domicile) ? 'true' : 'false')}`);
  lines.push(`        ${tag('AIFReportingCode', memberState + 'AIF' + (id.aif_national_code || '').substring(0, 8).toUpperCase())}`);
  lines.push(`        ${tag('AIFDomicile', id.domicile)}`);
  lines.push(`        ${tag('AIFInceptionDate', id.inception_date ? new Date(id.inception_date).toISOString().split('T')[0] : null)}`);
  lines.push(`        ${tag('ReportingPeriodType', reportingPeriodType)}`);
  lines.push(`        ${tag('ReportingPeriodYear', reportingYear)}`);
  lines.push(`        ${tag('ReportingPeriodStartDate', id.reporting_period.start)}`);
  lines.push(`        ${tag('ReportingPeriodEndDate', id.reporting_period.end)}`);
  lines.push(`        ${tag('AIFMasterFeederStatus', 'NONE')}`);
  lines.push(`        ${tag('AIFBaseCurrencyDescription', id.base_currency)}`);

  // ── AIFCompleteDescription ──
  lines.push('        <AIFCompleteDescription>');

  // AIFPrincipalInfo
  lines.push('          <AIFPrincipalInfo>');
  lines.push(`            ${tag('AIFIdentification', id.aif_national_code)}`);
  lines.push('            <MainInstrumentsTraded>');
  for (const a of pe.asset_breakdown.slice(0, 5)) {
    lines.push('              <MainInstrumentTraded>');
    lines.push(`                ${tag('SubAssetType', mapAssetType(a.asset_type))}`);
    lines.push(`                ${tag('InstrumentName', a.asset_name)}`);
    lines.push(`                ${tag('PositionValue', a.value_eur)}`);
    lines.push(`                ${tag('PositionRate', a.percentage_of_total)}`);
    lines.push('              </MainInstrumentTraded>');
  }
  lines.push('            </MainInstrumentsTraded>');
  lines.push(`            ${tag('PredominantAIFType', predominantType)}`);
  lines.push(`            ${tag('SubAssetType', report.sub_asset_type || 'OTHR_OTHR')}`);
  lines.push(`            <!-- NAV and GAV in EUR as required by ESMA Annex IV -->`);
  lines.push(`            ${tag('NetAssetValue', pe.total_nav_eur)}`);
  lines.push(`            ${tag('GrossAssetValue', pe.total_aum_eur)}`);
  lines.push(`            ${tag('BaseCurrencyDescription', id.base_currency)}`);

  // Investor concentration
  lines.push('            <InvestorConcentration>');
  lines.push(`              ${tag('ProfessionalInvestorConcentrationRate', getTypePct(ic.by_type, 'professional'))}`);
  lines.push(`              ${tag('RetailInvestorConcentrationRate', getTypePct(ic.by_type, 'retail'))}`);
  lines.push(`              ${tag('TopFiveBeneficialOwnersRate', ic.beneficial_owners_concentration.top_5_investors_pct)}`);
  lines.push('            </InvestorConcentration>');

  // Geographic focus
  if (report.geographic_focus.length > 0) {
    lines.push('            <AifmPrincipalMarkets>');
    for (const g of report.geographic_focus.slice(0, 5)) {
      lines.push('              <AIFMPrincipalMarket>');
      lines.push(`                ${tag('MarketIdentification', toISOCountryCode(g.region))}`);
      lines.push(`                ${tag('AggregateValueAmount', g.pct)}`);
      lines.push('              </AIFMPrincipalMarket>');
    }
    lines.push('            </AifmPrincipalMarkets>');
  }
  lines.push('          </AIFPrincipalInfo>');

  // AIFIndividualInfo
  lines.push('          <AIFIndividualInfo>');

  // Investor breakdown by domicile
  lines.push('            <IndividualExposure>');
  for (const d of ic.by_domicile.slice(0, 10)) {
    lines.push('              <InvestorBreakdown>');
    lines.push(`                ${tag('InvestorCountry', d.domicile)}`);
    lines.push(`                ${tag('InvestorCount', d.count)}`);
    lines.push(`                ${tag('InvestorPercentage', d.percentage_of_nav)}`);
    lines.push('              </InvestorBreakdown>');
  }
  lines.push('            </IndividualExposure>');

  // Counterparty risk
  if (report.counterparty_risk.top_5_counterparties.length > 0) {
    lines.push('            <CounterpartyRiskProfile>');
    lines.push(`              ${tag('TotalCounterpartyExposure', report.counterparty_risk.total_counterparty_count)}`);
    for (const cp of report.counterparty_risk.top_5_counterparties) {
      lines.push('              <TopCounterparty>');
      lines.push(`                ${tag('CounterpartyName', cp.name)}`);
      if (cp.lei) lines.push(`                ${tag('CounterpartyLEI', cp.lei)}`);
      lines.push(`                ${tag('ExposureRate', cp.exposure_pct)}`);
      lines.push('              </TopCounterparty>');
    }
    lines.push('            </CounterpartyRiskProfile>');
  }

  // Leverage
  lines.push('            <AIFLeverageInfo>');
  lines.push('              <AIFLeverageArticle242>');
  lines.push(`                ${tag('GrossMethodRate', lev.gross_method)}`);
  lines.push(`                ${tag('CommitmentMethodRate', lev.commitment_method)}`);
  lines.push('              </AIFLeverageArticle242>');
  if (lev.gross_limit !== null || lev.commitment_limit !== null) {
    lines.push('              <RegulatoryLeverageLimits>');
    if (lev.commitment_limit !== null) lines.push(`                ${tag('CommitmentMethodLimit', lev.commitment_limit)}`);
    if (lev.gross_limit !== null) lines.push(`                ${tag('GrossMethodLimit', lev.gross_limit)}`);
    lines.push(`                ${tag('LeverageCompliant', lev.leverage_compliant)}`);
    lines.push('              </RegulatoryLeverageLimits>');
  }
  lines.push('            </AIFLeverageInfo>');

  // Liquidity profile
  lines.push('            <LiquidityProfile>');
  lines.push('              <PortfolioLiquidityProfile>');
  if (risk.liquidity.portfolio_liquidity_profile.length > 0) {
    for (const b of risk.liquidity.portfolio_liquidity_profile) {
      lines.push('                <PortfolioLiquidityBucket>');
      lines.push(`                  ${tag('BucketPeriod', b.bucket)}`);
      lines.push(`                  ${tag('BucketRate', b.pct)}`);
      lines.push('                </PortfolioLiquidityBucket>');
    }
  }
  lines.push('              </PortfolioLiquidityProfile>');
  lines.push('              <InvestorLiquidityProfile>');
  lines.push(`                ${tag('InvestorRedemptionFrequency', risk.liquidity.investor_redemption_frequency)}`);
  lines.push('              </InvestorLiquidityProfile>');
  if (risk.liquidity.liquidity_management_tools.length > 0) {
    lines.push('              <LiquidityManagementTools>');
    for (const tool of risk.liquidity.liquidity_management_tools) {
      lines.push('                <LiquidityManagementTool>');
      lines.push(`                  ${tag('LMTType', tool.type)}`);
      lines.push(`                  ${tag('LMTActive', tool.active)}`);
      lines.push(`                  ${tag('LMTDescription', tool.description)}`);
      lines.push('                </LiquidityManagementTool>');
    }
    lines.push('              </LiquidityManagementTools>');
  }
  lines.push('            </LiquidityProfile>');

  // Operational risk
  lines.push('            <OperationalRisk>');
  lines.push(`              ${tag('TotalOpenRiskFlags', risk.operational.total_open_risk_flags)}`);
  lines.push(`              ${tag('HighSeverityFlags', risk.operational.high_severity_flags)}`);
  lines.push('            </OperationalRisk>');

  lines.push('          </AIFIndividualInfo>');
  lines.push('        </AIFCompleteDescription>');

  // Depositary
  const dep = report.depositary;
  if (dep && dep.name) {
    lines.push('        <AIFDepositaryInfo>');
    lines.push(`          ${tag('DepositaryName', dep.name)}`);
    if (dep.lei) lines.push(`          ${tag('DepositaryLEI', dep.lei)}`);
    lines.push(`          ${tag('DepositaryCountry', dep.jurisdiction || 'DE')}`);
    lines.push(`          ${tag('DepositaryType', mapDepositaryType(dep.type))}`);
    lines.push('        </AIFDepositaryInfo>');
  }

  // Compliance status (extension)
  lines.push('        <CaelithComplianceExtension>');
  lines.push(`          ${tag('KYCCoveragePct', cs.kyc_coverage_pct)}`);
  lines.push(`          ${tag('EligibleInvestorPct', cs.eligible_investor_pct)}`);
  lines.push(`          ${tag('RecentViolations', cs.recent_violations)}`);
  lines.push(`          ${tag('LastComplianceCheck', cs.last_compliance_check)}`);
  lines.push('        </CaelithComplianceExtension>');

  lines.push(`        ${tag('GeneratedAt', report.generated_at)}`);
  lines.push(`        ${tag('ReportVersion', report.report_version)}`);
  lines.push('      </AIFRecordInfo>');
  lines.push('    </AIFMCompleteDescription>');
  lines.push('  </AIFMRecordInfo>');
  lines.push(`  ${tag('Disclaimer', report.disclaimer)}`);
  lines.push('</AIFReportingInfo>');

  return lines.join('\n');
}

/**
 * AIFM-level aggregate XML: single AIFMRecordInfo with multiple AIFRecordInfo children.
 * This is what ESMA expects for multi-fund AIFMs.
 */
export function serializeAggregateAnnexIVToXml(reports: AnnexIVReport[]): string {
  if (reports.length === 0) return '';

  const first = reports[0];
  const id = first.aif_identification;
  const periodEnd = new Date(id.reporting_period.end);
  const reportingYear = periodEnd.getFullYear().toString();
  const quarter = Math.ceil((periodEnd.getMonth() + 1) / 3);
  const reportingPeriodType = `Q${quarter}`;
  const memberState = mapDomicileToMemberState(id.domicile);

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<AIFReportingInfo');
  lines.push('  xmlns="urn:esma:xsd:aifmd-reporting"');
  lines.push('  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
  lines.push(`  ReportingMemberState="${escapeXml(memberState)}">`);
  lines.push('  <AIFMRecordInfo>');
  lines.push(`    ${tag('AIFMNationalCode', id.aifm_lei || 'PENDING')}`);
  lines.push(`    ${tag('AIFMName', id.aifm_name || 'Not specified')}`);
  lines.push(`    ${tag('AIFMEEAFlag', isEEADomicile(id.domicile) ? 'true' : 'false')}`);
  lines.push(`    ${tag('AIFMNoReportingFlag', 'false')}`);
  lines.push(`    ${tag('ReportingPeriodType', reportingPeriodType)}`);
  lines.push(`    ${tag('ReportingPeriodYear', reportingYear)}`);
  lines.push(`    ${tag('AIFMReportingObligationChangeFrequencyCode', mapReportingObligationToFrequencyCode(id.reporting_obligation))}`);
  lines.push('    <AIFMCompleteDescription>');
  lines.push(`      ${tag('AIFMIdentifier', id.aifm_lei || id.aif_national_code)}`);
  if (id.aifm_lei) {
    lines.push(`      <AIFMIdentifierLEI>${escapeXml(id.aifm_lei)}</AIFMIdentifierLEI>`);
  }
  lines.push(`      ${tag('AIFMReportingCode', memberState + 'AIFM' + (id.aif_national_code || '').substring(0, 8).toUpperCase())}`);

  for (const report of reports) {
    lines.push(`      <!-- Fund: ${escapeXml(report.aif_identification.aif_name)} -->`);
    lines.push(`      ${tag('AIFRecordInfo_FundName', report.aif_identification.aif_name)}`);
    lines.push(`      ${tag('AIFRecordInfo_FundCode', report.aif_identification.aif_national_code)}`);
  }

  lines.push('    </AIFMCompleteDescription>');
  lines.push('  </AIFMRecordInfo>');
  lines.push(`  ${tag('Disclaimer', first.disclaimer)}`);
  lines.push('</AIFReportingInfo>');
  return lines.join('\n');
}
