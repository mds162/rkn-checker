import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import type { CheckResult, Violation } from './types';
import { BRAND_COLORS } from './brand';
import path from 'path';

Font.register({
  family: 'Inter',
  fonts: [
    { src: path.join(process.cwd(), 'public/fonts/Inter-Regular.ttf'), fontWeight: 400 },
    { src: path.join(process.cwd(), 'public/fonts/Inter-Regular.ttf'), fontWeight: 400, fontStyle: 'italic' },
    { src: path.join(process.cwd(), 'public/fonts/Inter-Medium.ttf'), fontWeight: 500 },
    { src: path.join(process.cwd(), 'public/fonts/Inter-Bold.ttf'), fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    backgroundColor: BRAND_COLORS.bgPrimary,
    padding: 40,
    fontFamily: 'Inter',
    fontSize: 11,
    color: BRAND_COLORS.textPrimary,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: `1 solid ${BRAND_COLORS.borderLight}`,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 700,
    color: BRAND_COLORS.primary,
  },
  logoAccent: {
    color: BRAND_COLORS.accent,
  },
  headerRight: {
    fontSize: 9,
    color: BRAND_COLORS.textSecondary,
    textAlign: 'right',
  },
  // Check info table
  infoTable: {
    marginBottom: 20,
    borderRadius: 4,
    border: `1 solid ${BRAND_COLORS.borderLight}`,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderBottom: `1 solid ${BRAND_COLORS.borderLight}`,
  },
  infoRowLast: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  infoLabel: {
    width: '30%',
    fontSize: 10,
    color: BRAND_COLORS.textSecondary,
  },
  infoValue: {
    width: '70%',
    fontSize: 10,
    color: BRAND_COLORS.textPrimary,
    fontWeight: 500,
  },
  // Summary grid
  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: BRAND_COLORS.bgSecondary,
    padding: 12,
    borderRadius: 6,
  },
  summaryCardTitle: {
    fontSize: 8,
    textTransform: 'uppercase',
    color: BRAND_COLORS.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  summaryCardNumber: {
    fontSize: 24,
    fontWeight: 500,
  },
  summaryCardSub: {
    fontSize: 8,
    color: BRAND_COLORS.textSecondary,
    marginTop: 2,
  },
  // Total fine block
  totalFineBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.bgSecondary,
    padding: 14,
    borderRadius: 6,
    marginBottom: 20,
  },
  totalFineLabel: {
    fontSize: 10,
    color: BRAND_COLORS.textSecondary,
  },
  totalFineValue: {
    fontSize: 14,
    fontWeight: 700,
    color: BRAND_COLORS.accent,
  },
  // Section title
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: BRAND_COLORS.textSecondary,
    marginBottom: 10,
    marginTop: 4,
  },
  // Violation cards
  violationCard: {
    marginBottom: 10,
    borderRadius: 6,
    overflow: 'hidden',
    border: `1 solid ${BRAND_COLORS.borderLight}`,
  },
  violationCardInner: {
    padding: 12,
    paddingLeft: 15,
  },
  violationTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  violationTitle: {
    fontSize: 11,
    fontWeight: 500,
    flex: 1,
    marginRight: 8,
  },
  violationBadgeRow: {
    alignItems: 'flex-end',
    gap: 3,
  },
  riskBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 8,
    fontWeight: 700,
  },
  lawArticle: {
    fontSize: 8,
    color: BRAND_COLORS.textTertiary,
    fontFamily: 'Courier',
    marginTop: 2,
  },
  violationEvidence: {
    fontSize: 10,
    color: BRAND_COLORS.textSecondary,
    marginBottom: 6,
  },
  fineRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
  },
  fineLabel: {
    fontSize: 9,
    color: BRAND_COLORS.textSecondary,
  },
  fineValue: {
    fontSize: 9,
    fontWeight: 700,
    color: BRAND_COLORS.textPrimary,
  },
  enforcementBlock: {
    backgroundColor: BRAND_COLORS.bgSecondary,
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  enforcementTitle: {
    fontSize: 8,
    textTransform: 'uppercase',
    color: BRAND_COLORS.textSecondary,
    fontWeight: 700,
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  enforcementText: {
    fontSize: 9,
    color: BRAND_COLORS.textSecondary,
    fontStyle: 'italic',
  },
  // Disclaimer
  disclaimer: {
    marginTop: 24,
    paddingTop: 12,
    borderTop: `1 solid ${BRAND_COLORS.borderLight}`,
  },
  disclaimerText: {
    fontSize: 8,
    color: BRAND_COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 1.5,
  },
  // Footer
  footer: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 8,
    color: BRAND_COLORS.textTertiary,
  },
  footerCta: {
    marginTop: 6,
    fontSize: 9,
    color: BRAND_COLORS.primary,
    textAlign: 'center',
    fontWeight: 500,
  },
  watermark: {
    position: 'absolute',
    top: '45%',
    left: '15%',
    fontSize: 72,
    fontWeight: 700,
    color: BRAND_COLORS.borderLight,
    opacity: 0.05,
    transform: 'rotate(-35deg)',
  },
});

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatFine(amount: number): string {
  return amount.toLocaleString('ru-RU') + ' ₽';
}

