/**
 * Turkish Benefits Calculations Utilities
 * Kıdem Tazminatı, İhbar Tazminatı, İşsizlik Maaşı
 * 2026 rates and calculations
 */

// 2026 Constants
export const SEVERANCE_PAY_CEILING_2026 = 73723.35; // Tavanlı tutar (Temmuz-Aralık 2026)
export const STAMP_TAX_RATE = 0.00759; // 0.759% damga vergisi
export const GROSS_MIN_WAGE_2026 = 33030.00;

// Notice pay periods based on tenure
export interface NoticePeriod {
  minMonths: number;
  maxMonths: number;
  weeks: number;
  days: number;
  label: string;
}

export const NOTICE_PERIODS: NoticePeriod[] = [
  { minMonths: 0, maxMonths: 6, weeks: 2, days: 14, label: '6 aydan az - 2 hafta' },
  { minMonths: 6, maxMonths: 18, weeks: 4, days: 28, label: '6-18 ay - 4 hafta' },
  { minMonths: 18, maxMonths: 36, weeks: 6, days: 42, label: '18-36 ay - 6 hafta' },
  { minMonths: 36, maxMonths: Infinity, weeks: 8, days: 56, label: '3+ yıl - 8 hafta' },
];

// Unemployment benefit periods based on premium days
export interface UnemploymentBenefitPeriod {
  premiumDays: number;
  benefitDays: number;
  benefitMonths: number;
  label: string;
}

export const UNEMPLOYMENT_PERIODS: UnemploymentBenefitPeriod[] = [
  { premiumDays: 600, benefitDays: 180, benefitMonths: 6, label: '600 gün - 6 ay (180 gün)' },
  { premiumDays: 900, benefitDays: 240, benefitMonths: 8, label: '900 gün - 8 ay (240 gün)' },
  { premiumDays: 1080, benefitDays: 300, benefitMonths: 10, label: '1080 gün - 10 ay (300 gün)' },
];

/**
 * Kıdem Tazminatı Hesaplama
 * Based on: Brüt Maaş × Yıl Sayısı (Tavana kadar)
 */
export function calculateSeverancePay(grossSalary: number, years: number, months: number = 0, days: number = 0) {
  const totalYears = years + months / 12 + days / 365;
  
  // Cap the gross salary used in calculation to ceiling per year
  const cappedSalary = grossSalary > SEVERANCE_PAY_CEILING_2026 ? SEVERANCE_PAY_CEILING_2026 : grossSalary;
  
  // Gross severance = salary × tenure
  const grossSeverance = cappedSalary * totalYears;
  
  // Stamp tax (Damga Vergisi)
  const stampTax = grossSeverance * STAMP_TAX_RATE;
  
  // Net severance
  const netSeverance = grossSeverance - stampTax;
  
  return {
    grossSalary,
    cappedSalary,
    totalYears: Number(totalYears.toFixed(2)),
    grossSeverance: Number(grossSeverance.toFixed(2)),
    stampTax: Number(stampTax.toFixed(2)),
    netSeverance: Number(netSeverance.toFixed(2)),
    ceiling: SEVERANCE_PAY_CEILING_2026,
    isCapped: grossSalary > SEVERANCE_PAY_CEILING_2026,
  };
}

/**
 * İhbar Tazminatı Hesaplama
 * Based on: Notice Period (weeks) × Daily Gross Wage
 */
