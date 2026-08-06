/**
 * Türk Vergi Sistemi Bordro Hesaplamaları
 * Turkish Tax System Payroll Calculations
 */

export interface PayrollData {
  month: string;
  year: number;
  grossSalary: number;
  overtimeEarnings: number;
  bonusIncentive: number;
  
  // Kesintiler (Deductions)
  sgkWorker: number; // SGK İşçi Payı
  unemploymentWorker: number; // İşsizlik İşçi
  besDeduction: number; // BES Kesintisi
  incomeTax: number; // Gelir Vergisi
  stampTax: number; // Damga Vergisi
  
  // Hesaplanacak alanlar
  grossTotal: number; // Brüt + Ek ödemeler
  netTotal: number; // Eline geçen tutarı
  
  // İşveren payları
  sgkEmployer: number; // SGK İşveren Payı
  unemploymentEmployer: number; // İşsizlik İşveren
  totalEmployerCost: number; // Toplam İşveren Maliyeti
}

interface TaxBracket {
  minIncome: number;
  maxIncome: number;
  rate: number;
  startYear: number;
  endYear: number;
}

// 2024-2026 vergi dilimleri
const TAX_BRACKETS: TaxBracket[] = [
  { minIncome: 0, maxIncome: 32000, rate: 0.15, startYear: 2024, endYear: 2026 },
  { minIncome: 32000.01, maxIncome: 70000, rate: 0.20, startYear: 2024, endYear: 2026 },
  { minIncome: 70000.01, maxIncome: 180000, rate: 0.27, startYear: 2024, endYear: 2026 },
  { minIncome: 180000.01, maxIncome: Infinity, rate: 0.32, startYear: 2024, endYear: 2026 },
];

// Sabit oranlar
const SGK_WORKER_RATE = 0.0865; // %8.65
const SGK_EMPLOYER_RATE = 0.115; // %11.5
const UNEMPLOYMENT_WORKER_RATE = 0.01; // %1
const UNEMPLOYMENT_EMPLOYER_RATE = 0.02; // %2

/**
 * NET maaştan BRÜT'ü hesapla
 * Calculate GROSS from NET salary using iterative approach
 */
function calculateBrutFromNet(netSalary: number, year: number): number {
  let brut = netSalary * 1.2; // İlk tahmin
  
  for (let i = 0; i < 10; i++) {
    const sgk = brut * SGK_WORKER_RATE;
    const unemployment = brut * UNEMPLOYMENT_WORKER_RATE;
    const taxBase = brut - sgk - unemployment;
    const tax = calculateIncomeTax(taxBase, year);
    const stamp = taxBase * 0.0075;
    const calculated = brut - sgk - unemployment - tax - stamp;
    
    if (Math.abs(calculated - netSalary) < 0.01) {
      return brut;
    }
    
    brut = brut + (netSalary - calculated);
  }
  
  return brut;
}

export function calculatePayroll(
  monthlySalary: number,
  year: number = new Date().getFullYear(),
  overtimeEarnings: number = 0,
  bonusIncentive: number = 0,
  besDeduction: number = 0,
  month: string = ''
): PayrollData {
  // monthlySalary settings'ten gelen NET maaş
  // BRÜT'ü hesapla
  const brutFromNet = calculateBrutFromNet(monthlySalary, year);
  
  // Brüt tutar = NET'ten hesaplanan BRÜT + Mesai + Bonus
  const grossTotal = brutFromNet + overtimeEarnings + bonusIncentive;
  
  // SGK İşçi Kesintisi
  const sgkWorker = grossTotal * SGK_WORKER_RATE;
  
  // İşsizlik İşçi Kesintisi
  const unemploymentWorker = grossTotal * UNEMPLOYMENT_WORKER_RATE;
  
  // BES Kesintisi (isteğe bağlı)
  const finalBesDeduction = besDeduction > 0 ? besDeduction : 0;
  
  // Gelir Vergisi Matrahı
  const incomeTaxBase = grossTotal - sgkWorker - unemploymentWorker - finalBesDeduction;
  
  // Gelir Vergisi Hesaplama
  const incomeTax = calculateIncomeTax(incomeTaxBase, year);
  
  // Damga Vergisi
  const stampTax = incomeTaxBase * 0.0075;
  
  // Net Tutar
  const netTotal = grossTotal - sgkWorker - unemploymentWorker - finalBesDeduction - incomeTax - stampTax;
  
  // İşveren Payları
  const sgkEmployer = grossTotal * SGK_EMPLOYER_RATE;
  const unemploymentEmployer = grossTotal * UNEMPLOYMENT_EMPLOYER_RATE;
  const totalEmployerCost = grossTotal + sgkEmployer + unemploymentEmployer;
  
  return {
    month,
    year,
    grossSalary: monthlySalary,
    overtimeEarnings,
    bonusIncentive,
    sgkWorker,
    unemploymentWorker,
    besDeduction: finalBesDeduction,
    incomeTax,
    stampTax,
    grossTotal,
    netTotal,
    sgkEmployer,
    unemploymentEmployer,
    totalEmployerCost,
  };
}

function calculateIncomeTax(taxableIncome: number, year: number): number {
  const bracket = TAX_BRACKETS.find(
    b => year >= b.startYear && year <= b.endYear && 
    taxableIncome >= b.minIncome && taxableIncome <= b.maxIncome
  );
  
  if (!bracket) return 0;
  
  return taxableIncome * bracket.rate;
}

export function calculateMonthlyPayrolls(
  monthlySalary: number,
  monthlyOvertimeEarnings: Record<string, number>,
  year: number = new Date().getFullYear()
): PayrollData[] {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const monthsTr = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  
  return months.map((month, index) => {
    const overtimeEarnings = monthlyOvertimeEarnings[month] ?? 0;
    return calculatePayroll(
      monthlySalary,
      year,
      overtimeEarnings,
      0,
      0,
      monthsTr[index]
    );
  });
}
