import React from 'react';

interface BarData {
  name: string;
  value: number;
  color: string;
}

interface BarChartProps {
  data: BarData[];
  selectedIndex: number | null;
  onBarHover: (index: number | null) => void;
  unit?: string; // Unit to display (e.g., '%', 'g', 'kg')
}

export const BarChart: React.FC<BarChartProps> = ({ data, selectedIndex, onBarHover, unit = '%' }) => {
  // Calculate total for percentage-based bar widths (for non-percentage units like grams)
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Determine if we need to calculate percentages for bar width
  const isPercentageUnit = unit === '%';

  return (
    <div className="space-y-2">
      {data.map((item, index) => {
        // For percentage units, use value directly; for others, calculate percentage of total
        const barWidth = isPercentageUnit ? item.value : (item.value / total) * 100;
        const displayValue = item.value;

        return (
          <div
            key={item.name}
            className={`transition-all cursor-pointer ${
              selectedIndex === index ? 'scale-[1.02]' : 'hover:scale-[1.01]'
            }`}
            onMouseEnter={() => onBarHover(index)}
            onMouseLeave={() => onBarHover(null)}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-medium text-gray-800">
                  {item.name}
                </span>
              </div>
              <span
                className={`text-xs font-bold transition-all ${
                  selectedIndex === index ? "text-black scale-110" : ""
                }`}
                style={{ color: item.color }}
              >
                {displayValue}{unit}
              </span>
            </div>
            <div className="relative bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  backgroundColor: item.color,
                  width: `${barWidth}%`,
                  boxShadow: selectedIndex === index ? `0 0 10px ${item.color}50` : 'none',
                  filter: selectedIndex === index ? 'brightness(1.1)' : 'none'
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-white drop-shadow-sm">
                  {displayValue}{unit}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};