# xrechnung-lint

**Zero-dependency CLI linter & ESM validator for German E-Rechnung (EN 16931: XRechnung 3.0 UBL & ZUGFeRD 2.3 CII).**

Built for CI/CD pipelines, invoice generators, ERP integrations, and developers preparing for Germany's mandatory B2B e-invoicing deadline (**01.01.2027**).

> **Test instantly without installing:** Try the free [Live Browser Validator Playground](https://erechnung.r6d.de/playground) or inspect all 130+ rule explanations at [erechnung.r6d.de/verzeichnisse](https://erechnung.r6d.de/verzeichnisse).

---

## Quick Start

```bash
# Run directly from GitHub (zero install)
npx github:Ares1978/xrechnung-lint invoice.xml

# Or via npm once published
npx xrechnung-lint invoice.xml

# Or install globally
npm install -g xrechnung-lint
xrechnung-lint invoice-ubl.xml invoice-cii.xml
```

### Machine-Readable Output (CI/CD)

```bash
xrechnung-lint invoice.xml --json
```

Exit codes:
- `0` — Valid EN 16931 / KoSIT `BR-DE` document
- `1` — One or more business rules failed
- `2` — File not found or invalid CLI arguments

### GitHub Actions Example

```yaml
- name: Validate generated e-invoices
  run: npx xrechnung-lint ./fixtures/*.xml --json
```

### Programmatic Usage (Node.js ESM)

```js
import fs from 'node:fs';
import { validateXml } from 'xrechnung-lint';

const xml = fs.readFileSync('invoice.xml', 'utf8');
const report = validateXml(xml);

if (!report.valid) {
  console.error(report.errors);
  process.exit(1);
}
```

---

## Checked Rules (`xrechnung-lint --rules`)

- **EN 16931 Core:** `BR-01`, `BR-02`, `BR-03`, `BR-05`, `BR-06`, `BR-07`, `BR-16`
- **Cent-Exact Arithmetic:** `BR-CO-10` (line sum == `TaxExclusiveAmount`), `BR-CO-15` (`TaxInclusiveAmount` == `TaxExclusiveAmount + TaxAmount`)
- **KoSIT German Extensions:** `BR-DE-01` (SEPA IBAN), `BR-DE-02` (Seller Contact), `BR-DE-15` (`BuyerReference` / Leitweg-ID), `BR-DE-16` (VAT ID / Tax Number), `BR-DE-21` & `BR-DE-26` (Seller & Buyer `EndpointID`)

---

## Need XML + ZUGFeRD 2.3 PDF/A-3b Generation?

`xrechnung-lint` checks your XML locally for free. When you also want to **generate** compliant XRechnung 3.0 XML and embedded **ZUGFeRD 2.3 PDF/A-3b** invoices from clean JSON:

- **Free Interactive Browser Playground:** https://erechnung.r6d.de/playground
- **Hosted Cloud REST API (`39 €/mo` – `249 €/mo`):** https://erechnung.r6d.de
- **Self-Hosted Zero-Dependency Microservice & SDK (`99 €` one-time):** https://erechnung.r6d.de/preise

## License

MIT &copy; 2026 Andre Freise
