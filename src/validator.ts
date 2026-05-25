/**
 * XSD Validator for AIFMD Annex IV XML
 *
 * PRIMARY method: Zod-based input validation (works without native dependencies).
 * OPTIONAL enhancement: XSD validation via libxmljs2 (C++ addon) if available.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { validateReportData } from './zod-schemas.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface LibXmlValidationError {
  message?: string;
  line?: number | null;
}

interface LibXmlDocument {
  validate(schema: LibXmlDocument): boolean;
  validationErrors?: LibXmlValidationError[];
}

interface LibXmlModule {
  parseXml(xml: string, options?: { baseUrl?: string }): LibXmlDocument;
}

type LibXmlImport = LibXmlModule & { default?: LibXmlModule };

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ message: string; line?: number | null; path?: string }>;
  warnings: string[];
  method: 'zod' | 'xsd' | 'pattern';
}

let libxmljs: LibXmlModule | null = null;
let xsdDoc: LibXmlDocument | null = null;
let xsdLoadAttempted = false;

async function ensureXsd(): Promise<boolean> {
  if (xsdLoadAttempted) return xsdDoc !== null;
  xsdLoadAttempted = true;

  try {
    const mod = await import('libxmljs2' as string) as unknown as LibXmlImport;
    libxmljs = mod.default ?? mod;

    const schemaDir = resolve(__dirname, '..', 'schema');
    const schemaPath = resolve(schemaDir, 'AIFMD_DATAIF_V1.2.xsd');
    const schemaXml = readFileSync(schemaPath, 'utf-8');
    xsdDoc = libxmljs.parseXml(schemaXml, { baseUrl: schemaDir + '/' });
    return true;
  } catch {
    return false;
  }
}

export function validateAnnexIVData(data: unknown): ValidationResult {
  const result = validateReportData(data);

  return {
    valid: result.valid,
    errors: result.errors.map((error) => ({ message: error.message, path: error.path })),
    warnings: result.warnings,
    method: 'zod',
  };
}

export async function validateAnnexIVXml(xml: string): Promise<ValidationResult> {
  if (!xml || typeof xml !== 'string' || xml.trim().length === 0) {
    return {
      valid: false,
      errors: [{ message: 'Empty or missing XML input' }],
      warnings: [],
      method: 'pattern',
    };
  }

  const hasXsd = await ensureXsd();
  if (hasXsd) {
    return validateWithXsd(xml);
  }

  const warnings = [
    'XSD engine unavailable - using pattern-based validation (consider installing libxmljs2)',
  ];
  return validateWithPatterns(xml, warnings);
}

function validateWithXsd(xml: string): ValidationResult {
  const errors: Array<{ message: string; line?: number | null }> = [];
  const warnings: string[] = [];

  if (!libxmljs || !xsdDoc) {
    return validateWithPatterns(xml, warnings);
  }

  let xmlDoc: LibXmlDocument;
  try {
    xmlDoc = libxmljs.parseXml(xml);
  } catch (error: unknown) {
    return {
      valid: false,
      errors: [{ message: `Malformed XML: ${error instanceof Error ? error.message : String(error)}` }],
      warnings: [],
      method: 'xsd',
    };
  }

  const isValid = xmlDoc.validate(xsdDoc);
  if (!isValid) {
    for (const validationError of xmlDoc.validationErrors ?? []) {
      errors.push({
        message: String(validationError.message ?? 'Unknown validation error').trim(),
        line: validationError.line ?? null,
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings, method: 'xsd' };
}

function validateWithPatterns(xml: string, warnings: string[]): ValidationResult {
  const errors: Array<{ message: string; line?: number | null }> = [];

  if (!xml.startsWith('<?xml')) {
    errors.push({ message: 'Missing XML declaration' });
  }

  if (!xml.includes('<AIFReportingInfo')) {
    errors.push({ message: 'Missing root element <AIFReportingInfo>' });
  }

  if (!xml.includes('AIFMD_DATAIF_V1.2.xsd') && !xml.includes('noNamespaceSchemaLocation')) {
    warnings.push('No XSD schema reference found - NCAs may reject this');
  }

  for (const element of ['AIFMNationalCode', 'AIFNationalCode', 'ReportingPeriodStartDate', 'ReportingPeriodEndDate', 'AIFName']) {
    if (!xml.includes(`<${element}>`)) {
      warnings.push(`Missing element <${element}> - may be required by your NCA`);
    }
  }

  return { valid: errors.length === 0, errors, warnings, method: 'pattern' };
}