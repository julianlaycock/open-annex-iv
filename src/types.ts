/**
 * AIFMD Annex IV Report Types
 *
 * TypeScript interfaces representing the data structure required for
 * ESMA AIFMD Annex IV (Article 24) regulatory reporting.
 */

export interface LiquidityManagementTool {
  type: 'redemption_gate' | 'notice_period' | 'redemption_fee' | 'swing_pricing' | 'anti_dilution_levy' | 'side_pocket' | 'redemption_in_kind' | 'suspension';
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
    }>;
  };

  depositary: {
    name: string | null;
    lei: string | null;
    jurisdiction: string | null;
    type: string | null;
  };

  sub_asset_type: string;

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

  generated_at: string;
  report_version: '1.0';
  disclaimer: string;
}
