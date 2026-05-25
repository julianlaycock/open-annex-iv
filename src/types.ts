/**
 * AIFMD Annex IV Report Types
 *
 * TypeScript interfaces representing the data structure required for
 * ESMA AIFMD Annex IV (Article 24) regulatory reporting.
 */

/**
 * Liquidity management tools harmonised under AIFMD Annex V (as inserted by
 * Annex II of Directive (EU) 2024/927). The 9-item closed list is:
 *   (1) suspension                       → 'suspension'
 *   (2) redemption gate                  → 'redemption_gate'
 *   (3) extension of notice periods      → 'notice_period'
 *   (4) redemption fee                   → 'redemption_fee'
 *   (5) swing pricing                    → 'swing_pricing'
 *   (6) dual pricing                     → 'dual_pricing'
 *   (7) anti-dilution levy               → 'anti_dilution_levy'
 *   (8) redemption in kind               → 'redemption_in_kind'
 *   (9) side pockets                     → 'side_pocket'
 *
 * Art 16(2b) (open-ended AIFs): select ≥2 from points 2–8, with the
 * carve-out that a selection of points 5 + 6 alone is invalid. Side pockets
 * (point 9) must be available as a last-resort tool. See lmt-validator-service.
 */
export type AnnexVLmtType =
  | 'suspension'
  | 'redemption_gate'
  | 'notice_period'
  | 'redemption_fee'
  | 'swing_pricing'
  | 'dual_pricing'
  | 'anti_dilution_levy'
  | 'redemption_in_kind'
  | 'side_pocket';

export interface LiquidityManagementTool {
  type: AnnexVLmtType;
  description: string;
  threshold_pct?: number;
  active: boolean;
}

export interface LiquidityBucket {
  bucket: '1d' | '2-7d' | '8-30d' | '31-90d' | '91-180d' | '181-365d' | '>365d';
  pct: number;
}

export interface GeographicExposure {
  region: string;
  pct: number;
}

export interface CounterpartyExposure {
  name: string;
  lei?: string;
  exposure_pct: number;
}

export interface ShareClassInfo {
  national_code: string;
  name: string;
  lei?: string;
  isin?: string;
  cusip?: string;
  sedol?: string;
}

export interface MonthlyRates {
  january?: number;
  february?: number;
  march?: number;
  april?: number;
  may?: number;
  june?: number;
  july?: number;
  august?: number;
  september?: number;
  october?: number;
  november?: number;
  december?: number;
}

export interface HistoricalRiskProfile {
  gross_investment_returns?: MonthlyRates;
  net_investment_returns?: MonthlyRates;
  nav_change?: MonthlyRates;
  subscriptions?: MonthlyRates;
  redemptions?: MonthlyRates;
}

export interface TradingClearingMechanism {
  securities_regulated_market_pct?: number;
  securities_otc_pct?: number;
  derivatives_regulated_market_pct?: number;
  derivatives_otc_pct?: number;
  derivatives_ccp_cleared_pct?: number;
  derivatives_bilateral_pct?: number;
  repo_ccp_pct?: number;
  repo_bilateral_pct?: number;
  repo_triparty_pct?: number;
}

export interface BorrowingSource {
  name: string;
  lei?: string;
  amount: number;
}

/**
 * Market identification for an instrument or exposure.
 * Used to populate MarketCodeType + MarketCode per ISO 10383.
 */
export interface MarketIdentification {
  /** ISO 10383 MIC code (e.g. 'XETR', 'XFRA') or ESMA special code ('OTC', 'XXX', 'NOT') */
  mic?: string;
  /** Whether this instrument is traded OTC (used as fallback if no MIC provided) */
  is_otc?: boolean;
}

export interface PrimeBrokerInfo {
  name: string;
  lei?: string;
}

export interface RiskMeasure {
  type:
    | 'NET_EQTY_DELTA'
    | 'NET_DV01'
    | 'NET_CS01'
    | 'VAR'
    | 'NET_FX_DELTA'
    | 'NET_CTY_DELTA'
    | 'VEGA_EXPO';
  /** Absolute value for NET_EQTY_DELTA, NET_FX_DELTA, NET_CTY_DELTA */
  value?: number;
  /** Bucket values for NET_DV01, NET_CS01 */
  bucket_values?: { lt5y: number; y5to15: number; gt15y: number };
  /** VaR value (percentage) and method for VAR */
  var_value?: number;
  var_method?: 'HISTO' | 'CARLO' | 'PARAM';
  /** Vega exposure values for VEGA_EXPO */
  vega_values?: { current: number; lower: number; higher: number };
}

export interface CurrencyExposure {
  currency: string;
  long_value_eur: number;
  short_value_eur?: number;
}

export interface StressTestResults {
  article_15: string;
  article_16: string;
}

export interface AnnexIVReport {
  aif_identification: {
    reporting_period: { start: string; end: string };
    aif_name: string;
    aif_national_code: string;
    aif_type: string;
    domicile: string;
    inception_date: string | null;
    aifm_name: string | null;
    aifm_lei: string | null;
    reporting_obligation: 'Article 24(1)' | 'Article 24(2)' | 'Article 24(4)';
    base_currency: string;
  };