function sortByRisk(violations: Violation[]): Violation[] {
  const order = { high: 0, medium: 1, low: 2 };
  return [...violations].sort((a, b) => {
    const aLevel = a.realRiskLevel ?? 'medium';
    const bLevel = b.realRiskLevel ?? 'medium';
    const diff = (order[aLevel] ?? 1) - (order[bLevel] ?? 1);
    if (diff !== 0) return diff;
    return b.fineMax - a.fineMax;
  });
}

function getRiskColors(level?: string) {
  if (level === 'high') return { bg: BRAND_COLORS.riskHighBg, text: BRAND_COLORS.riskHighText, border: BRAND_COLORS.riskHighBorder, label: 'Высокий риск' };
  if (level === 'medium') return { bg: BRAND_COLORS.riskMediumBg, text: BRAND_COLORS.riskMediumText, border: BRAND_COLORS.riskMediumBorder, label: 'Средний риск' };
  return { bg: BRAND_COLORS.riskLowBg, text: BRAND_COLORS.riskLowText, border: BRAND_COLORS.riskLowBorder, label: 'Низкий риск' };
}

function ViolationCard({ violation }: { violation: Violation }) {
  const risk = getRiskColors(violation.realRiskLevel);
  return (
    <View style={[styles.violationCard, { borderLeftWidth: 3, borderLeftColor: risk.border }]} wrap={false}>
      <View style={styles.violationCardInner}>
        <View style={styles.violationTopRow}>
          <Text style={styles.violationTitle}>{violation.title}</Text>
          <View style={styles.violationBadgeRow}>
            <Text style={[styles.riskBadge, { backgroundColor: risk.bg, color: risk.text }]}>
              {risk.label}
            </Text>
            <Text style={styles.lawArticle}>{violation.law}</Text>
          </View>
        </View>
        <Text style={styles.violationEvidence}>{violation.evidence}</Text>
        <View style={styles.fineRow}>
          <Text style={styles.fineLabel}>Штраф для юр. лица:</Text>
          <Text style={styles.fineValue}>{formatFine(violation.fineMin)} – {formatFine(violation.fineMax)}</Text>
        </View>
        {violation.enforcementNote && (
          <View style={styles.enforcementBlock}>
            <Text style={styles.enforcementTitle}>Реальная практика</Text>
            <Text style={styles.enforcementText}>{violation.enforcementNote}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function Header({ result }: { result: CheckResult }) {
  return (
    <View style={styles.header}>
      <Text style={styles.logoText}>
        Аудит<Text style={styles.logoAccent}>152</Text>
      </Text>
      <View style={styles.headerRight}>
        <Text>{formatDate(result.checkedAt)}</Text>
        <Text>Режим: {result.mode === 'pro' ? 'Pro-аудит' : 'Quick-проверка'}</Text>
      </View>
    </View>
  );
}

function CheckInfo({ result }: { result: CheckResult }) {
  let hostname = result.url;
  try { hostname = new URL(result.url).hostname; } catch { /* keep original */ }

  return (
    <View style={styles.infoTable}>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Сайт</Text>
        <Text style={styles.infoValue}>{hostname}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Дата проверки</Text>
        <Text style={styles.infoValue}>{formatDate(result.checkedAt)}</Text>
      </View>
      <View style={styles.infoRowLast}>
        <Text style={styles.infoLabel}>Режим</Text>
        <Text style={styles.infoValue}>{result.mode === 'pro' ? 'Pro (многостраничный анализ + AI)' : 'Quick (быстрая проверка)'}</Text>
      </View>
    </View>
  );
}

function SummaryGrid({ result }: { result: CheckResult }) {
  const highCount = result.violations.filter(v => v.realRiskLevel === 'high').length;
  const medCount = result.violations.filter(v => v.realRiskLevel === 'medium').length;
  const lowCount = result.violations.filter(v => v.realRiskLevel === 'low' || !v.realRiskLevel).length;

  return (
    <View style={styles.summaryGrid}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryCardTitle}>Всего нарушений</Text>
        <Text style={[styles.summaryCardNumber, { color: BRAND_COLORS.textPrimary }]}>
          {result.violations.length}
        </Text>
        <Text style={styles.summaryCardSub}>из {result.rulesChecked} проверок</Text>
      </View>
      <View style={styles.summaryCard}>
        <Text style={[styles.summaryCardTitle, { color: BRAND_COLORS.riskHighText }]}>Высокий риск</Text>
        <Text style={[styles.summaryCardNumber, { color: BRAND_COLORS.riskHighText }]}>{highCount}</Text>
        <Text style={styles.summaryCardSub}>нарушений</Text>
      </View>
      <View style={styles.summaryCard}>
        <Text style={[styles.summaryCardTitle, { color: BRAND_COLORS.riskMediumText }]}>Средний риск</Text>
        <Text style={[styles.summaryCardNumber, { color: BRAND_COLORS.riskMediumText }]}>{medCount}</Text>
        <Text style={styles.summaryCardSub}>нарушений</Text>
      </View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryCardTitle}>Низкий риск</Text>
        <Text style={[styles.summaryCardNumber, { color: BRAND_COLORS.textSecondary }]}>{lowCount}</Text>
        <Text style={styles.summaryCardSub}>нарушений</Text>
      </View>
    </View>
  );
}

function TotalFine({ result }: { result: CheckResult }) {
  if (result.violations.length === 0) return null;
  return (
    <View style={styles.totalFineBlock}>
      <Text style={styles.totalFineLabel}>Возможный совокупный штраф</Text>
      <Text style={styles.totalFineValue}>
        {formatFine(result.totalFineMin)} – {formatFine(result.totalFineMax)}
      </Text>
    </View>
  );
}

function Disclaimer() {
  return (
    <View style={styles.disclaimer}>
      <Text style={styles.disclaimerText}>
        Результаты автоматической проверки носят информационный характер и не являются юридическим заключением.{'\n'}
        Реальная квалификация нарушений зависит от обстоятельств, статуса оператора ПДн, поданных уведомлений и судебной практики.{'\n'}
        Для точной оценки рисков обратитесь к юристу.
      </Text>
    </View>
  );
}

export function PdfReport({ result }: { result: CheckResult }) {
  const sorted = sortByRisk(result.violations);
  const isQuick = result.mode === 'quick';
  let hostname = result.url;
  try { hostname = new URL(result.url).hostname; } catch { /* keep original */ }

  return (
    <Document title={`Аудит ${hostname}`} author="Аудит152">
      <Page size="A4" style={styles.page}>
        {isQuick && (
          <Text style={styles.watermark}>QUICK CHECK</Text>
        )}

        <Header result={result} />
        <CheckInfo result={result} />
        <SummaryGrid result={result} />
        <TotalFine result={result} />

        {sorted.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>ДЕТАЛЬНЫЙ ОТЧЁТ</Text>
            {sorted.map((v, i) => (
              <ViolationCard key={i} violation={v} />
            ))}
          </>
        )}

        {sorted.length === 0 && (
          <View style={{ padding: 20, backgroundColor: BRAND_COLORS.bgSecondary, borderRadius: 6, marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: 500, color: '#16a34a', textAlign: 'center' }}>
              Нарушений не обнаружено
            </Text>
          </View>
        )}

        <Disclaimer />

        <View style={styles.footer}>
          <Text>аудит152.рф · отчёт сгенерирован {formatDate(result.checkedAt)}</Text>
          {isQuick && (
            <Text style={styles.footerCta}>
              Хотите подробный анализ каждого нарушения? Pro-режим: аудит152.рф
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
}
