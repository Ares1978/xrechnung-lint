export const DOCS_BASE_URL = 'https://erechnung.r6d.de';

export const SUPPORTED_RULES = [
  { code: 'BR-01', category: 'EN16931', description: 'XRechnung / EN 16931 CustomizationID (BT-24) required.' },
  { code: 'BR-02', category: 'EN16931', description: 'Invoice number (BT-1) must not be empty.' },
  { code: 'BR-03', category: 'EN16931', description: 'Issue date (BT-2) must be a valid YYYY-MM-DD / YYYYMMDD date.' },
  { code: 'BR-05', category: 'EN16931', description: 'Document currency code (BT-5) must be a 3-letter ISO 4217 code.' },
  { code: 'BR-06', category: 'EN16931', description: 'Seller name (BT-27) must be present.' },
  { code: 'BR-07', category: 'EN16931', description: 'Buyer name (BT-44) must be present.' },
  { code: 'BR-16', category: 'EN16931', description: 'Invoice must contain at least one invoice line.' },
  { code: 'BR-CO-10', category: 'EN16931', description: 'Sum of invoice line net amounts must match TaxExclusiveAmount (BT-109).' },
  { code: 'BR-CO-15', category: 'EN16931', description: 'TaxInclusiveAmount (BT-112) must equal TaxExclusiveAmount + TaxAmount.' },
  { code: 'BR-DE-01', category: 'KoSIT', description: 'SEPA credit transfer (code 58) requires a syntactically valid IBAN (BT-84).' },
  { code: 'BR-DE-02', category: 'KoSIT', description: 'Seller contact name (BT-41), phone (BT-42), and email (BT-43) are mandatory.' },
  { code: 'BR-DE-15', category: 'KoSIT', description: 'BuyerReference / Leitweg-ID (BT-10) must be present.' },
  { code: 'BR-DE-16', category: 'KoSIT', description: 'Seller VAT ID (BT-31) or tax registration number (BT-32) must be present.' },
  { code: 'BR-DE-21', category: 'KoSIT', description: 'Seller electronic address EndpointID (BT-34) is mandatory.' },
  { code: 'BR-DE-26', category: 'KoSIT', description: 'Buyer electronic address EndpointID (BT-49) is mandatory.' },
];

function extractTag(block, tagName) {
  if (!block) return '';
  const regex = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : '';
}

function extractBlock(xml, tagName) {
  const regex = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : '';
}

