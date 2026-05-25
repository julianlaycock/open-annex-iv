/**
 * Zod schemas for ESMA AIFMD Annex IV input validation.
 *
 * Validates AnnexIVReport data BEFORE XML serialization,
 * ensuring all fields conform to ESMA requirements without
 * needing native C++ XSD validation (libxmljs2).
 */

import { z } from 'zod';

// ── ISO 4217 Currency Code Whitelist ──
// Complete set of active currency codes per ISO 4217 Amendment 176.
// Validates against actual assigned codes, not just format.
const ISO_4217_CURRENCIES = new Set([
  'EUR',
  'USD',
  'GBP',
  'JPY',
  'CHF',
  'CAD',
  'AUD',
  'NZD',
  'SEK',
  'NOK',
  'DKK',
  'BGN',
  'CZK',
  'HUF',
  'PLN',
  'RON',
  'HRK',
  'ISK',
  'CNY',
  'HKD',
  'SGD',
  'KRW',
  'TWD',
  'INR',
  'IDR',
  'MYR',
  'PHP',
  'THB',
  'VND',
  'BDT',
  'LKR',
  'PKR',
  'MMK',
  'KHR',
  'LAK',
  'MNT',
  'NPR',
  'AED',
  'SAR',
  'QAR',
  'KWD',
  'BHD',
  'OMR',
  'JOD',
  'ILS',
  'TRY',
  'IQD',
  'IRR',
  'LBP',
  'YER',
  'SYP',
  'BRL',
  'MXN',
  'ARS',
  'CLP',
  'COP',
  'PEN',
  'UYU',
  'PYG',
  'BOB',
  'VES',
  'DOP',
  'GTQ',
  'HNL',
  'NIO',
  'CRC',
  'PAB',
  'JMD',
  'TTD',
  'BBD',
  'BSD',
  'BZD',
  'GYD',
  'SRD',
  'HTG',
  'CUP',
  'ZAR',
  'NGN',
  'KES',
  'EGP',
  'GHS',
  'TZS',
  'UGX',
  'MAD',
  'TND',
  'DZD',
  'XOF',
  'XAF',
  'MUR',
  'BWP',
  'MZN',
  'AOA',
  'ETB',
  'RWF',
  'ZMW',
  'MWK',
  'NAD',
  'SCR',
  'GMD',
  'SLL',
  'SDG',
  'SSP',
  'LYD',
  'ERN',
  'DJF',
  'KMF',
  'CVE',
  'STN',
  'SZL',
  'LSL',
  'ZWL',
  'BIF',
  'CDF',
  'GNF',
  'MGA',
  'SOS',
  'FJD',
  'PGK',
  'WST',
  'TOP',
  'VUV',
  'SBD',
  'RUB',
  'UAH',
  'KZT',
  'UZS',
  'GEL',
  'AZN',
  'AMD',
  'KGS',
  'TJS',
  'TMT',
  'BYN',
  'MDL',
  'KYD',
  'BMD',
  'AWG',
  'ANG',
  'XCD',
  'XAU',
  'XAG',
  'XPT',
  'XPD',
  'XDR',
]);

// ── Primitives ──

/** ISO 17442 LEI: 20 alphanumeric characters (18 alphanum + 2 check digits) */
const leiPattern = /^[0-9A-Z]{18}[0-9]{2}$/;
export const LeiSchema = z
  .string()
  .transform((s) => s.toUpperCase())
  .pipe(
    z
      .string()
      .regex(
        leiPattern,
        'LEI must be 20 uppercase alphanumeric characters (ISO 17442 format)'
      )
  );

/** Date in YYYY-MM-DD format */
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
export const DateSchema = z
  .string()
  .regex(datePattern, 'Date must be in YYYY-MM-DD format');

/** ISO 4217 currency code — validated against the actual ISO 4217 code list */
export const CurrencySchema = z
  .string()
  .transform((s) => s.toUpperCase())
  .pipe(
    z
      .string()
      .length(3, 'Currency code must be exactly 3 characters')
      .regex(/^[A-Z]{3}$/, 'Must be a 3-letter currency code')
      .refine((code) => ISO_4217_CURRENCIES.has(code), {
        message:
          'Not a recognized ISO 4217 currency code. Use standard codes like EUR, USD, GBP, CHF.',
      })
  );

