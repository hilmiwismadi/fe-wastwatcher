"use client";

import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

import { Header } from './Header';
import { TimePeriod } from './TimePeriod';
import { ToggleButton } from './ToggleButton';
import { ChartComponent } from './ChartComponent';
import { BarChart } from './BarChart';
import { TouchCarousel } from './TouchCarousel';
import { useTrashData } from '../hooks/useTrashData';
import { trashBinName, batteryPercentage, condition } from '../data/mockData';

const TrashBinDashboard = () => {
  // State management
  const [currentBinIndex, setCurrentBinIndex] = useState(0);
  const [startDate, setStartDate] = useState("2025-01-25");
  const [startTime, setStartTime] = useState("10:00");
  const [endDate, setEndDate] = useState("2025-01-25");
  const [endTime, setEndTime] = useState("18:00");

  // Custom hook for trash data
  const {
    compositionToggle,
    setCompositionToggle,
    totalToggle,
    setTotalToggle,
    residueToggle,
    setResidueToggle,
    organicToggle,
    setOrganicToggle,
    anorganicToggle,
    setAnorganicToggle,
    selectedSlice,
    setSelectedSlice,
    currentTotals,
    currentSpecific,
    getTotalChartData,
    getResidueChartData,
    getOrganicChartData,
    getAnorganicChartData,
    getVolumeBarData,
    getDonutData,
    isAnyBinFull,
  } = useTrashData();

  const handleApplyDateRange = () => {
    console.log("Date range applied:", { startDate, startTime, endDate, endTime });
  };

  const handleExport = () => {
    console.log("Export triggered");
  };

  // Bin components data
  const binComponentsData = [
    {
      id: 'residue',
      title: 'Residue',
      colorTheme: 'red',
      bgColor: 'bg-gradient-to-br from-red-500 to-red-600',
      toggle: residueToggle,
      setToggle: setResidueToggle,
      chartData: getResidueChartData(),
      currentData: currentSpecific.residue,
      titleColor: 'text-red-600',
      cardBg: 'bg-red-50',
      borderColor: 'border-red-200',
      valueColor: 'text-red-600',
    },
    {
      id: 'organic',
      title: 'Organic',
      colorTheme: 'green',
      bgColor: 'bg-gradient-to-br from-green-500 to-green-600',
      toggle: organicToggle,
      setToggle: setOrganicToggle,
      chartData: getOrganicChartData(),
      currentData: currentSpecific.organic,
      titleColor: 'text-green-600',
      cardBg: 'bg-green-50',
      borderColor: 'border-green-200',
      valueColor: 'text-green-600',
      isAlert: currentSpecific.organic.volume > 80,
    },
    {
      id: 'anorganic',
      title: 'Anorganic',
      colorTheme: 'yellow',
      bgColor: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
      toggle: anorganicToggle,
      setToggle: setAnorganicToggle,
      chartData: getAnorganicChartData(),
      currentData: currentSpecific.anorganic,
      titleColor: 'text-yellow-600',
      cardBg: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      valueColor: 'text-yellow-600',
    },
  ];

  // Render bin component
  const renderBinComponent = (binData: typeof binComponentsData[0]) => (
    <div 
      key={binData.id}
      className={`bg-white p-3 rounded-lg shadow-sm border relative ${
        binData.isAlert ? "border-red-500 ring-2 ring-red-200" : ""
      }`}
    >
      {binData.isAlert && (
        <div className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm animate-pulse">
          <AlertCircle className="w-3 h-3" />
          Full!
        </div>
      )}
      <div className="flex justify-between items-center mb-2">
        <h3 className={`text-sm font-bold ${binData.titleColor}`}>{binData.title}</h3>
        <ToggleButton
          value={binData.toggle}
          onChange={binData.setToggle}
          size="small"
          colorTheme={binData.colorTheme}
        />
      </div>
      <div className="space-y-2">
        <ChartComponent
          data={binData.chartData}
          bgColor={binData.bgColor}
          height={120}
        />
        <div className="grid grid-cols-2 gap-1">
          <div className={`text-center ${binData.cardBg} p-2 rounded border ${binData.borderColor}`}>
            <p className="text-xs font-medium text-gray-800 mb-1">Weight</p>
            <p className={`text-sm font-bold ${binData.valueColor}`}>{binData.currentData.weight}</p>
            <p className="text-xs text-gray-600">grams</p>
          </div>
          <div className={`text-center ${binData.cardBg} p-2 rounded border ${binData.borderColor}`}>
            <p className="text-xs font-medium text-gray-800 mb-1">Volume</p>
            <p className={`text-sm font-bold ${
              binData.isAlert ? "text-red-600" : binData.valueColor
            }`}>
              {binData.currentData.volume}%
            </p>
            <p className="text-xs text-gray-600">capacity</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-2 sm:p-4 overflow-auto">
      <div className="max-w-full mx-auto flex flex-col gap-2 sm:gap-4">
        {/* Header */}
        <Header
          trashBinName={trashBinName}
          batteryPercentage={batteryPercentage}
          onExport={handleExport}
        />

        {/* 1st Row: Time Period + Current Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
          {/* Time Period */}
          <TimePeriod
            startDate={startDate}
            startTime={startTime}
            endDate={endDate}
            endTime={endTime}
            onStartDateChange={setStartDate}
            onStartTimeChange={setStartTime}
            onEndDateChange={setEndDate}
            onEndTimeChange={setEndTime}
            onApply={handleApplyDateRange}
          />

          {/* Current Status */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-2 sm:p-3 rounded-lg shadow-sm border border-blue-200">
            <h3 className="text-sm font-bold mb-2 text-blue-800 flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Current Status
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="bg-white p-2 rounded-lg shadow-sm border border-blue-100 sm:col-span-1">
                <div className="flex items-center gap-1 mb-1">
                  <AlertCircle className="w-3 h-3 text-blue-600" />
                  <span className="text-xs font-medium text-gray-700">Status</span>
                </div>
                <p className="text-xs text-gray-800 font-medium leading-tight">{condition}</p>
              </div>

              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-lg shadow-sm text-white text-center sm:col-span-1">
                <h4 className="font-medium text-blue-100 text-xs">Weight</h4>
                <p className="text-lg font-bold leading-tight">{currentTotals.weight}</p>
                <p className="text-blue-200 text-xs">grams</p>
              </div>

              <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-2 rounded-lg shadow-sm text-white text-center sm:col-span-1">
                <h4 className="font-medium text-indigo-100 text-xs">Volume</h4>
                <p className="text-lg font-bold leading-tight">{currentTotals.volume}%</p>
                <p className="text-indigo-200 text-xs">capacity</p>
              </div>
            </div>
          </div>
        </div>

        {/* 2nd Row: Composition + Total Graph */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-4">
          {/* Composition */}
          <div className="bg-white p-2 sm:p-3 rounded-lg shadow-sm border lg:col-span-1">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold text-gray-800">Composition</h3>
              <ToggleButton
                value={compositionToggle}
                onChange={setCompositionToggle}
                size="small"
              />
            </div>

            {compositionToggle === "weight" ? (
              // Weight - Donut Chart
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                <div className="sm:col-span-2 space-y-1">
                  {getDonutData().map((item, index) => (
                    <div
                      key={item.name}
                      className={`flex items-center justify-between p-1 rounded cursor-pointer transition-all ${
                        selectedSlice === index ? "bg-blue-50 scale-[1.02]" : "hover:bg-gray-50"
                      }`}
                      onClick={() => setSelectedSlice(index)}
                    >
                      <div className="flex items-center gap-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs font-medium text-gray-800">{item.name}</span>
                      </div>
                      <span
                        className={`text-xs font-bold ${selectedSlice === index ? "text-black" : ""}`}
                        style={{ color: item.color }}
                      >
                        {item.value}g
                      </span>
                    </div>
                  ))}
                </div>

                <div className="sm:col-span-3 flex justify-center">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie
                        data={getDonutData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={selectedSlice !== null ? 40 : 45}
                        outerRadius={selectedSlice !== null ? 75 : 70}
                        dataKey="value"
                        onMouseEnter={(_, index) => setSelectedSlice(index)}
                        onMouseLeave={() => setSelectedSlice(null)}
                      >
                        {getDonutData().map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            stroke={selectedSlice === index ? "#000" : "none"}
                            strokeWidth={selectedSlice === index ? 3 : 0}
                            style={{
                              filter: selectedSlice === index ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' : 'none',
                              transform: selectedSlice === index ? 'scale(1.05)' : 'scale(1)',
                              transformOrigin: 'center',
                              transition: 'all 0.2s ease-in-out'
                            }}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              // Volume - Bar Chart
              <BarChart
                data={getVolumeBarData()}
                selectedIndex={selectedSlice}
                onBarHover={setSelectedSlice}
              />
            )}
          </div>

          {/* Total Graph */}
          <div className="lg:col-span-2 bg-white p-2 sm:p-3 rounded-lg shadow-sm border">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold text-gray-800">Total Monitoring</h3>
              <ToggleButton
                value={totalToggle}
                onChange={setTotalToggle}
                size="small"
                colorTheme="blue"
              />
            </div>

            <ChartComponent
              data={getTotalChartData()}
              bgColor="bg-gradient-to-br from-blue-500 to-blue-600"
              height={180}
            />
          </div>
        </div>

        {/* 3rd Row: Bin Categories */}
        {/* Desktop View */}
        <div className="hidden lg:grid grid-cols-3 gap-2 sm:gap-4">
          {binComponentsData.map(renderBinComponent)}
        </div>

        {/* Mobile Carousel View */}
        <div className="lg:hidden">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold text-gray-800">Bin Categories</h3>
            <div className="flex gap-1">
              {binComponentsData.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentBinIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentBinIndex === index ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          
          <TouchCarousel
            currentIndex={currentBinIndex}
            onIndexChange={setCurrentBinIndex}
          >
            {binComponentsData.map(renderBinComponent)}
          </TouchCarousel>
          
          {/* Navigation Arrows */}
          <div className="flex justify-between mt-3">
            <button
              onClick={() => setCurrentBinIndex(Math.max(0, currentBinIndex - 1))}
              disabled={currentBinIndex === 0}
              className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              ← Previous
            </button>
            <button
              onClick={() => setCurrentBinIndex(Math.min(binComponentsData.length - 1, currentBinIndex + 1))}
              disabled={currentBinIndex === binComponentsData.length - 1}
              className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Alert Notification */}
        {isAnyBinFull() && (
          <div className="fixed bottom-3 right-3 bg-gradient-to-r from-red-500 to-red-600 text-white p-2 sm:p-3 rounded-lg shadow-xl flex items-center gap-2 animate-pulse border border-red-400 z-10">
            <AlertCircle className="w-4 h-4" />
            <span className="font-bold text-xs sm:text-sm">Alert: Bin is full!</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrashBinDashboard;