# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.x     | Yes                |
| < 1.0   | No                 |

## Reporting a Vulnerability

If you discover a security vulnerability in open-annex-iv, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, email **security@caelith.tech** with:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact (e.g., incorrect XML generation, data exposure)
4. Suggested fix (if any)

We will acknowledge your report within **48 hours** and provide a timeline for a fix within **5 business days**.

## Scope

Security issues relevant to this package include:

- **XML injection** — malicious input that produces invalid or dangerous XML output
- **XSD validation bypass** — inputs that pass validation but produce non-compliant filings
- **Incorrect field mapping** — ESMA field codes mapped to wrong values (could cause NCA rejection or regulatory penalty)
- **Dependency vulnerabilities** — issues in `zod` or `libxmljs2`

## Regulatory Context

This library generates XML for regulatory filings submitted to EU National Competent Authorities (BaFin, CSSF, FMA, etc.). Incorrect output could result in filing rejection or regulatory penalties for the submitting entity. We treat accuracy bugs in field mapping and serialization with the same severity as security vulnerabilities.
