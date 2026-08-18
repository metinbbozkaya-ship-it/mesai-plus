import React from 'react';
import { FlexWidget, TextWidget, IconWidget } from 'react-native-android-widget';

export interface MesaiWidgetProps {
  monthEarnings: number;
  monthLabel: string;
  daysWorked: number;
  daysLeft: number;
  goal: number;
  goalPct: number;
}

const fmtTL = (n: number) => {
  try {
    return '₺' + Math.round(n).toLocaleString('tr-TR');
  } catch {
    return '₺' + Math.round(n);
  }
};

export function MesaiWidget({
  monthEarnings,
  monthLabel,
  daysWorked,
  daysLeft,
  goal,
  goalPct,
}: MesaiWidgetProps) {
  const pctClamped = Math.max(0, Math.min(100, Math.round(goalPct)));
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#0B1220',
        borderRadius: 24,
        padding: 16,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
        }}
      >
        <FlexWidget
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <FlexWidget
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#3B82F6',
              marginRight: 6,
            }}
          />
          <TextWidget
            text="Mesai+"
            style={{ fontSize: 12, color: '#3B82F6', fontWeight: '700' }}
          />
        </FlexWidget>
        <TextWidget
          text={monthLabel}
          style={{ fontSize: 11, color: '#94A3B8' }}
        />
      </FlexWidget>

      <FlexWidget
        style={{
          flexDirection: 'column',
          marginTop: 6,
        }}
      >
        <TextWidget
          text="Bu Ay Kazanç"
          style={{ fontSize: 11, color: '#94A3B8', marginBottom: 2 }}
        />
        <TextWidget
          text={fmtTL(monthEarnings)}
          style={{ fontSize: 22, color: '#FFFFFF', fontWeight: '700' }}
        />
      </FlexWidget>

      {goal > 0 ? (
        <FlexWidget style={{ flexDirection: 'column', marginTop: 4 }}>
          <FlexWidget
            style={{
              width: 'match_parent',
              height: 4,
              borderRadius: 2,
              backgroundColor: '#1F2937',
            }}
          >
            <FlexWidget
              style={{
                width: `${pctClamped}%` as any,
                height: 4,
                borderRadius: 2,
                backgroundColor: '#3B82F6',
              }}
            />
          </FlexWidget>
          <TextWidget
            text={`Hedef: %${pctClamped}`}
            style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}
          />
        </FlexWidget>
      ) : (
        <FlexWidget />
      )}

      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: 'match_parent',
          marginTop: 6,
        }}
      >
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget
            text={String(daysWorked)}
            style={{ fontSize: 16, color: '#22C55E', fontWeight: '700' }}
          />
          <TextWidget
            text="Çalışılan"
            style={{ fontSize: 10, color: '#94A3B8' }}
          />
        </FlexWidget>
        <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
          <TextWidget
            text={String(daysLeft)}
            style={{ fontSize: 16, color: '#F97316', fontWeight: '700' }}
          />
          <TextWidget
            text="Kalan Gün"
            style={{ fontSize: 10, color: '#94A3B8' }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
