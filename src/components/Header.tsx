import React from 'react';
import { Battery, Download } from "lucide-react";

interface HeaderProps {
  trashBinName: string;
  batteryPercentage: number;
  onExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  trashBinName,
  batteryPercentage,
  onExport,
}) => {
  return (
    <div className="flex justify-between items-center bg-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-sm">
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <h1 className="text-sm sm:text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent truncate">
          {trashBinName}
        </h1>
        <div className="flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-blue-500 to-blue-600 px-2 py-1 rounded-lg shadow-sm flex-shrink-0">
          <Battery className="w-3 h-3 text-white" />
          <span className="font-bold text-white text-xs">
            {batteryPercentage}%
          </span>
        </div>
      </div>
      <button 
        onClick={onExport}
        className="flex items-center gap-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-2 sm:px-3 py-1.5 rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-sm font-medium text-xs flex-shrink-0 ml-2"
      >
        <span className="hidden sm:inline">Export</span>
        <Download className="w-3 h-3" />
      </button>
    </div>
  );
};