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
}

export const ChartComponent: React.FC<ChartComponentProps> = ({
  data,
  bgColor,
  height = 120,
}) => (
  <div className={`rounded-lg p-2 ${bgColor}`}>
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.3)" />
        <XAxis dataKey="time" stroke="white" fontSize={10} />
        <YAxis stroke="white" fontSize={10} />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(255,255,255,0.95)",
            border: "none",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            fontSize: "12px",
          }}
          labelStyle={{ color: "black" }}
          itemStyle={{ color: "black" }}
        />
        <Line
          type="monotone"
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