export function calculateNoticePay(grossSalary: number, tenureMonths: number) {
  // Find applicable notice period
  const noticePeriod = NOTICE_PERIODS.find(
    (p) => tenureMonths >= p.minMonths && tenureMonths < p.maxMonths
  ) || NOTICE_PERIODS[NOTICE_PERIODS.length - 1];
  
  // Daily gross wage
  const dailyGrossWage = grossSalary / 30;
  
  // Gross notice pay
  const grossNoticePay = dailyGrossWage * noticePeriod.days;
  
  // Stamp tax (Damga Vergisi)
  const stampTax = grossNoticePay * STAMP_TAX_RATE;
  
  // Income tax (simplified: assumes average of 15% tax bracket)
  // In reality, this depends on total income and tax brackets
  const incomeTax = grossNoticePay * 0.15; // Approximate 15% bracket
  
  // Net notice pay
  const netNoticePay = grossNoticePay - stampTax - incomeTax;
  
  return {
    grossSalary,
    tenureMonths,
    noticePeriodLabel: noticePeriod.label,
    noticeWeeks: noticePeriod.weeks,
    noticeDays: noticePeriod.days,
    dailyGrossWage: Number(dailyGrossWage.toFixed(2)),
    grossNoticePay: Number(grossNoticePay.toFixed(2)),
    stampTax: Number(stampTax.toFixed(2)),
    incomeTax: Number(incomeTax.toFixed(2)),
    totalDeductions: Number((stampTax + incomeTax).toFixed(2)),
    netNoticePay: Number(netNoticePay.toFixed(2)),
  };
}

/**
 * İşsizlik Maaşı Hesaplama
 * Based on: 40% of avg daily wage (capped at 80% of min wage)
 */
export function calculateUnemploymentBenefit(lastFourMonthsAvgGross: number, premiumDays: number) {
  // Daily unemployment benefit = 40% of average daily gross
  const dailyGross = lastFourMonthsAvgGross / 30;
  let dailyBenefit = dailyGross * 0.4;
  
  // Cap at 80% of monthly minimum wage
  const maxDailyBenefit = (GROSS_MIN_WAGE_2026 * 0.8) / 30;
  const isCapped = dailyBenefit > maxDailyBenefit;
  
  if (isCapped) {
    dailyBenefit = maxDailyBenefit;
  }
  
  // Find benefit period
  const benefitPeriod = UNEMPLOYMENT_PERIODS.find((p) => premiumDays >= p.premiumDays) || UNEMPLOYMENT_PERIODS[0];
  
  // Monthly gross benefit
  const monthlyGrossBenefit = dailyBenefit * 30;
  
  // Stamp tax
  const stampTax = monthlyGrossBenefit * STAMP_TAX_RATE;
  
  // Net monthly benefit
  const monthlyNetBenefit = monthlyGrossBenefit - stampTax;
  
  // Total benefit for entire period
  const totalGrossBenefit = monthlyGrossBenefit * benefitPeriod.benefitMonths;
  const totalStampTax = totalGrossBenefit * STAMP_TAX_RATE;
  const totalNetBenefit = totalGrossBenefit - totalStampTax;
  
  // Min and max benefit ranges
  const minMonthlyGross = (GROSS_MIN_WAGE_2026 * 0.4);
  const maxMonthlyGross = (GROSS_MIN_WAGE_2026 * 0.8);
  
  return {
    lastFourMonthsAvgGross: Number(lastFourMonthsAvgGross.toFixed(2)),
    dailyGross: Number(dailyGross.toFixed(2)),
    dailyBenefit: Number(dailyBenefit.toFixed(2)),
    isCapped,
    minMonthlyGross: Number(minMonthlyGross.toFixed(2)),
    maxMonthlyGross: Number(maxMonthlyGross.toFixed(2)),
    premiumDays,
    benefitPeriodLabel: benefitPeriod.label,
    benefitMonths: benefitPeriod.benefitMonths,
    benefitDays: benefitPeriod.benefitDays,
    monthlyGrossBenefit: Number(monthlyGrossBenefit.toFixed(2)),
    monthlyStampTax: Number(stampTax.toFixed(2)),
    monthlyNetBenefit: Number(monthlyNetBenefit.toFixed(2)),
    totalGrossBenefit: Number(totalGrossBenefit.toFixed(2)),
    totalStampTax: Number(totalStampTax.toFixed(2)),
    totalNetBenefit: Number(totalNetBenefit.toFixed(2)),
  };
}