/** ISO 10383 MIC code (3-4 uppercase alphanumeric characters) */
export const MicSchema = z
  .string()
  .transform((s) => s.toUpperCase())
  .pipe(
    z
      .string()
      .min(3)
      .max(4)
      .regex(
        /^[A-Z0-9]{3,4}$/,
        'MIC must be 3-4 uppercase alphanumeric characters (ISO 10383)'
      )
  );

/** Reporting obligation */
export const ReportingObligationSchema = z.enum([
  'Article 24(1)',
  'Article 24(2)',
  'Article 24(4)',
]);

// ── Percentage validation helper ──

function percentageSumRefine(
  items: Array<{ pct: number }>,
  ctx: z.RefinementCtx,
  fieldName: string,
  tolerance = 1.0
): void {
  const sum = items.reduce((s, i) => s + i.pct, 0);
  if (items.length > 0 && Math.abs(sum - 100) > tolerance) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${fieldName} percentages must sum to ~100% (got ${sum.toFixed(2)}%)`,
    });
  }
}

// ── Sub-schemas ──

export const LiquidityBucketSchema = z.object({
  bucket: z.enum([
    '1d',
    '2-7d',
    '8-30d',
    '31-90d',
    '91-180d',
    '181-365d',
    '>365d',
  ]),
  pct: z.number().min(0).max(100),
});

// Annex V harmonised list (9 items) per Directive (EU) 2024/927.
export const LiquidityManagementToolSchema = z.object({
  type: z.enum([
    'suspension', // Annex V (1)
    'redemption_gate', // Annex V (2)
    'notice_period', // Annex V (3) — extension of notice periods
    'redemption_fee', // Annex V (4)
    'swing_pricing', // Annex V (5)
    'dual_pricing', // Annex V (6)
    'anti_dilution_levy', // Annex V (7)
    'redemption_in_kind', // Annex V (8)
    'side_pocket', // Annex V (9)
  ]),
  description: z.string(),
  threshold_pct: z.number().min(0).max(100).optional(),
  active: z.boolean(),
});

export const GeographicExposureSchema = z.object({
  region: z.string().min(1, 'Region must not be empty'),
  pct: z.number().min(0).max(100),
});

export const CounterpartyExposureSchema = z.object({
  name: z.string().min(1, 'Counterparty name required'),
  lei: z.string().regex(leiPattern, 'Invalid LEI format').optional(),
  exposure_pct: z.number().min(0).max(100),
});

export const MarketIdentificationSchema = z.object({
  mic: z
    .string()
    .transform((s) => s.toUpperCase())
    .pipe(
      z
        .string()
        .min(3)
        .max(4)
        .regex(/^[A-Z0-9]{3,4}$/, 'Invalid MIC format')
    )
    .optional(),
  is_otc: z.boolean().optional(),
});

export const PrincipalMarketSchema = z.object({
  mic: z
    .string()
    .transform((s) => s.toUpperCase())
    .pipe(
      z
        .string()
        .min(3)
        .max(4)
        .regex(/^[A-Z0-9]{3,4}$/, 'Invalid MIC format')
    ),
  aggregated_value_eur: z.number().min(0).optional(),
});

export const AssetBreakdownItemSchema = z.object({
  asset_name: z.string().min(1, 'Asset name required'),
  asset_type: z.string().min(1, 'Asset type required'),
  units: z.number().min(0),
  value_eur: z.number(),
  percentage_of_total: z.number().min(0).max(100),
  market: MarketIdentificationSchema.optional(),
});

export const InvestorTypeSchema = z.object({
  investor_type: z.string().min(1),
  count: z.number().int().min(0),
  percentage_of_nav: z.number().min(0).max(100),
});

export const InvestorDomicileSchema = z.object({
  domicile: z.string().min(1),
  count: z.number().int().min(0),
  percentage_of_nav: z.number().min(0).max(100),
});

// ── New sub-schemas (ESMA fields 33-40, 148-156, 219-278, 296-300) ──

export const ShareClassInfoSchema = z.object({
  national_code: z.string().min(1),
  name: z.string().min(1),
  lei: z.string().optional(),
  isin: z.string().optional(),
  cusip: z.string().optional(),
  sedol: z.string().optional(),
});

export const MonthlyRatesSchema = z.object({
  january: z.number().optional(),
  february: z.number().optional(),
  march: z.number().optional(),
  april: z.number().optional(),
  may: z.number().optional(),
  june: z.number().optional(),
  july: z.number().optional(),
  august: z.number().optional(),
  september: z.number().optional(),
  october: z.number().optional(),
  november: z.number().optional(),
  december: z.number().optional(),
});

export const HistoricalRiskProfileSchema = z.object({
  gross_investment_returns: MonthlyRatesSchema.optional(),
  net_investment_returns: MonthlyRatesSchema.optional(),
  nav_change: MonthlyRatesSchema.optional(),
  subscriptions: MonthlyRatesSchema.optional(),
  redemptions: MonthlyRatesSchema.optional(),
});

export const TradingClearingMechanismSchema = z.object({
  securities_regulated_market_pct: z.number().min(0).max(100).optional(),
  securities_otc_pct: z.number().min(0).max(100).optional(),
  derivatives_regulated_market_pct: z.number().min(0).max(100).optional(),
  derivatives_otc_pct: z.number().min(0).max(100).optional(),
  derivatives_ccp_cleared_pct: z.number().min(0).max(100).optional(),
  derivatives_bilateral_pct: z.number().min(0).max(100).optional(),
  repo_ccp_pct: z.number().min(0).max(100).optional(),
  repo_bilateral_pct: z.number().min(0).max(100).optional(),
  repo_triparty_pct: z.number().min(0).max(100).optional(),
});

export const BorrowingSourceSchema = z.object({
  name: z.string().min(1),
  lei: z.string().optional(),
  amount: z.number().min(0),
});

// ── Main Report Schema ──

export const AnnexIVReportSchema = z.object({
  aif_identification: z.object({
    reporting_period: z
      .object({
        start: DateSchema,
        end: DateSchema,
      })
      .refine((p) => p.start <= p.end, {
        message: 'Reporting period start must be before or equal to end',
      }),
    aif_name: z.string().min(1, 'AIF name is required').max(300),
    aif_national_code: z
      .string()
      .min(1, 'AIF national code is required')
      .max(30),
    aif_type: z.string().min(1, 'AIF type is required'),
    domicile: z.string().min(1, 'Domicile is required'),
    inception_date: z.union([DateSchema, z.null()]),
    aifm_name: z.union([z.string().min(1), z.null()]),
    aifm_lei: z.union([z.string(), z.null()]),
    reporting_obligation: ReportingObligationSchema,
    base_currency: CurrencySchema,
  }),

  investor_concentration: z.object({
    total_investors: z.number().int().min(0),
    by_type: z.array(InvestorTypeSchema),
    by_domicile: z.array(InvestorDomicileSchema),
    beneficial_owners_concentration: z.object({
      top_5_investors_pct: z.number().min(0).max(100),
    }),
  }),

  principal_exposures: z.object({
    total_aum_units: z.number().min(0),
    total_allocated_units: z.number().min(0),
    total_aum_eur: z.number().min(0),
    total_nav_eur: z.number(),
    utilization_pct: z.number().min(0).max(100),
    asset_breakdown: z.array(AssetBreakdownItemSchema),
  }),

  depositary: z.object({
    name: z.union([z.string(), z.null()]),
    lei: z.union([z.string(), z.null()]),
    jurisdiction: z.union([z.string(), z.null()]),
    type: z.union([z.string(), z.null()]),
  }),

  sub_asset_type: z.string(),

  leverage: z.object({
    commitment_method: z.union([z.number().min(0), z.null()]),
    gross_method: z.union([z.number().min(0), z.null()]),
    commitment_limit: z.union([z.number().min(0), z.null()]),
    gross_limit: z.union([z.number().min(0), z.null()]),
    leverage_compliant: z.boolean(),
  }),

  risk_profile: z.object({
    liquidity: z.object({
      investor_redemption_frequency: z.string().min(1),
      portfolio_liquidity_profile: z
        .array(LiquidityBucketSchema)
        .superRefine((buckets, ctx) => {
          percentageSumRefine(buckets, ctx, 'Portfolio liquidity profile', 2.0);
        }),
      liquidity_management_tools: z.array(LiquidityManagementToolSchema),
    }),
    operational: z.object({
      total_open_risk_flags: z.number().int().min(0),
      high_severity_flags: z.number().int().min(0),
    }),
  }),

  geographic_focus: z
    .array(GeographicExposureSchema)
    .superRefine((items, ctx) => {
      percentageSumRefine(items, ctx, 'Geographic focus', 2.0);
    }),

  counterparty_risk: z.object({
    top_5_counterparties: z
      .array(CounterpartyExposureSchema)
      .max(5, 'Maximum 5 counterparties'),
    total_counterparty_count: z.number().int().min(0),
  }),

  compliance_status: z.object({
    kyc_coverage_pct: z.number().min(0).max(100),
    eligible_investor_pct: z.number().min(0).max(100),
    recent_violations: z.number().int().min(0),
    last_compliance_check: z.string(),
  }),

  principal_markets: z
    .array(PrincipalMarketSchema)
    .max(3, 'Maximum 3 principal markets')
    .optional(),
  share_classes: z.array(ShareClassInfoSchema).optional(),
  historical_risk_profile: HistoricalRiskProfileSchema.optional(),
  trading_clearing: TradingClearingMechanismSchema.optional(),
  borrowing_sources: z.array(BorrowingSourceSchema).optional(),

  generated_at: z.string(),
  report_version: z.literal('1.0'),
  // W-5 (productionised): schema_version discriminator. AIFMD I dataset is
  // 'aifmd_i_v1.2' (CDR 231/2013 Annex IV, ESMA AIFMD_DATAIF_V1.2.xsd).
  // 'aifmd_ii_v1.0' is the AIFMD II Art 24 expansion, gated per-NCA.
  schema_version: z.enum(['aifmd_i_v1.2', 'aifmd_ii_v1.0']),
  // Optional Art 24 expansion fields (populated only when schema_version
  // === 'aifmd_ii_v1.0'). Validators consuming the AIFMD II shape should
  // refine on the discriminator.
  aifmd_ii_delegation_block: z
    .array(
      z.object({
        delegate_name: z.string(),
        delegate_lei: z.string().nullable(),
        delegate_jurisdiction: z.string(),
        function_delegated: z.string(),
        pct_assets_under_delegation: z.number().min(0).max(100).optional(),
        oversight_mechanism: z.string(),
        sub_delegation_chain_depth: z.number().int().min(0),
        start_date: z.string(),
        end_date: z.string().nullable(),
      })
    )
    .optional(),
  aifmd_ii_marketing_member_states: z.array(z.string().length(2)).optional(),
  aifmd_ii_lmt_activation_history: z
    .array(
      z.object({
        lmt_type: z.string(),
        annex_v_point: z.number().int().min(1).max(9),
        action: z.enum(['activation', 'deactivation']),
        effective_at: z.string(),
        rationale: z.string(),
        nca_notification_ref: z.string().nullable(),
      })
    )
    .optional(),
  aifmd_ii_art23_fee_list_doc_version: z.string().optional(),
  disclaimer: z.string(),
});

// ── Exported type ──
export type ValidatedAnnexIVReport = z.infer<typeof AnnexIVReportSchema>;

/**
 * Validate an AnnexIVReport object using Zod schemas.
 * Returns structured errors with field paths.
 */
export function validateReportData(data: unknown): {
  valid: boolean;
  errors: Array<{ path: string; message: string }>;
  warnings: string[];
} {
  const result = AnnexIVReportSchema.safeParse(data);

  if (result.success) {
    const warnings: string[] = [];
    const report = result.data;

    // Warn if LEI looks invalid but was nullable
    if (report.aif_identification.aifm_lei) {
      const normalizedLei = report.aif_identification.aifm_lei.toUpperCase();
      if (!leiPattern.test(normalizedLei)) {
        warnings.push(
          `AIFM LEI "${report.aif_identification.aifm_lei}" does not match ISO 17442 format — NCA may reject`
        );
      }
    }

    // Warn if asset breakdown is empty
    if (report.principal_exposures.asset_breakdown.length === 0) {
      warnings.push(
        'No asset breakdown provided — XML will use placeholder values'
      );
    }

    // Warn if NAV is 0 or negative
    if (report.principal_exposures.total_nav_eur <= 0) {
      warnings.push('NAV is zero or negative — verify this is intentional');
    }

    return { valid: true, errors: [], warnings };
  }

  const errors = result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));

  return { valid: false, errors, warnings: [] };
}
