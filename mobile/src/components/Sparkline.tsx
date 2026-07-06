import React from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

/** Smooth area sparkline. Sizes itself to its container width. */
export function Sparkline({
  data,
  height = 72,
  stroke,
  strokeWidth = 2.5
}: {
  data: number[];
  height?: number;
  stroke: string;
  strokeWidth?: number;
}) {
  const [width, setWidth] = React.useState(0);

  const { linePath, areaPath, lastX, lastY } = React.useMemo(() => {
    if (!width || data.length < 2) return { linePath: "", areaPath: "", lastX: 0, lastY: 0 };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;

    const padY = strokeWidth + 4;
    const usable = height - padY * 2;

    const pts = data.map((v, i) => ({
      x: (i / (data.length - 1)) * width,
      y: padY + (1 - (v - min) / span) * usable
    }));

    // Catmull-Rom style smoothing via cubic segments
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const last = pts[pts.length - 1];
    const area = `${d} L ${width} ${height} L 0 ${height} Z`;

    return { linePath: d, areaPath: area, lastX: last.x, lastY: last.y };
  }, [data, width, height, strokeWidth]);

  return (
    <View style={{ height, width: "100%" }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && linePath ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={stroke} stopOpacity={0.25} />
              <Stop offset="1" stopColor={stroke} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>
          <Path d={areaPath} fill="url(#sparkFill)" />
          <Path d={linePath} stroke={stroke} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
          <Circle cx={lastX} cy={lastY} r={4} fill={stroke} />
        </Svg>
      ) : null}
    </View>
  );
}

/** Circular progress ring (used by the checklist). */
export function ProgressRing({
  size = 52,
  strokeWidth = 5,
  progress,
  color,
  track,
  children
}: {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0..1
  color: string;
  track: string;
  children?: React.ReactNode;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c}`}
          strokeDashoffset={c * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}
