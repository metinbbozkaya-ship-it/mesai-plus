import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { buildCorporateHtml, shareCorporatePdf, makeReportNo, fmtTL } from '../../services/corporateReports';
import { useApp } from '../../context/AppContext';
import { getColors, radius, spacing } from '../../theme';
import { calculatePayroll } from '../../utils/payroll';
import { formatTL } from '../../utils/salary';
import { TR_MONTHS } from '../../utils/dates';

export function AnnualSalaryReport() {
  const { settings, entries, theme, language } = useApp();
  const colors = getColors(theme);
  const styles = getStyles(colors);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const currentYear = new Date().getFullYear();
  const isTr = language === 'tr';

  // Calculate monthly overtime earnings with breakdown (50% and 100%)
  const monthlyOvertimeData = useMemo(() => {
    const { fromDateKey } = require('../../utils/dates');
    const result: Record<string, { total: number; hours50: number; earnings50: number; hours100: number; earnings100: number }> = {};
    
    TR_MONTHS.forEach(month => {
      result[month] = { total: 0, hours50: 0, earnings50: 0, hours100: 0, earnings100: 0 };
    });

    Object.entries(entries || {}).forEach(([key, entry]: [string, any]) => {
      const d = fromDateKey(key);
      if (d.getFullYear() === currentYear && !entry.isAbsence) {
        const monthIndex = d.getMonth();
        const monthName = TR_MONTHS[monthIndex];
        const earnings = entry.earnings ?? 0;
        
        if (entry.multiplier >= 2) {
          result[monthName].hours100 += entry.hours ?? 0;
          result[monthName].earnings100 += earnings;
        } else if (entry.multiplier >= 1.5) {
          result[monthName].hours50 += entry.hours ?? 0;
          result[monthName].earnings50 += earnings;
        }
        
        result[monthName].total += earnings;
      }
    });
    
    return result;
  }, [entries, currentYear]);

  // Generate payroll data for all months
  const payrolls = useMemo(() => {
    const monthlySalary = Object.values(settings?.monthlySalaries ?? {})[new Date().getMonth()] ?? 0;
    return TR_MONTHS.map((monthTr) => {
      const overtimeEarnings = monthlyOvertimeData[monthTr]?.total ?? 0;
      return calculatePayroll(monthlySalary, currentYear, overtimeEarnings, 0, 0, monthTr);
    });
  }, [settings, monthlyOvertimeData, currentYear]);

  const generatePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      const isTr2 = isTr;
      const fullName = `${settings?.firstName ?? ''} ${settings?.lastName ?? ''}`.trim();
      const monthlyNet = Object.values(settings?.monthlySalaries ?? {})[new Date().getMonth()] ?? 0;

      let totalNet = 0;
      let totalOt50 = 0;
      let totalOt100 = 0;
      const rows = payrolls.map((p) => {
        const ot = monthlyOvertimeData[p.month] || { hours50: 0, earnings50: 0, hours100: 0, earnings100: 0 };
        totalNet += p.netTotal;
        totalOt50 += ot.earnings50;
        totalOt100 += ot.earnings100;
        return `
          <tr>
            <td class="strong">${p.month}</td>
            <td class="num">${ot.hours50.toFixed(1)} ${isTr2 ? 'sa' : 'h'}</td>
            <td class="num">${fmtTL(ot.earnings50)}</td>
            <td class="num">${ot.hours100.toFixed(1)} ${isTr2 ? 'sa' : 'h'}</td>
            <td class="num">${fmtTL(ot.earnings100)}</td>
            <td class="num pos">${fmtTL(p.netTotal)}</td>
          </tr>`;
      }).join('');

      const tableHtml = `
        <table>
          <thead>
            <tr>
              <th>${isTr2 ? 'Ay' : 'Month'}</th>
              <th class="num">${isTr2 ? '%50 Saat' : '50% Hours'}</th>
              <th class="num">${isTr2 ? '%50 Tutar' : '50% Amount'}</th>
              <th class="num">${isTr2 ? '%100 Saat' : '100% Hours'}</th>
              <th class="num">${isTr2 ? '%100 Tutar' : '100% Amount'}</th>
              <th class="num">${isTr2 ? 'Net \u00dccret' : 'Net Pay'}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="total-row">
              <td>${isTr2 ? 'TOPLAM' : 'TOTAL'}</td>
              <td class="num">\u2014</td>
              <td class="num">${fmtTL(totalOt50)}</td>
              <td class="num">\u2014</td>
              <td class="num">${fmtTL(totalOt100)}</td>
              <td class="num">${fmtTL(totalNet)}</td>
            </tr>
          </tbody>
        </table>
        <div class="totals">
          <div class="row"><span class="label">${isTr2 ? 'Toplam %50 Mesai' : 'Total 50% OT'}</span><span class="value">${fmtTL(totalOt50)}</span></div>
          <div class="row"><span class="label">${isTr2 ? 'Toplam %100 Mesai' : 'Total 100% OT'}</span><span class="value">${fmtTL(totalOt100)}</span></div>
          <div class="row grand"><span class="label">${isTr2 ? 'TOPLAM NET HAKED\u0130\u015e' : 'TOTAL NET EARNED'}</span><span class="value">${fmtTL(totalNet)}</span></div>
        </div>`;

      const html = buildCorporateHtml({
        reportTitle: isTr2 ? 'YILLIK MAA\u015e RAPORU' : 'ANNUAL SALARY REPORT',
        reportSubtitle: isTr2 ? 'Y\u0131ll\u0131k Bordro \u00d6zeti' : 'Annual Payroll Summary',
        reportNo: makeReportNo('MS-AS'),
        period: `${currentYear} ${isTr2 ? 'Y\u0131l\u0131' : 'Year'}`,
        fullName,
        email: settings?.email || '',
        netSalary: monthlyNet,
        language: isTr2 ? 'tr' : 'en',
        fileName: `Mesai+_Yillik_Maas_${currentYear}.pdf`,
      }, [{ title: isTr2 ? 'Ayl\u0131k Detay Tablosu' : 'Monthly Breakdown', body: tableHtml }]);

      await shareCorporatePdf(html, `Mesai+_Yillik_Maas_${currentYear}.pdf`, isTr2 ? 'tr' : 'en');
      setIsGeneratingPDF(false);
    } catch (error) {
      console.error('PDF Error:', error);
      setIsGeneratingPDF(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{isTr ? 'Yıllık Maaş Raporu' : 'Annual Salary Report'}</Text>
        <Text style={styles.subtitle}>{currentYear} {isTr ? 'Yılı' : 'Year'}</Text>
      </View>

      {/* Download Button */}
      <Pressable
        onPress={generatePDF}
        disabled={isGeneratingPDF}
        style={({ pressed }) => [
          styles.downloadBtn,
          { backgroundColor: colors.primary, opacity: isGeneratingPDF ? 0.6 : pressed ? 0.8 : 1 },
        ]}
      >
        {isGeneratingPDF ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="download" size={20} color="#fff" />
            <Text style={styles.downloadBtnText}>
              {isTr ? 'PDF Olarak İndir' : 'Download as PDF'}
            </Text>
          </>
        )}
      </Pressable>

      {/* Monthly Table */}
      <View style={[styles.card, { backgroundColor: colors.surface, padding: 0, overflow: 'hidden' }]}>
        {/* Table Header */}
        <View style={[styles.tableRow, { backgroundColor: colors.primary }]}>
          <Text style={[styles.cellAy, styles.headerText]}>{isTr ? 'Ay' : 'Mo'}</Text>
          <Text style={[styles.cell50, styles.headerText]}>{isTr ? '%50 Mesai' : '%50 OT'}</Text>
          <Text style={[styles.cell100, styles.headerText]}>{isTr ? '%100 Mesai' : '%100 OT'}</Text>
          <Text style={[styles.cellNet, styles.headerText]}>{isTr ? 'Net' : 'Net'}</Text>
        </View>

        {/* Table Body */}
        {payrolls.map((p, i) => {
          const ot = monthlyOvertimeData[p.month] || { total: 0, hours50: 0, earnings50: 0, hours100: 0, earnings100: 0 };
          return (
            <View
              key={i}
              style={[
                styles.tableRow,
                i % 2 === 1 && { backgroundColor: colors.bg },
              ]}
            >
              <Text style={[styles.cellAy, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                {p.month.substring(0, 3)}
              </Text>
              <Text style={[styles.cell50, { color: colors.text }]} numberOfLines={1}>
                {ot.hours50.toFixed(1)}s / {formatTL(ot.earnings50)}
              </Text>
              <Text style={[styles.cell100, { color: colors.text }]} numberOfLines={1}>
                {ot.hours100.toFixed(1)}s / {formatTL(ot.earnings100)}
              </Text>
              <Text style={[styles.cellNet, { color: colors.success, fontWeight: '600' }]} numberOfLines={1}>
                {formatTL(p.netTotal)}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    content: { padding: spacing.md, paddingBottom: spacing.xl * 2, gap: spacing.md },
    header: { marginBottom: spacing.sm },
    title: { color: colors.text, fontSize: 24, fontWeight: '800' },
    subtitle: { color: colors.accent, fontSize: 13, fontWeight: '600', marginTop: spacing.xs },
    card: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    downloadBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      gap: spacing.sm,
    },
    downloadBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 11,
    },
    cellAy: {
      width: 40,
      paddingVertical: 10,
      paddingHorizontal: 6,
      fontSize: 12,
      textAlign: 'center',
    },
    cell50: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 4,
      fontSize: 10,
    },
    cell100: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 4,
      fontSize: 10,
    },
    cellNet: {
      width: 80,
      paddingVertical: 10,
      paddingHorizontal: 6,
      fontSize: 11,
      textAlign: 'right',
    },
  });
}