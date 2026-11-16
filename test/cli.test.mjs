import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateXml } from '../src/index.mjs';

const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BIN_PATH = path.join(PKG_ROOT, 'bin', 'xrechnung-lint.mjs');

const VALID_UBL = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</cbc:CustomizationID>
  <cbc:ID>RE-2026-100</cbc:ID>
  <cbc:IssueDate>2026-11-16</cbc:IssueDate>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>04011000-12345-03</cbc:BuyerReference>
  <cac:AccountingSupplierParty><cac:Party>
    <cbc:EndpointID schemeID="EM">seller@example.de</cbc:EndpointID>
    <cac:PartyName><cbc:Name>Seller GmbH</cbc:Name></cac:PartyName>
    <cac:PartyTaxScheme><cbc:CompanyID>DE123456789</cbc:CompanyID></cac:PartyTaxScheme>
    <cac:Contact><cbc:Name>Max</cbc:Name><cbc:Telephone>+4930123</cbc:Telephone><cbc:ElectronicMail>max@example.de</cbc:ElectronicMail></cac:Contact>
  </cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party>
    <cbc:EndpointID schemeID="EM">buyer@example.de</cbc:EndpointID>
    <cac:PartyName><cbc:Name>Buyer AG</cbc:Name></cac:PartyName>
  </cac:Party></cac:AccountingCustomerParty>
  <cac:PaymentMeans><cbc:PaymentMeansCode>58</cbc:PaymentMeansCode><cac:PayeeFinancialAccount><cbc:ID>DE89370400440532013000</cbc:ID></cac:PayeeFinancialAccount></cac:PaymentMeans>
  <cac:TaxTotal><cbc:TaxAmount currencyID="EUR">19.00</cbc:TaxAmount></cac:TaxTotal>
  <cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="EUR">100.00</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="EUR">100.00</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="EUR">119.00</cbc:TaxInclusiveAmount></cac:LegalMonetaryTotal>
  <cac:InvoiceLine><cbc:ID>1</cbc:ID><cbc:LineExtensionAmount currencyID="EUR">100.00</cbc:LineExtensionAmount></cac:InvoiceLine>
</Invoice>`;

const VALID_CII = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
                          xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
                          xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:cen.eu:en16931:2017</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument><ram:ID>RE-2026-200</ram:ID><ram:IssueDateTime><udt:DateTimeString format="102">20261116</udt:DateTimeString></ram:IssueDateTime></rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:IncludedSupplyChainTradeLineItem><ram:SpecifiedLineTradeSettlement><ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>100.00</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation></ram:SpecifiedLineTradeSettlement></ram:IncludedSupplyChainTradeLineItem>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:BuyerReference>04011000-12345-03</ram:BuyerReference>
      <ram:SellerTradeParty><ram:Name>Seller GmbH</ram:Name><ram:DefinedTradeContact><ram:PersonName>Max</ram:PersonName><ram:TelephoneUniversalCommunication><ram:CompleteNumber>+4930123</ram:CompleteNumber></ram:TelephoneUniversalCommunication><ram:EmailURIUniversalCommunication><ram:URIID>max@example.de</ram:URIID></ram:EmailURIUniversalCommunication></ram:DefinedTradeContact><ram:URIUniversalCommunication><ram:URIID schemeID="EM">seller@example.de</ram:URIID></ram:URIUniversalCommunication><ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">DE123456789</ram:ID></ram:SpecifiedTaxRegistration></ram:SellerTradeParty>
      <ram:BuyerTradeParty><ram:Name>Buyer AG</ram:Name><ram:URIUniversalCommunication><ram:URIID schemeID="EM">buyer@example.de</ram:URIID></ram:URIUniversalCommunication></ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementPaymentMeans><ram:TypeCode>58</ram:TypeCode><ram:PayeePartyCreditorFinancialAccount><ram:IBANID>DE89370400440532013000</ram:IBANID></ram:PayeePartyCreditorFinancialAccount></ram:SpecifiedTradeSettlementPaymentMeans>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation><ram:LineTotalAmount>100.00</ram:LineTotalAmount><ram:TaxBasisTotalAmount>100.00</ram:TaxBasisTotalAmount><ram:TaxTotalAmount currencyID="EUR">19.00</ram:TaxTotalAmount><ram:GrandTotalAmount>119.00</ram:GrandTotalAmount></ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

test('validateXml validates UBL, CII, and flags BR-DE-15 with docsUrl', () => {
  assert.equal(validateXml(VALID_UBL).valid, true);
  assert.equal(validateXml(VALID_CII).valid, true);

  const broken = VALID_UBL.replace('<cbc:BuyerReference>04011000-12345-03</cbc:BuyerReference>', '<cbc:BuyerReference></cbc:BuyerReference>');
  const report = validateXml(broken);
  assert.equal(report.valid, false);
  const brDe15 = report.errors.find((e) => e.code === 'BR-DE-15');
  assert.ok(brDe15);
  assert.equal(brDe15.docsUrl, 'https://erechnung.r6d.de/fehler/br-de-15');
});

test('CLI supports valid/invalid XML, --json, and --rules', (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xr-lint-'));
  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  const validFile = path.join(tmpDir, 'valid.xml');
  const invalidFile = path.join(tmpDir, 'invalid.xml');
  fs.writeFileSync(validFile, VALID_UBL, 'utf8');
  fs.writeFileSync(
    invalidFile,
    VALID_UBL.replace('<cbc:BuyerReference>04011000-12345-03</cbc:BuyerReference>', ''),
    'utf8',
  );

  const passOut = execFileSync(process.execPath, [BIN_PATH, validFile], { encoding: 'utf8' });
  assert.match(passOut, /^PASS\s+/);

  const jsonOut = execFileSync(process.execPath, [BIN_PATH, validFile, '--json'], { encoding: 'utf8' });
  const parsed = JSON.parse(jsonOut);
  assert.equal(parsed.valid, true);

  const rulesOut = execFileSync(process.execPath, [BIN_PATH, '--rules'], { encoding: 'utf8' });
  assert.match(rulesOut, /BR-DE-15/);

  assert.throws(
    () => execFileSync(process.execPath, [BIN_PATH, invalidFile], { encoding: 'utf8', stdio: 'pipe' }),
    (err) =>
      err.status === 1 &&
      err.stderr.includes('BR-DE-15') &&
      err.stderr.includes('https://erechnung.r6d.de/fehler/br-de-15'),
  );
});
