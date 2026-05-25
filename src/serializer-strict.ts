/**
 * Strict Annex IV XML serializer — serialize + XSD-validate + hard-fail.
 *
 * WHY this exists (regression lesson from April 2026):
 *
 *   The non-strict `serializeAnnexIVToXml()` was found emitting a
 *   fabricated `<AIFOpenPrincipleInfo>` element (not in the schema) around
 *   a depositary block that should never have been in AIF-level reporting
 *   at all. The only thing that caught it was a standalone XSD-validation
 *   test that happened to run in CI; the bug would otherwise have
 *   shipped and every NCA submission would have been rejected at
 *   schema ingestion.
 *
 *   This file is the fix: a single entry point that callers use when the
 *   output is actually going to a regulator. It runs XSD validation on
 *   every output and throws a structured error if the result is invalid.
 *
 * WHEN to use which variant:
 *
 *   - `serializeAnnexIVToXml()`      — for tooling, debugging, preview UI,
 *                                      and anywhere a human will eyeball
 *                                      the result before it goes anywhere
 *                                      regulatory.
 *   - `serializeAnnexIVToXmlStrict()` — for any production path that may
 *                                      submit the XML to an NCA or stamp
 *                                      it into a tamper-evident record.
 *                                      The filing pipeline + agentic
 *                                      submission paths MUST use this.
 *
 * If libxmljs2 is not available (e.g. build environment without the
 * C++ toolchain), the validator falls back to pattern-based checks;
 * strict still throws on pattern failures, but callers should ensure
 * libxmljs2 is installed in any production deployment.
 */

import { AnnexIVReport } from './types.js';
import {
  serializeAnnexIVToXml,
  serializeAggregateAnnexIVToXml,
} from './serializer.js';
import { validateAnnexIVXml, type ValidationResult } from './validator.js';

/** Error thrown when the serialised XML fails XSD validation. */
export class AnnexIVSchemaValidationError extends Error {
  public readonly result: ValidationResult;
  public readonly xml: string;

  constructor(result: ValidationResult, xml: string) {
    const firstErrors = result.errors
      .slice(0, 3)
      .map((e) => (e.line ? `line ${e.line}: ${e.message}` : e.message))
      .join('; ');
    const remaining = Math.max(0, result.errors.length - 3);
    const tail = remaining > 0 ? ` (+${remaining} more)` : '';
    super(
      `Annex IV XML failed ${result.method} validation with ${result.errors.length} error(s): ${firstErrors}${tail}`
    );
    this.name = 'AnnexIVSchemaValidationError';
    this.result = result;
    this.xml = xml;
  }
}

/**
 * Serialize an AnnexIVReport to XML, then validate the output against
 * the AIFMD_DATAIF_V1.2 XSD. Throws AnnexIVSchemaValidationError if the
 * output fails validation — callers should treat this as a hard block
 * on NCA submission.
 *
 * The underlying XSD validator is async (dynamic import of libxmljs2),
 * so this function is async even though the pure serialization is sync.
 */
export async function serializeAnnexIVToXmlStrict(
  report: AnnexIVReport
): Promise<string> {
  const xml = serializeAnnexIVToXml(report);
  const result = await validateAnnexIVXml(xml);
  if (!result.valid) {
    throw new AnnexIVSchemaValidationError(result, xml);
  }
  return xml;
}

/**
 * Aggregate (multi-AIF) variant of `serializeAnnexIVToXmlStrict`. Same
 * validation contract.
 */
export async function serializeAggregateAnnexIVToXmlStrict(
  reports: AnnexIVReport[]
): Promise<string> {
  const xml = serializeAggregateAnnexIVToXml(reports);
  const result = await validateAnnexIVXml(xml);
  if (!result.valid) {
    throw new AnnexIVSchemaValidationError(result, xml);
  }
  return xml;
}
