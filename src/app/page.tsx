"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Battery, Download, AlertCircle, Calendar } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Types
interface TrashData {
  organic: number;
  anorganic: number;
  residue: number;
  empty?: number;
}


const TrashBinDashboard = () => {
  // State management
  const [compositionToggle, setCompositionToggle] = useState<
    "weight" | "volume"
  >("weight");
  const [totalToggle, setTotalToggle] = useState<"weight" | "volume">("weight");
  const [residueToggle, setResidueToggle] = useState<"weight" | "volume">(
    "weight"
  );
  const [selectedSlice, setSelectedSlice] = useState<number | null>(null);

  const [startDate, setStartDate] = useState("2025-01-25");
  const [startTime, setStartTime] = useState("10:00");
  const [endDate, setEndDate] = useState("2025-01-25");
  const [endTime, setEndTime] = useState("18:00");

  // Mock data
  const trashBinName = "Trash Bin Kantin It 1";
  const batteryPercentage = 80;
  const condition = "Menumpuk di satu sisi";

  const currentWeight: TrashData = {
    organic: 22.5,
    anorganic: 30.8,
    residue: 38.6,
  };
  const currentVolume: TrashData = {
    organic: 25,
    anorganic: 30,
    residue: 35,
    empty: 10,
  };

  const currentTotals = {
    weight: 72.5,
    volume: 25,
  };

  const currentSpecific = {
    organic: { weight: 72.1, volume: 95 },
    anorganic: { weight: 72.1, volume: 25 },
    residue: { weight: 72.1, volume: 25 },
  };

  // Generate mock chart data
  const generateChartData = useCallback((): ChartData[] => {
    const data: ChartData[] = [];
    const hours = ["06:00", "09:00", "12:00", "15:00", "18:00"];

    hours.forEach((hour) => {
      data.push({
        time: hour,
        value: Math.floor(Math.random() * 80) + 20,
      });
    });

    return data;
  }, []);

  const [totalChartData, setTotalChartData] = useState<ChartData[]>([]);
  const [residueChartData, setResidueChartData] = useState<ChartData[]>([]);
  const [organicChartData, setOrganicChartData] = useState<ChartData[]>([]);
  const [anorganicChartData, setAnorganicChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    setTotalChartData(generateChartData());
    setResidueChartData(generateChartData());
    setOrganicChartData(generateChartData());
    setAnorganicChartData(generateChartData());
  }, [generateChartData]);

  // Donut chart data
  const getDonutData = (type: "weight" | "volume") => {
    const data = type === "weight" ? currentWeight : currentVolume;
    return [
      { name: "Organic", value: data.organic, color: "#22c55e" },
      { name: "Anorganic", value: data.anorganic, color: "#eab308" },
      { name: "Residue", value: data.residue, color: "#ef4444" },
      ...(data.empty
        ? [{ name: "Empty", value: data.empty, color: "#94a3b8" }]
        : []),
    ];
  };

  // Check if any bin is full (>90% volume)
  const isAnyBinFull = () => {
    return (
      currentSpecific.organic.volume > 90 ||
      currentSpecific.anorganic.volume > 90 ||
      currentSpecific.residue.volume > 90
    );
  };

  const handleApplyDateRange = () => {
    // Regenerate chart data when date range is applied
    setTotalChartData(generateChartData());
    setResidueChartData(generateChartData());
    setOrganicChartData(generateChartData());
    setAnorganicChartData(generateChartData());
  };

  // Enhanced Toggle button component
  const ToggleButton = ({
    value,
    onChange,
    options = [
      { value: "weight", label: "Weight" },
      { value: "volume", label: "Volume" },
    ],
    colorTheme = "blue",
    size = "normal",
  }: {
    value: "weight" | "volume";
    onChange: (value: "weight" | "volume") => void;
    options?: { value: "weight" | "volume"; label: string }[];
    colorTheme?: string;
    size?: "small" | "normal";
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
    const sizeClass =
      size === "small" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-xs";

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

  // Enhanced Chart component with colored background
  type ChartData = {
    time: string;
    value: number;
  };

  const ChartComponent = ({
    data,
    bgColor,
    height = 120,
  }: {
    data: ChartData[];
    bgColor: string;
    height?: number;
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
            labelStyle={{ color: "black" }} // <-- time label jadi hitam
            itemStyle={{ color: "black" }} // <-- value juga hitam
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="white" // garis putih
            strokeWidth={3}
            dot={{ fill: "white", strokeWidth: 2, r: 4 }}
            activeDot={{
              r: 6,
              fill: "white",
              strokeWidth: 2,
              stroke: "rgba(255,255,255,0.8)",
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-2 overflow-hidden">
      <div className="h-full max-w-full mx-auto flex flex-col gap-2">
        {/* Header - Very Compact */}
        <div className="h-12 flex justify-between items-center bg-white px-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              {trashBinName}
            </h1>
            <div className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 px-2 py-1 rounded-lg shadow-sm">
              <Battery className="w-3 h-3 text-white" />
              <span className="font-bold text-white text-xs">
                {batteryPercentage}%
              </span>
            </div>
          </div>
          <button className="flex items-center gap-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1.5 rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-sm font-medium text-xs">
            <span>Export</span>
            <Download className="w-3 h-3" />
          </button>
        </div>

        {/* 1st Row - 18% height: Time Period (50%) + Kondisi (50%) */}
        <div className="h-[18%] grid grid-cols-2 gap-2">
          {/* Time Period - 50% width */}
          <div className="bg-white p-3 rounded-lg shadow-sm border relative">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-600" />
                Time Period
              </h3>
              <button
                onClick={handleApplyDateRange}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-md font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm text-xs"
              >
                Apply
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Start */}
              <div>
                <label className="block text-xs font-medium text-blue-800 mb-1">
                  Start
                </label>
                <div className="flex gap-1">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border border-gray-300 rounded px-1 py-1 text-xs font-medium focus:border-blue-500 text-blue-800 flex-[0.7]"
                  />
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="border border-gray-300 rounded px-1 py-1 text-xs font-medium focus:border-blue-500 text-blue-800 flex-[0.3]"
                  />
                </div>
              </div>

              {/* End */}
              <div>
                <label className="block text-xs font-medium text-blue-800 mb-1">
                  End
                </label>
                <div className="flex gap-1">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border border-gray-300 rounded px-1 py-1 text-xs font-medium focus:border-blue-500 text-blue-800 flex-[0.7]"
                  />
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="border border-gray-300 rounded px-1 py-1 text-xs font-medium focus:border-blue-500 text-blue-800 flex-[0.3]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Kondisi - 50% width */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg shadow-sm border border-blue-200">
            <h3 className="text-sm font-bold mb-2 text-blue-800 flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Current Status
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white p-2 rounded-lg shadow-sm border border-blue-100">
                <div className="flex items-center gap-1 mb-1">
                  <AlertCircle className="w-3 h-3 text-blue-600" />
                  <span className="text-xs font-medium text-gray-700">
                    Status
                  </span>
                </div>
                <p className="text-xs text-gray-800 font-medium leading-tight">
                  {condition}
                </p>
              </div>

              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-lg shadow-sm text-white text-center">
                <h4 className="font-medium text-blue-100 text-xs">Weight</h4>
                <p className="text-lg font-bold leading-tight">
                  {currentTotals.weight}
                </p>
                <p className="text-blue-200 text-xs">grams</p>
              </div>

              <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-2 rounded-lg shadow-sm text-white text-center">
                <h4 className="font-medium text-indigo-100 text-xs">Volume</h4>
                <p className="text-lg font-bold leading-tight">
                  {currentTotals.volume}%
                </p>
                <p className="text-indigo-200 text-xs">capacity</p>
              </div>
            </div>
          </div>
        </div>

        {/* 2nd Row - 40% height: Composition (33%) + Total Graph (67%) */}
        <div className="h-[40%] grid grid-cols-3 gap-2">
          {/* Composition - 33% width */}
          <div className="bg-white p-3 rounded-lg shadow-sm border">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold text-gray-800">Composition</h3>
              <ToggleButton
                value={compositionToggle}
                onChange={setCompositionToggle}
                size="small"
              />
            </div>

            <div className="grid grid-cols-5 gap-2 items-center">
              {/* Persentase - kiri (40%) */}
              <div className="col-span-2 space-y-1">
                {getDonutData(compositionToggle).map((item, index) => (
                  <div
                    key={item.name}
                    className={`flex items-center justify-between p-1 rounded cursor-pointer transition-all ${
                      selectedSlice === index
                        ? "bg-blue-50 scale-[1.02]"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedSlice(index)}
                  >
                    <div className="flex items-center gap-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs font-medium text-gray-800">
                        {item.name}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold ${
                        selectedSlice === index ? "text-black" : ""
                      }`}
                      style={{ color: item.color }}
                    >
                      {item.value}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Donut chart - kanan (60%) */}
              <div className="col-span-3 flex justify-center">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={getDonutData(compositionToggle)}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      dataKey="value"
                    >
                      {getDonutData(compositionToggle).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke={selectedSlice === index ? "#000" : "none"}
                          strokeWidth={selectedSlice === index ? 2 : 0}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Total Graph - 67% width */}
          <div className="col-span-2 bg-white p-3 rounded-lg shadow-sm border">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold text-gray-800">
                Total Monitoring
              </h3>
              <ToggleButton
                value={totalToggle}
                onChange={setTotalToggle}
                size="small"
                colorTheme="blue"
              />
            </div>

            <ChartComponent
              data={totalChartData}
              bgColor="bg-gradient-to-br from-blue-500 to-blue-600"
              height={180}
            />
          </div>
        </div>

        {/* 3rd Row - 40% height: Residue (33%) + Organic (33%) + Anorganic (33%) */}
        <div className="h-[40%] grid grid-cols-3 gap-2">
          {/* Residue */}
          <div className="bg-white p-3 rounded-lg shadow-sm border">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold text-red-600">Residue</h3>
              <ToggleButton
                value={residueToggle}
                onChange={setResidueToggle}
                size="small"
                colorTheme="red"
              />
            </div>
            <div className="space-y-2">
              <ChartComponent
                data={residueChartData}
                bgColor="bg-gradient-to-br from-red-500 to-red-600"
                height={120}
              />
              <div className="grid grid-cols-2 gap-1">
                <div className="text-center bg-red-50 p-2 rounded border border-red-200">
                  <p className="text-xs font-medium text-gray-800 mb-1">
                    Weight
                  </p>
                  <p className="text-sm font-bold text-red-600">
                    {currentSpecific.residue.weight}
                  </p>
                  <p className="text-xs text-gray-600">grams</p>
                </div>
                <div className="text-center bg-red-50 p-2 rounded border border-red-200">
                  <p className="text-xs font-medium text-gray-800 mb-1">
                    Volume
                  </p>
                  <p className="text-sm font-bold text-red-600">
                    {currentSpecific.residue.volume}%
                  </p>
                  <p className="text-xs text-gray-600">capacity</p>
                </div>
              </div>
            </div>
          </div>

          {/* Organic */}
          <div
            className={`bg-white p-3 rounded-lg shadow-sm border relative ${
              currentSpecific.organic.volume > 90
                ? "border-red-500 ring-2 ring-red-200"
                : ""
            }`}
          >
            {currentSpecific.organic.volume > 90 && (
              <div className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm animate-pulse">
                <AlertCircle className="w-3 h-3" />
                Full!
              </div>
            )}
            <h3 className="text-sm font-bold mb-2 text-green-600">Organic</h3>
            <div className="space-y-2">
              <ChartComponent
                data={organicChartData}
                bgColor="bg-gradient-to-br from-green-500 to-green-600"
                height={120}
              />
              <div className="grid grid-cols-2 gap-1">
                <div className="text-center bg-green-50 p-2 rounded border border-green-200">
                  <p className="text-xs font-medium text-gray-800 mb-1">
                    Weight
                  </p>
                  <p className="text-sm font-bold text-green-600">
                    {currentSpecific.organic.weight}
                  </p>
                  <p className="text-xs text-gray-600">grams</p>
                </div>
                <div className="text-center bg-green-50 p-2 rounded border border-green-200">
                  <p className="text-xs font-medium text-gray-800 mb-1">
                    Volume
                  </p>
                  <p
                    className={`text-sm font-bold ${
                      currentSpecific.organic.volume > 90
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {currentSpecific.organic.volume}%
                  </p>
                  <p className="text-xs text-gray-600">capacity</p>
                </div>
              </div>
            </div>
          </div>

          {/* Anorganic */}
          <div className="bg-white p-3 rounded-lg shadow-sm border">
            <h3 className="text-sm font-bold mb-2 text-yellow-600">
              Anorganic
            </h3>
            <div className="space-y-2">
              <ChartComponent
                data={anorganicChartData}
                bgColor="bg-gradient-to-br from-yellow-500 to-yellow-600"
                height={120}
              />
              <div className="grid grid-cols-2 gap-1">
                <div className="text-center bg-yellow-50 p-2 rounded border border-yellow-200">
                  <p className="text-xs font-medium text-gray-800 mb-1">
                    Weight
                  </p>
                  <p className="text-sm font-bold text-yellow-600">
                    {currentSpecific.anorganic.weight}
                  </p>
                  <p className="text-xs text-gray-600">grams</p>
                </div>
                <div className="text-center bg-yellow-50 p-2 rounded border border-yellow-200">
                  <p className="text-xs font-medium text-gray-800 mb-1">
                    Volume
                  </p>
                  <p className="text-sm font-bold text-yellow-600">
                    {currentSpecific.anorganic.volume}%
                  </p>
                  <p className="text-xs text-gray-600">capacity</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alert Notification */}
        {isAnyBinFull() && (
          <div className="fixed bottom-3 right-3 bg-gradient-to-r from-red-500 to-red-600 text-white p-3 rounded-lg shadow-xl flex items-center gap-2 animate-pulse border border-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="font-bold text-sm">Alert: Bin is full!</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrashBinDashboard;
