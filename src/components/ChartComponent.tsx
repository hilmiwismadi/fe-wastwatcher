import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartData } from '../types';

interface ChartComponentProps {
  data: ChartData[];
  bgColor: string;
  height?: number;
  yAxisDomain?: [number, number]; // Optional fixed Y-axis range [min, max]
  valueUnit?: string; // Optional unit to display after value (e.g., "%", "kg")
  xAxisInterval?: number; // Optional interval for X-axis ticks (e.g., show every 5th tick)
}

// Custom tooltip to show full timestamp
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, valueUnit }: any) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload as ChartData;
    const displayTime = data.fullTimestamp || data.time;
    const value = payload[0].value;
    const formattedValue = valueUnit ? `${Number(value).toFixed(2)}${valueUnit}` : value;

    return (
      <div
        style={{
          backgroundColor: "rgba(255,255,255,0.95)",
          border: "none",
          borderRadius: "6px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          fontSize: "12px",
          padding: "8px 12px",
        }}
      >
        <p style={{ margin: 0, color: "black", fontWeight: "600" }}>
          {displayTime}
        </p>
        <p style={{ margin: "4px 0 0 0", color: "black" }}>
          Value: <strong>{formattedValue}</strong>
        </p>
      </div>
    );
  }
  return null;
};

export const ChartComponent: React.FC<ChartComponentProps> = ({
  data,
  bgColor,
  height = 120,
  yAxisDomain,
  valueUnit,
  xAxisInterval,
}) => (
  <div className={`rounded-lg p-2 ${bgColor}`}>
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.3)" />
        <XAxis
          dataKey="time"
          stroke="white"
          fontSize={10}
          interval={xAxisInterval !== undefined ? xAxisInterval : 'preserveStartEnd'}
        />
        <YAxis
          stroke="white"
          fontSize={10}
          domain={yAxisDomain || ['auto', 'auto']}
          tickFormatter={valueUnit ? (value) => `${value}${valueUnit}` : undefined}
        />
        <Tooltip content={<CustomTooltip valueUnit={valueUnit} />} />
        <Line
          type="linear"
          dataKey="value"
          stroke="white"
          strokeWidth={2}
          dot={{ fill: "white", strokeWidth: 1, r: 2 }}
          activeDot={{
            r: 4,
            fill: "white",
            strokeWidth: 2,
            stroke: "rgba(255,255,255,0.8)",
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);