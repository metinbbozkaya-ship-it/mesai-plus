import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Circle } from 'react-native-svg';

interface Props {
  data: number[];
  width?: number;
  height?: number;
  color: string;
  fillColor?: string;
  strokeWidth?: number;
  showLastDot?: boolean;
}

/**
 * Sparkline — tiny SVG line chart for trend visualization
 * Used inside month cards to show earnings trend
 */
export function Sparkline({
  data,
  width = 80,
  height = 28,
  color,
  fillColor,
  strokeWidth = 1.8,
  showLastDot = true,
}: Props) {
  const { linePath, fillPath, lastPoint } = useMemo(() => {
    if (!data || data.length < 2) {
      return { linePath: '', fillPath: '', lastPoint: null };
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pad = 3;
    const w = width - pad * 2;
    const h = height - pad * 2;
    const stepX = w / (data.length - 1);

    const points = data.map((v, i) => ({
      x: pad + i * stepX,
      y: pad + h - ((v - min) / range) * h,
    }));

    // Smooth line via quadratic bezier midpoints
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      path += ` Q ${prev.x} ${prev.y}, ${midX} ${midY}`;
    }
    path += ` T ${points[points.length - 1].x} ${points[points.length - 1].y}`;

    const fill = `${path} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return {
      linePath: path,
      fillPath: fill,
      lastPoint: points[points.length - 1],
    };
  }, [data, width, height]);

  if (!linePath) return <View style={{ width, height }} />;

  const gradId = `spark-${color.replace('#', '')}`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={fillColor || color} stopOpacity="0.35" />
          <Stop offset="1" stopColor={fillColor || color} stopOpacity="0" />
        </SvgGradient>
      </Defs>
      <Path d={fillPath} fill={`url(#${gradId})`} />
      <Path d={linePath} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {showLastDot && lastPoint && (
        <Circle cx={lastPoint.x} cy={lastPoint.y} r={2.5} fill={color} />
      )}
    </Svg>
  );
}
