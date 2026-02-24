/**
 * ESMA code mapping functions for AIFMD Annex IV reporting.
 */

/**
 * Map reporting obligation (Article reference) to ESMA frequency code.
 * Art. 24(1): yearly ("Y"), Art. 24(2): half-yearly ("H"), Art. 24(4): quarterly ("Q")
 */
export function mapReportingObligationToFrequencyCode(obligation: string): string {
  if (obligation.includes('24(4)')) return 'Q';
  if (obligation.includes('24(2)')) return 'H';
  return 'Y';
}

/**
 * Map fund type/name to ESMA PredominantAIFType code.
 * Strategy/name keywords take precedence over legal form.
 */
export function mapToPredominantAIFType(legalForm: string, fundName?: string): string {
  const nameAndForm = `${fundName || ''} ${legalForm || ''}`.toLowerCase();
  if (nameAndForm.includes('immobilien') || nameAndForm.includes('real estate') || nameAndForm.includes('reit') || nameAndForm.includes('property')) return 'REST';
  if (nameAndForm.includes('hedge')) return 'HFND';
  if (nameAndForm.includes('private equity')) return 'PEQF';
  if (nameAndForm.includes('fund of fund') || nameAndForm.includes('fof') || nameAndForm.includes('dachfonds')) return 'FOFS';
  if (nameAndForm.includes('venture')) return 'VCAP';
  if (nameAndForm.includes('infrastructure') || nameAndForm.includes('infrastruktur')) return 'INFR';
  if (nameAndForm.includes('commodity') || nameAndForm.includes('rohstoff')) return 'COMF';
  const lower = (legalForm || '').toLowerCase();
  if (lower.includes('pe') && !lower.includes('spezial')) return 'PEQF';
  return 'OTHR';
}

/** Map depositary type to ESMA code. */
export function mapDepositaryType(type: string | null | undefined): string {
  switch (type) {
    case 'credit_institution': return 'CDPS';
    case 'investment_firm': return 'INVF';
    default: return 'OTHR';
  }
}

/** Map asset type string to ESMA SubAssetType code. */
export function mapAssetType(assetType: string): string {
  const lower = (assetType || '').toLowerCase();
  if (lower === 'fund' || lower.includes('share class') || lower.includes('unit class')) return 'SEC_LEQ_IFIN';
  if (lower.includes('equity') || lower.includes('share')) return 'SEC_LEQ_IFIN';
  if (lower.includes('bond') || lower.includes('debt') || lower.includes('fixed')) return 'SEC_CSH_BOND';
  if (lower.includes('derivative') || lower.includes('swap')) return 'DER_EQD_SWPS';
  if (lower.includes('real estate') || lower.includes('property')) return 'PHY_RES_RESD';
  if (lower.includes('cash') || lower.includes('money market')) return 'SEC_CSH_MMKT';
  return 'NTA_NTA_NOTA';
}

/** Get percentage_of_nav for a given investor type from the by_type array. */
export function getTypePct(byType: Array<{ investor_type: string; percentage_of_nav: number }>, type: string): number {
  return byType.find(t => t.investor_type === type)?.percentage_of_nav || 0;
}
