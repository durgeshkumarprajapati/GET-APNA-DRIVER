export interface TaxCalculationInput {
  driverCharges: number;
  platformCharges?: number;
  otherCharges?: number;
  discountAmount?: number;
  gstRatePercent?: number; // e.g., 18
  isInterstate?: boolean;
  isTaxInclusive?: boolean; // Default true (fares are GST inclusive)
}

export interface TaxCalculationResult {
  driverCharges: number;
  platformCharges: number;
  otherCharges: number;
  grossSubtotal: number;
  discountAmount: number;
  netSubtotal: number;
  taxableAmount: number;
  gstRatePercent: number;
  cgstRatePercent: number;
  cgstAmount: number;
  sgstRatePercent: number;
  sgstAmount: number;
  igstRatePercent: number;
  igstAmount: number;
  totalTaxAmount: number;
  finalPayable: number;
}

/**
 * Server-authoritative Tax & Financial Breakdown calculation engine.
 * Computes exact taxable amounts, CGST, SGST, IGST, and final customer payable using standard rounding.
 */
export function calculateTaxBreakdown(input: TaxCalculationInput): TaxCalculationResult {
  const driverCharges = Math.max(0, Number(input.driverCharges || 0));
  const platformCharges = Math.max(0, Number(input.platformCharges || 0));
  const otherCharges = Math.max(0, Number(input.otherCharges || 0));
  const discountAmount = Math.max(0, Number(input.discountAmount || 0));
  const gstRatePercent = Number(input.gstRatePercent ?? 18);
  const isInterstate = Boolean(input.isInterstate ?? false);
  const isTaxInclusive = Boolean(input.isTaxInclusive ?? true);

  const grossSubtotal = Number((driverCharges + platformCharges + otherCharges).toFixed(2));
  const netSubtotal = Math.max(0, Number((grossSubtotal - discountAmount).toFixed(2)));

  let taxableAmount: number;
  let totalTaxAmount: number;
  let finalPayable: number;

  if (isTaxInclusive) {
    finalPayable = netSubtotal;
    const taxFactor = 1 + gstRatePercent / 100;
    taxableAmount = Number((netSubtotal / taxFactor).toFixed(2));
    totalTaxAmount = Number((netSubtotal - taxableAmount).toFixed(2));
  } else {
    taxableAmount = netSubtotal;
    totalTaxAmount = Number(((taxableAmount * gstRatePercent) / 100).toFixed(2));
    finalPayable = Number((taxableAmount + totalTaxAmount).toFixed(2));
  }

  let cgstRatePercent = 0;
  let cgstAmount = 0;
  let sgstRatePercent = 0;
  let sgstAmount = 0;
  let igstRatePercent = 0;
  let igstAmount = 0;

  if (isInterstate) {
    igstRatePercent = gstRatePercent;
    igstAmount = totalTaxAmount;
  } else {
    cgstRatePercent = gstRatePercent / 2;
    sgstRatePercent = gstRatePercent / 2;
    cgstAmount = Number((totalTaxAmount / 2).toFixed(2));
    sgstAmount = Number((totalTaxAmount - cgstAmount).toFixed(2));
  }

  return {
    driverCharges,
    platformCharges,
    otherCharges,
    grossSubtotal,
    discountAmount,
    netSubtotal,
    taxableAmount,
    gstRatePercent,
    cgstRatePercent,
    cgstAmount,
    sgstRatePercent,
    sgstAmount,
    igstRatePercent,
    igstAmount,
    totalTaxAmount,
    finalPayable,
  };
}