function extractAllBlocks(xml, tagName) {
  const regex = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  const results = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    results.push(match[1]);
  }
  return results;
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidCiiDate102(value) {
  if (!/^\d{8}$/.test(value)) return false;
  return isValidIsoDate(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`);
}

function isValidIbanFormat(iban) {
  const clean = String(iban || '').replace(/\s+/g, '').toUpperCase();
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(clean);
}

function parseCentsStrict(str) {
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(str)) return null;
  return Math.round(Number(str) * 100);
}

function makeError(code, message) {
  const slug = code.toLowerCase();
  const docsUrl = code.startsWith('BR-') ? `${DOCS_BASE_URL}/fehler/${slug}` : `${DOCS_BASE_URL}/playground`;
  return { code, message, docsUrl };
}

function validateCiiXml(xml) {
  const errors = [];
  const addError = (code, msg) => errors.push(makeError(code, msg));

  const guidelineId = extractTag(extractBlock(xml, 'rsm:ExchangedDocumentContext'), 'ram:ID');
  if (!guidelineId.includes('en16931:2017')) {
    addError('BR-01', 'Missing or unsupported EN 16931 GuidelineSpecifiedDocumentContextParameter (BT-24).');
  }

  const docBlock = extractBlock(xml, 'rsm:ExchangedDocument');
  if (!extractTag(docBlock, 'ram:ID')) {
    addError('BR-02', 'Invoice number ram:ID (BT-1) must not be empty.');
  }

  const issueDateStr = extractTag(extractBlock(docBlock, 'ram:IssueDateTime'), 'udt:DateTimeString');
  if (!isValidCiiDate102(issueDateStr)) {
    addError('BR-03', 'ExchangedDocument IssueDateTime (BT-2) must be a valid YYYYMMDD date.');
  }

  const settlementBlock = extractBlock(xml, 'ram:ApplicableHeaderTradeSettlement');
  const currency = extractTag(settlementBlock, 'ram:InvoiceCurrencyCode');
  if (!/^[A-Z]{3}$/.test(currency)) {
    addError('BR-05', 'InvoiceCurrencyCode (BT-5) must be a 3-letter ISO 4217 code.');
  }

  const agreementBlock = extractBlock(xml, 'ram:ApplicableHeaderTradeAgreement');
  if (!extractTag(agreementBlock, 'ram:BuyerReference')) {
    addError('BR-DE-15', 'BuyerReference / Leitweg-ID (BT-10) is mandatory.');
  }

  const sellerBlock = extractBlock(agreementBlock, 'ram:SellerTradeParty');
  if (!extractTag(sellerBlock, 'ram:Name')) {
    addError('BR-06', 'Seller name (BT-27) must be present.');
  }

  const sellerContact = extractBlock(sellerBlock, 'ram:DefinedTradeContact');
  const contactName = extractTag(sellerContact, 'ram:PersonName');
  const contactPhone = extractTag(extractBlock(sellerContact, 'ram:TelephoneUniversalCommunication'), 'ram:CompleteNumber');
  const contactEmail = extractTag(extractBlock(sellerContact, 'ram:EmailURIUniversalCommunication'), 'ram:URIID');
  if (!contactName || !contactPhone || !contactEmail) {
    addError('BR-DE-02', 'Seller contact name, telephone, and electronic mail are mandatory.');
  }

  const sellerTaxId = extractTag(extractBlock(sellerBlock, 'ram:SpecifiedTaxRegistration'), 'ram:ID');
  if (!sellerTaxId) {
    addError('BR-DE-16', 'Seller VAT ID (BT-31) or tax number (BT-32) must be present.');
  }

  const sellerEndpoint = extractTag(extractBlock(sellerBlock, 'ram:URIUniversalCommunication'), 'ram:URIID');
  if (!sellerEndpoint) {
    addError('BR-DE-21', 'Seller electronic address EndpointID (BT-34) is mandatory.');
  }

  const buyerBlock = extractBlock(agreementBlock, 'ram:BuyerTradeParty');
  if (!extractTag(buyerBlock, 'ram:Name')) {
    addError('BR-07', 'Buyer name (BT-44) must be present.');
  }

  const buyerEndpoint = extractTag(extractBlock(buyerBlock, 'ram:URIUniversalCommunication'), 'ram:URIID');
  if (!buyerEndpoint) {
    addError('BR-DE-26', 'Buyer electronic address EndpointID (BT-49) is mandatory.');
  }

  const paymentBlock = extractBlock(settlementBlock, 'ram:SpecifiedTradeSettlementPaymentMeans');
  const paymentMeansCode = extractTag(paymentBlock, 'ram:TypeCode');
  const payeeIban = extractTag(extractBlock(paymentBlock, 'ram:PayeePartyCreditorFinancialAccount'), 'ram:IBANID');
  if (paymentMeansCode === '58' && !isValidIbanFormat(payeeIban)) {
    addError('BR-DE-01', 'PaymentMeans TypeCode 58 requires a valid IBAN.');
  }

  const lineBlocks = extractAllBlocks(xml, 'ram:IncludedSupplyChainTradeLineItem');
  if (lineBlocks.length === 0) {
    addError('BR-16', 'At least one ram:IncludedSupplyChainTradeLineItem is required.');
  }

  let sumLineCents = 0;
  let lineAmountsValid = true;
  for (const lineBlock of lineBlocks) {
    const lineExt = parseCentsStrict(extractTag(lineBlock, 'ram:LineTotalAmount'));
    if (lineExt === null) {
      lineAmountsValid = false;
      break;
    }
    sumLineCents += lineExt;
  }

  const monetaryBlock = extractBlock(settlementBlock, 'ram:SpecifiedTradeSettlementHeaderMonetarySummation');
  const declaredLineExt = parseCentsStrict(extractTag(monetaryBlock, 'ram:LineTotalAmount'));
  const taxExclusiveCents = parseCentsStrict(extractTag(monetaryBlock, 'ram:TaxBasisTotalAmount'));
  const totalTaxCents = parseCentsStrict(extractTag(monetaryBlock, 'ram:TaxTotalAmount'));
  const taxInclusiveCents = parseCentsStrict(extractTag(monetaryBlock, 'ram:GrandTotalAmount'));

  if (
    !lineAmountsValid ||
    declaredLineExt === null ||
    taxExclusiveCents === null ||
    sumLineCents !== declaredLineExt ||
    sumLineCents !== taxExclusiveCents
  ) {
    addError(
      'BR-CO-10',
      'Sum of line net amounts must match HeaderMonetarySummation LineTotalAmount and TaxBasisTotalAmount.',
    );
  }

  if (
    taxExclusiveCents === null ||
    totalTaxCents === null ||
    taxInclusiveCents === null ||
    taxExclusiveCents + totalTaxCents !== taxInclusiveCents
  ) {
    addError('BR-CO-15', 'GrandTotalAmount must strictly equal TaxBasisTotalAmount + TaxTotalAmount.');
  }

  return {
    valid: errors.length === 0,
    profile: 'ZUGFeRD 2.3 (EN 16931 CII)',
    errors,
    checksRun: SUPPORTED_RULES.length,
  };
}

/**
 * Validates an XRechnung 3.0 UBL or ZUGFeRD 2.3 CII XML string against EN 16931 and KoSIT BR-DE rules.
 */
export function validateXml(xml) {
  const errors = [];
  const addError = (code, msg) => errors.push(makeError(code, msg));

  if (typeof xml !== 'string' || !xml.trim()) {
    addError('XML-00', 'XML payload must be a non-empty string.');
    return {
      valid: false,
      profile: 'XRechnung 3.0 (EN 16931)',
      errors,
      checksRun: SUPPORTED_RULES.length,
    };
  }

  if (/<(?:rsm:)?CrossIndustryInvoice[\s>]/i.test(xml)) {
    return validateCiiXml(xml);
  }

  const headerPart = xml.split(/<cac:/i)[0] || xml;
  const customizationId = extractTag(headerPart, 'cbc:CustomizationID');
  if (!customizationId.includes('en16931:2017') || !customizationId.includes('xrechnung_3.0')) {
    addError('BR-01', 'Missing or unsupported XRechnung 3.0 CustomizationID (BT-24).');
  }

  if (!extractTag(headerPart, 'cbc:ID')) {
    addError('BR-02', 'Invoice number cbc:ID (BT-1) must not be empty.');
  }

  if (!isValidIsoDate(extractTag(headerPart, 'cbc:IssueDate'))) {
    addError('BR-03', 'IssueDate (BT-2) must be a valid YYYY-MM-DD date.');
  }

  if (!/^[A-Z]{3}$/.test(extractTag(headerPart, 'cbc:DocumentCurrencyCode'))) {
    addError('BR-05', 'DocumentCurrencyCode (BT-5) must be a 3-letter ISO 4217 code.');
  }

  if (!extractTag(headerPart, 'cbc:BuyerReference')) {
    addError('BR-DE-15', 'BuyerReference / Leitweg-ID (BT-10) is mandatory.');
  }

  const supplierBlock = extractBlock(xml, 'cac:AccountingSupplierParty');
  const sellerName =
    extractTag(extractBlock(supplierBlock, 'cac:PartyName'), 'cbc:Name') ||
    extractTag(extractBlock(supplierBlock, 'cac:PartyLegalEntity'), 'cbc:RegistrationName');
  if (!sellerName) {
    addError('BR-06', 'Seller name (BT-27) must be present.');
  }

  const sellerContact = extractBlock(supplierBlock, 'cac:Contact');
  if (
    !extractTag(sellerContact, 'cbc:Name') ||
    !extractTag(sellerContact, 'cbc:Telephone') ||
    !extractTag(sellerContact, 'cbc:ElectronicMail')
  ) {
    addError('BR-DE-02', 'Seller contact name, telephone, and electronic mail are mandatory.');
  }

  if (!extractTag(extractBlock(supplierBlock, 'cac:PartyTaxScheme'), 'cbc:CompanyID')) {
    addError('BR-DE-16', 'Seller VAT ID (BT-31) or tax number (BT-32) must be present.');
  }

  if (!extractTag(supplierBlock, 'cbc:EndpointID')) {
    addError('BR-DE-21', 'Seller electronic address EndpointID (BT-34) is mandatory.');
  }

  const customerBlock = extractBlock(xml, 'cac:AccountingCustomerParty');
  const buyerName =
    extractTag(extractBlock(customerBlock, 'cac:PartyName'), 'cbc:Name') ||
    extractTag(extractBlock(customerBlock, 'cac:PartyLegalEntity'), 'cbc:RegistrationName');
  if (!buyerName) {
    addError('BR-07', 'Buyer name (BT-44) must be present.');
  }

  if (!extractTag(customerBlock, 'cbc:EndpointID')) {
    addError('BR-DE-26', 'Buyer electronic address EndpointID (BT-49) is mandatory.');
  }

  const paymentBlock = extractBlock(xml, 'cac:PaymentMeans');
  const paymentMeansCode = extractTag(paymentBlock, 'cbc:PaymentMeansCode');
  const payeeIban = extractTag(extractBlock(paymentBlock, 'cac:PayeeFinancialAccount'), 'cbc:ID');
  if (paymentMeansCode === '58' && !isValidIbanFormat(payeeIban)) {
    addError('BR-DE-01', 'PaymentMeansCode 58 requires a valid IBAN in PayeeFinancialAccount.');
  }

  const lineBlocks = extractAllBlocks(xml, 'cac:InvoiceLine');
  if (lineBlocks.length === 0) {
    addError('BR-16', 'At least one cac:InvoiceLine is required.');
  }

  let sumLineCents = 0;
  let lineAmountsValid = true;
  for (const lineBlock of lineBlocks) {
    const lineExt = parseCentsStrict(extractTag(lineBlock, 'cbc:LineExtensionAmount'));
    if (lineExt === null) {
      lineAmountsValid = false;
      break;
    }
    sumLineCents += lineExt;
  }

  const monetaryBlock = extractBlock(xml, 'cac:LegalMonetaryTotal');
  const taxTotalBlock = extractBlock(xml, 'cac:TaxTotal');
  const declaredLineExt = parseCentsStrict(extractTag(monetaryBlock, 'cbc:LineExtensionAmount'));
  const taxExclusiveCents = parseCentsStrict(extractTag(monetaryBlock, 'cbc:TaxExclusiveAmount'));
  const taxInclusiveCents = parseCentsStrict(extractTag(monetaryBlock, 'cbc:TaxInclusiveAmount'));
  const totalTaxCents = parseCentsStrict(extractTag(taxTotalBlock, 'cbc:TaxAmount'));

  if (
    !lineAmountsValid ||
    declaredLineExt === null ||
    taxExclusiveCents === null ||
    sumLineCents !== declaredLineExt ||
    sumLineCents !== taxExclusiveCents
  ) {
    addError(
      'BR-CO-10',
      'Sum of line net amounts must match LegalMonetaryTotal LineExtensionAmount and TaxExclusiveAmount.',
    );
  }

  if (
    taxExclusiveCents === null ||
    totalTaxCents === null ||
    taxInclusiveCents === null ||
    taxExclusiveCents + totalTaxCents !== taxInclusiveCents
  ) {
    addError('BR-CO-15', 'TaxInclusiveAmount must strictly equal TaxExclusiveAmount + TaxTotal/TaxAmount.');
  }

  return {
    valid: errors.length === 0,
    profile: 'XRechnung 3.0 (EN 16931)',
    errors,
    checksRun: SUPPORTED_RULES.length,
  };
}
