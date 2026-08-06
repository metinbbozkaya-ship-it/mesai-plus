import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Dimensions, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { buildCorporateHtml, shareCorporatePdf, makeReportNo, fmtTL } from '../../services/corporateReports';
import { useApp } from '../../context/AppContext';
import { getColors, radius, spacing } from '../../theme';
import { calculatePayroll, PayrollData } from '../../utils/payroll';
import { formatTL } from '../../utils/salary';
import { fromDateKey } from '../../utils/dates';

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export default function PayrollCalculator() {
  const { settings, entries, theme, language } = useApp();
  const colors = getColors(theme);
  const styles = getStyles(colors);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const generatePayrollPDF = async (payrolls: PayrollData[], totalPayroll: any) => {
    try {
      setIsGeneratingPDF(true);
      const isTr = language === 'tr';
      const fullName = `${settings?.firstName ?? ''} ${settings?.lastName ?? ''}`.trim();
      const monthlyNet = Object.values(settings?.monthlySalaries ?? {})[new Date().getMonth()] ?? 0;
      const yr = new Date().getFullYear();

      const rows = payrolls.map((p) => `
        <tr>
          <td class="strong">${p.month}</td>
          <td class="num">${fmtTL(p.grossTotal)}</td>
          <td class="num neg">${fmtTL(p.sgkWorker)}</td>
          <td class="num neg">${fmtTL(p.unemploymentWorker)}</td>
          <td class="num neg">${fmtTL(p.incomeTax)}</td>
          <td class="num neg">${fmtTL(p.stampTax)}</td>
          <td class="num pos">${fmtTL(p.netTotal)}</td>
        </tr>`).join('');

      const totalDeductions = totalPayroll.sgkWorker + totalPayroll.unemploymentWorker + totalPayroll.incomeTax + totalPayroll.stampTax;
      const tableHtml = `
        <table>
          <thead>
            <tr>
              <th>${isTr ? 'Ay' : 'Month'}</th>
              <th class="num">${isTr ? 'Br\u00fct' : 'Gross'}</th>
              <th class="num">${isTr ? 'SGK \u0130\u015f\u00e7i' : 'SSI'}</th>
              <th class="num">${isTr ? '\u0130\u015fsizlik' : 'Unemp.'}</th>
              <th class="num">${isTr ? 'Gelir Vergisi' : 'Income Tax'}</th>
              <th class="num">${isTr ? 'Damga' : 'Stamp'}</th>
              <th class="num">${isTr ? 'Net' : 'Net'}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="total-row">
              <td>${isTr ? 'TOPLAM' : 'TOTAL'}</td>
              <td class="num">${fmtTL(totalPayroll.grossTotal)}</td>
              <td class="num">${fmtTL(totalPayroll.sgkWorker)}</td>
              <td class="num">${fmtTL(totalPayroll.unemploymentWorker)}</td>
              <td class="num">${fmtTL(totalPayroll.incomeTax)}</td>
              <td class="num">${fmtTL(totalPayroll.stampTax)}</td>
              <td class="num">${fmtTL(totalPayroll.netTotal)}</td>
            </tr>
          </tbody>
        </table>
        <div class="totals">
          <div class="row"><span class="label">${isTr ? 'Toplam Br\u00fct' : 'Total Gross'}</span><span class="value">${fmtTL(totalPayroll.grossTotal)}</span></div>
          <div class="row"><span class="label">${isTr ? 'Toplam Kesinti' : 'Total Deductions'}</span><span class="value">${fmtTL(totalDeductions)}</span></div>
          <div class="row grand"><span class="label">${isTr ? 'TOPLAM NET HAKED\u0130\u015e' : 'TOTAL NET'}</span><span class="value">${fmtTL(totalPayroll.netTotal)}</span></div>
        </div>`;

      const html = buildCorporateHtml({
        reportTitle: isTr ? 'BORDRO TASLA\u011eI' : 'PAYROLL DRAFT',
        reportSubtitle: isTr ? 'Y\u0131ll\u0131k Bordro Taslak Belgesi' : 'Annual Payroll Draft',
        reportNo: makeReportNo('MS-BR'),
        period: `${yr} ${isTr ? 'Y\u0131l\u0131' : 'Year'}`,
        fullName,
        email: settings?.email || '',
        netSalary: monthlyNet,
        language: isTr ? 'tr' : 'en',
        fileName: `Mesai+_Bordro_${yr}.pdf`,
      }, [{ title: isTr ? 'Ayl\u0131k Bordro Detay\u0131' : 'Monthly Payroll Breakdown', body: tableHtml }]);

      await shareCorporatePdf(html, `Mesai+_Bordro_${yr}.pdf`, isTr ? 'tr' : 'en');
      setIsGeneratingPDF(false);
    } catch (error) {
      console.error('PDF Error:', error);
      setIsGeneratingPDF(false);
    }
  };

  const currentYear = new Date().getFullYear();

  const monthlyOvertimeEarnings = useMemo(() => {
    const result: Record<string, number> = {};
    Object.entries(entries || {}).forEach(([key, entry]) => {
      const d = fromDateKey(key);
      if (d.getFullYear() === currentYear) {
        const monthIndex = d.getMonth();
        const monthKey = MONTHS_TR[monthIndex];
        result[monthKey] = (result[monthKey] ?? 0) + (entry.earnings ?? 0);
      }
    });
    return result;
  }, [entries, currentYear]);

  const payrolls = useMemo(() => {
    const monthlySalary = 
      Object.values(settings?.monthlySalaries ?? {})[new Date().getMonth()] ?? 0;
    
    return MONTHS_TR.map((monthTr, index) => {
      const overtimeEarnings = monthlyOvertimeEarnings[monthTr] ?? 0;
      return calculatePayroll(
        monthlySalary,
        currentYear,
        overtimeEarnings,
        0,
        0,
        monthTr
      );
    });
  }, [settings, monthlyOvertimeEarnings, currentYear]);

  const totalPayroll = useMemo(() => {
    return payrolls.reduce(
      (acc, p) => ({
        grossTotal: acc.grossTotal + p.grossTotal,
        sgkWorker: acc.sgkWorker + p.sgkWorker,
        unemploymentWorker: acc.unemploymentWorker + p.unemploymentWorker,
        besDeduction: acc.besDeduction + p.besDeduction,
        incomeTax: acc.incomeTax + p.incomeTax,
        stampTax: acc.stampTax + p.stampTax,
        netTotal: acc.netTotal + p.netTotal,
        sgkEmployer: acc.sgkEmployer + p.sgkEmployer,
        unemploymentEmployer: acc.unemploymentEmployer + p.unemploymentEmployer,
        totalEmployerCost: acc.totalEmployerCost + p.totalEmployerCost,
      }),
      {
        grossTotal: 0,
        sgkWorker: 0,
        unemploymentWorker: 0,
        besDeduction: 0,
        incomeTax: 0,
        stampTax: 0,
        netTotal: 0,
        sgkEmployer: 0,
        unemploymentEmployer: 0,
        totalEmployerCost: 0,
      }
    );
  }, [payrolls]);

  const handlePDFDownload = useCallback(() => {
    generatePayrollPDF(payrolls, totalPayroll);
  }, [payrolls, totalPayroll]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{language === 'tr' ? 'Bordro Hesapla' : 'Payroll Calculate'}</Text>
        <Text style={styles.subtitle}>{currentYear}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
          <Text style={styles.cardTitle}>{language === 'tr' ? 'Yıllık Özet' : 'Annual Summary'}</Text>
          <Pressable
            onPress={handlePDFDownload}
            disabled={isGeneratingPDF}
            style={{ opacity: isGeneratingPDF ? 0.5 : 1 }}
          >
            {isGeneratingPDF ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name="download" size={20} color={colors.accent} />
            )}
          </Pressable>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.label}>{language === 'tr' ? 'Toplam Brüt' : 'Total Gross'}</Text>
          <Text style={[styles.value, { color: colors.accent }]}>{formatTL(totalPayroll.grossTotal)}</Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.summaryRow}>
          <Text style={styles.label}>{language === 'tr' ? 'SGK İşçi' : 'SGK Worker'}</Text>
          <Text style={[styles.value, { color: colors.danger }]}>-{formatTL(totalPayroll.sgkWorker)}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.label}>{language === 'tr' ? 'İşsizlik İşçi' : 'Unemployment'}</Text>
          <Text style={[styles.value, { color: colors.danger }]}>-{formatTL(totalPayroll.unemploymentWorker)}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.label}>{language === 'tr' ? 'Gelir Vergisi' : 'Income Tax'}</Text>
          <Text style={[styles.value, { color: colors.danger }]}>-{formatTL(totalPayroll.incomeTax)}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.label}>{language === 'tr' ? 'Damga Vergisi' : 'Stamp Tax'}</Text>
          <Text style={[styles.value, { color: colors.danger }]}>-{formatTL(totalPayroll.stampTax)}</Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.summaryRow}>
          <Text style={[styles.label, { fontWeight: '700', fontSize: 14 }]}>
            {language === 'tr' ? 'Toplam Net' : 'Total Net'}
          </Text>
          <Text style={[styles.value, { color: colors.accent, fontWeight: '700', fontSize: 16 }]}>
            {formatTL(totalPayroll.netTotal)}
          </Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, marginTop: spacing.lg }]}>
        <Text style={styles.cardTitle}>{language === 'tr' ? 'Aylık Detay' : 'Monthly Detail'}</Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ marginTop: spacing.md }}>
          <View>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableCellHeader, { width: 70 }]}>
                {language === 'tr' ? 'Ay' : 'Month'}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellHeader, { width: 90 }]}>
                {language === 'tr' ? 'Brüt' : 'Gross'}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellHeader, { width: 90 }]}>
                SGK İ.
              </Text>
              <Text style={[styles.tableCell, styles.tableCellHeader, { width: 90 }]}>
                {language === 'tr' ? 'İşsiz' : 'Unemp'}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellHeader, { width: 90 }]}>
                {language === 'tr' ? 'Vergi' : 'Tax'}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellHeader, { width: 90 }]}>
                {language === 'tr' ? 'Damga' : 'Stamp'}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellHeader, { width: 90 }]}>
                {language === 'tr' ? 'Net' : 'Net'}
              </Text>
            </View>
            
            {payrolls.map((p, i) => (
              <View key={i} style={[styles.tableRow, i % 2 === 1 && { backgroundColor: colors.bg }]}>
                <Text style={[styles.tableCell, { width: 70, fontWeight: '600' }]}>
                  {p.month.substring(0, 3)}
                </Text>
                <Text style={[styles.tableCell, { width: 90 }]}>
                  {formatTL(p.grossTotal)}
                </Text>
                <Text style={[styles.tableCell, { width: 90 }]}>
                  {formatTL(p.sgkWorker)}
                </Text>
                <Text style={[styles.tableCell, { width: 90 }]}>
                  {formatTL(p.unemploymentWorker)}
                </Text>
                <Text style={[styles.tableCell, { width: 90 }]}>
                  {formatTL(p.incomeTax)}
                </Text>
                <Text style={[styles.tableCell, { width: 90 }]}>
                  {formatTL(p.stampTax)}
                </Text>
                <Text style={[styles.tableCell, { width: 90, fontWeight: '600', color: colors.accent }]}>
                  {formatTL(p.netTotal)}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.md },
    header: { marginBottom: spacing.lg },
    title: { color: colors.text, fontSize: 28, fontWeight: '800' },
    subtitle: { color: colors.accent, fontSize: 14, fontWeight: '600', marginTop: spacing.xs },
    
    card: {
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: spacing.md,
    },
    
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    label: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '500',
    },
    value: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.sm,
    },
    
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: colors.primary,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tableCell: {
      fontSize: 11,
      color: colors.text,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.xs,
      textAlign: 'right',
    },
    tableCellHeader: {
      color: '#fff',
      fontWeight: '700',
      textAlign: 'center',
    },
  });
}
