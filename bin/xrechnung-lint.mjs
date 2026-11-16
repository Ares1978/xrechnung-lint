#!/usr/bin/env node
import fs from 'node:fs';
import { DOCS_BASE_URL, SUPPORTED_RULES, validateXml } from '../src/index.mjs';

function printHelp() {
  console.log(`xrechnung-lint v1.0.0 — EN 16931 / XRechnung 3.0 / ZUGFeRD 2.3 CLI Linter

Usage:
  xrechnung-lint <file1.xml> [file2.xml ...] [--json]
  xrechnung-lint --rules
  xrechnung-lint --help

Options:
  --json     Output machine-readable JSON validation results (ideal for CI/CD)
  --rules    List all supported EN 16931 and KoSIT BR-DE rules
  --help     Show this help text

Online Playground & Cloud API:
  Browser Validator : ${DOCS_BASE_URL}/playground
  REST API & SDK    : ${DOCS_BASE_URL}
  Self-Hosted Kit   : ${DOCS_BASE_URL}/preise`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exitCode = args.length === 0 ? 2 : 0;
    return;
  }

  const jsonMode = args.includes('--json');
  if (args.includes('--rules')) {
    if (jsonMode) {
      console.log(JSON.stringify({ count: SUPPORTED_RULES.length, rules: SUPPORTED_RULES }, null, 2));
    } else {
      for (const r of SUPPORTED_RULES) {
        console.log(`${r.code.padEnd(10)} [${r.category}] ${r.description}`);
      }
    }
    return;
  }

  const files = args.filter((a) => !a.startsWith('-'));
  if (files.length === 0) {
    console.error('Error: No XML input files provided. Run with --help for usage.');
    process.exitCode = 2;
    return;
  }

  const results = [];
  let hasFailures = false;
  let hasReadError = false;

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) {
      hasReadError = true;
      results.push({
        file: filePath,
        valid: false,
        errors: [{ code: 'IO-01', message: `File not found: ${filePath}`, docsUrl: `${DOCS_BASE_URL}/playground` }],
      });
      continue;
    }

    const xml = fs.readFileSync(filePath, 'utf8');
    const report = validateXml(xml);
    if (!report.valid) {
      hasFailures = true;
    }
    results.push({ file: filePath, ...report });
  }

  if (jsonMode) {
    console.log(JSON.stringify(results.length === 1 ? results[0] : { results }, null, 2));
  } else {
    for (const r of results) {
      if (r.valid) {
        console.log(`PASS  ${r.file} (${r.profile}, ${r.checksRun} checks passed)`);
      } else {
        console.error(`FAIL  ${r.file} (${r.profile || 'XML'}, ${r.errors.length} error(s))`);
        for (const err of r.errors) {
          console.error(`  - [${err.code}] ${err.message}`);
          console.error(`    Fix guide: ${err.docsUrl}`);
        }
      }
    }
    if (hasFailures) {
      console.error(
        `\nNeed automated XRechnung 3.0 / ZUGFeRD 2.3 PDF/A-3b generation? See ${DOCS_BASE_URL}`,
      );
    }
  }

  if (hasReadError) {
    process.exitCode = 2;
  } else if (hasFailures) {
    process.exitCode = 1;
  }
}

main();