  investor_concentration: {
    total_investors: number;
    by_type: Array<{
      investor_type: string;
      count: number;
      percentage_of_nav: number;
    }>;
    by_domicile: Array<{
      domicile: string;
      count: number;
      percentage_of_nav: number;
    }>;
    beneficial_owners_concentration: {
      top_5_investors_pct: number;
    };
  };

  principal_exposures: {
    total_aum_units: number;
    total_allocated_units: number;
    total_aum_eur: number;
    total_nav_eur: number;
    utilization_pct: number;
    asset_breakdown: Array<{
      asset_name: string;
      asset_type: string;
      units: number;
      value_eur: number;
      percentage_of_total: number;
      /** Optional ISO 10383 market identification for this instrument */
      market?: MarketIdentification;
    }>;
  };

  depositary: {
    name: string | null;
    lei: string | null;
    jurisdiction: string | null;
    type: string | null;
  };

  sub_asset_type: string;

  /** Whether the fund is open-ended (accepts subscriptions/redemptions) or closed-ended */
  open_ended: boolean;

  leverage: {
    commitment_method: number | null;
    gross_method: number | null;
    commitment_limit: number | null;
    gross_limit: number | null;
    leverage_compliant: boolean;
  };

  risk_profile: {
    liquidity: {
      investor_redemption_frequency: string;
      portfolio_liquidity_profile: LiquidityBucket[];
      liquidity_management_tools: LiquidityManagementTool[];
    };
    operational: {
      total_open_risk_flags: number;
      high_severity_flags: number;
    };
  };

  geographic_focus: GeographicExposure[];

  counterparty_risk: {
    top_5_counterparties: CounterpartyExposure[];
    total_counterparty_count: number;
  };

  compliance_status: {
    kyc_coverage_pct: number;
    eligible_investor_pct: number;
    recent_violations: number;
    last_compliance_check: string;
  };

  /** Top 3 principal markets where the AIF trades (ISO 10383 MIC codes) */
  principal_markets?: Array<{
    mic: string;
    aggregated_value_eur?: number;
  }>;
  share_classes?: ShareClassInfo[];
  historical_risk_profile?: HistoricalRiskProfile;
  trading_clearing?: TradingClearingMechanism;
  borrowing_sources?: BorrowingSource[];
  prime_brokers?: PrimeBrokerInfo[];
  risk_measures?: RiskMeasure[];
  currency_exposures?: CurrencyExposure[];
  stress_tests?: StressTestResults;

  generated_at: string;
  report_version: '1.0';
  /**
   * Schema version discriminator for the AIFMD II Art 24 expansion (W-5 of
   * the AIFMD II compliance roadmap).
   *   • 'aifmd_i_v1.2'  — the AIFMD I dataset, encoded against ESMA
   *     AIFMD_DATAIF_V1.2.xsd (CDR 231/2013 Annex IV).
   *   • 'aifmd_ii_v1.0' — the AIFMD II expansion (Art 24 as amended;
   *     activated per-NCA when the Art 24(5a)/(5b) RTS/ITS take effect).
   *
   * Until the per-NCA effective date the value is 'aifmd_i_v1.2'. Callers
   * MUST gate any AIFMD II-only fields on this discriminator.
   */
  schema_version: 'aifmd_i_v1.2' | 'aifmd_ii_v1.0';

  // ── AIFMD II Art 24 expansion (optional, populated only when schema_version === 'aifmd_ii_v1.0') ──

  /**
   * Granular delegation block — AIFMD Art 24 as amended introduces granular
   * delegation reporting (per-delegate identity, delegated activities,
   * percentage of assets under delegation, monitoring mechanisms,
   * sub-delegation chain, commencement and expiry dates).
   */
  aifmd_ii_delegation_block?: Array<{
    delegate_name: string;
    delegate_lei: string | null;
    delegate_jurisdiction: string;
    function_delegated: string;
    pct_assets_under_delegation?: number;
    oversight_mechanism: string;
    sub_delegation_chain_depth: number;
    start_date: string;
    end_date: string | null;
  }>;

  /**
   * Member States in which units of the AIF are actually marketed
   * (ISO 3166-1 alpha-2). Required under amended Art 24.
   */
  aifmd_ii_marketing_member_states?: string[];

  /** Aggregated LMT activation history for the reporting period. */
  aifmd_ii_lmt_activation_history?: Array<{
    lmt_type: string; // Annex V identifier
    annex_v_point: number; // 1–9
    action: 'activation' | 'deactivation';
    effective_at: string; // ISO date
    rationale: string;
    nca_notification_ref: string | null;
  }>;

  /**
   * Cross-reference to the consolidated Art 23(1)(ia) fee-list disclosure
   * document version that was current during the reporting period.
   */
  aifmd_ii_art23_fee_list_doc_version?: string;

  disclaimer: string;
}
