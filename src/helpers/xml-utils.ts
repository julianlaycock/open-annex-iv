/**
 * XML utility functions for AIFMD Annex IV serialization.
 */

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function tag(name: string, value: string | number | boolean | null | undefined, attrs?: Record<string, string>): string {
  if (value === null || value === undefined) return `<${name}/>`;
  const attrStr = attrs ? ' ' + Object.entries(attrs).map(([k, v]) => `${k}="${escapeXml(v)}"`).join(' ') : '';
  return `<${name}${attrStr}>${escapeXml(String(value))}</${name}>`;
}
