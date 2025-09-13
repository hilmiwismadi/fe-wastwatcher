import React from 'react';
import { ToggleType } from '../types';

interface ToggleButtonProps {
  value: ToggleType;
  onChange: (value: ToggleType) => void;
  options?: { value: ToggleType; label: string }[];
  colorTheme?: string;
  size?: "small" | "normal";
}

export const ToggleButton: React.FC<ToggleButtonProps> = ({
  value,
  onChange,
  options = [
    { value: "weight", label: "Weight" },
    { value: "volume", label: "Volume" },
  ],
  colorTheme = "blue",
  size = "normal",
}) => {
  const getThemeColors = (theme: string) => {
    switch (theme) {
      case "red":
        return {
          active: "bg-red-500 text-white shadow-sm",
          inactive: "text-blue-800 hover:bg-red-50 font-medium",
          bg: "bg-red-50 border-red-200",
        };
      case "green":
        return {
          active: "bg-green-500 text-white shadow-sm",
          inactive: "text-blue-800 hover:bg-green-50 font-medium",
          bg: "bg-green-50 border-green-200",
        };
      case "yellow":
        return {
          active: "bg-yellow-500 text-white shadow-sm",
          inactive: "text-blue-800 hover:bg-yellow-50 font-medium",
          bg: "bg-yellow-50 border-yellow-200",
        };
      default:
        return {
          active: "bg-blue-500 text-white shadow-sm",
          inactive: "text-blue-800 hover:bg-blue-50 font-medium",
          bg: "bg-blue-50 border-blue-200",
        };
    }
  };

  const colors = getThemeColors(colorTheme);
  const sizeClass = size === "small" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-xs";

  return (
    <div className={`flex ${colors.bg} border rounded-lg p-1 transition-all`}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`${sizeClass} rounded-md font-medium transition-all ${
            value === option.value ? colors.active : colors.inactive
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};