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
import { TimeRange } from './TimeRangeSelector';
import { ToggleButton } from './ToggleButton';
import { ChartComponent } from './ChartComponent';
import { BarChart } from './BarChart';
import { TouchCarousel } from './TouchCarousel';
import { useApiTrashData } from '../hooks/useApiTrashData';
import { trashBinName, batteryPercentage, condition } from '../data/mockData';
import { getDefaultDateRange, combineDateAndTime, getTimeRangeDate } from '../utils/dateUtils';

const TrashBinDashboard = () => {
  // Initialize with default date range
  const defaultRange = getDefaultDateRange();

  // State management
  const [currentBinIndex, setCurrentBinIndex] = useState(0);
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');

  // UI State (what user sees in the form)
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [startTime, setStartTime] = useState(defaultRange.startTime);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [endTime, setEndTime] = useState(defaultRange.endTime);

  // Applied State (what actually gets sent to API)
  const [appliedStartDate, setAppliedStartDate] = useState(defaultRange.startDate);
  const [appliedStartTime, setAppliedStartTime] = useState(defaultRange.startTime);
  const [appliedEndDate, setAppliedEndDate] = useState(defaultRange.endDate);
  const [appliedEndTime, setAppliedEndTime] = useState(defaultRange.endTime);

  // Create API date range parameters from applied state
  const apiStartDate = combineDateAndTime(appliedStartDate, appliedStartTime);
  const apiEndDate = combineDateAndTime(appliedEndDate, appliedEndTime);

  // Custom hook for trash data from API
  const {
    loading,
    error,
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
  } = useApiTrashData(apiStartDate, apiEndDate, timeRange);

  const handleTimeRangeChange = (newTimeRange: TimeRange) => {
    setTimeRange(newTimeRange);
    const newRange = getTimeRangeDate(newTimeRange);

    // Update UI state with new range
    setStartDate(newRange.startDate);
    setStartTime(newRange.startTime);
    setEndDate(newRange.endDate);
    setEndTime(newRange.endTime);

    // Auto-apply the new range
    setAppliedStartDate(newRange.startDate);
    setAppliedStartTime(newRange.startTime);
    setAppliedEndDate(newRange.endDate);
    setAppliedEndTime(newRange.endTime);

    console.log("Time range changed to:", newTimeRange, newRange);
  };

  const handleApplyDateRange = () => {
    // Apply the UI state to the applied state, which will trigger API re-fetch
    setAppliedStartDate(startDate);
    setAppliedStartTime(startTime);
    setAppliedEndDate(endDate);
    setAppliedEndTime(endTime);

    console.log("Date range applied:", {
      startDate,
      startTime,
      endDate,
      endTime
    });
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-2 sm:p-4 overflow-auto">
      <div className="max-w-full mx-auto flex flex-col gap-2 sm:gap-4">
        {/* Clean Header */}
        <div className="bg-white p-2 sm:p-3 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            {/* Left: Title + Battery */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="group relative">
                <h1 className="text-lg sm:text-xl font-bold text-gray-800 cursor-pointer">
                  {trashBinName}
                </h1>
                {/* Export button on hover */}
                <button
                  onClick={handleExport}
                  className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 bg-blue-500 text-white px-2 py-1 rounded text-xs transition-all transform translate-x-full group-hover:translate-x-0"
                >
                  Export
                </button>
              </div>
              <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-700">{batteryPercentage}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 1: Current Status + Composition (Current Info) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-4">
          {/* Current Status */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-2 sm:p-3 rounded-lg shadow-sm border border-blue-200 h-48">
            <h3 className="text-sm font-bold mb-3 text-blue-800 flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Current Status
            </h3>
            <div className="space-y-2">
              <div className="bg-white p-2 rounded-lg shadow-sm border border-blue-100">
                <div className="flex items-center gap-1 mb-1">
                  <AlertCircle className="w-3 h-3 text-blue-600" />
                  <span className="text-xs font-medium text-gray-700">Status</span>
                </div>
                <p className="text-sm text-gray-800 font-medium">{condition}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-lg text-white text-center">
                  <h4 className="font-medium text-blue-100 text-xs">Weight</h4>
                  <p className="text-lg font-bold">{currentTotals.weight}</p>
                  <p className="text-blue-200 text-xs">grams</p>
                </div>

                <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-2 rounded-lg text-white text-center">
                  <h4 className="font-medium text-indigo-100 text-xs">Volume</h4>
                  <p className="text-lg font-bold">{currentTotals.volume}%</p>
                  <p className="text-indigo-200 text-xs">capacity</p>
                </div>
              </div>
            </div>
          </div>

          {/* Composition */}
          <div className="bg-white p-2 sm:p-3 rounded-lg shadow-sm border">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-sm font-bold text-gray-800">Composition</h3>
              <ToggleButton
                value={compositionToggle}
                onChange={setCompositionToggle}
                size="small"
              />
            </div>

            <div className="h-48"> {/* Increased height for bigger donut chart */}
              {compositionToggle === "weight" ? (
                // Weight - Donut Chart with 50/50 split
                <div className="grid grid-cols-2 gap-3 items-start h-full">
                  <div className="space-y-1 pt-2">
                    {getDonutData().map((item, index) => (
                      <div
                        key={item.name}
                        className={`flex items-start justify-between p-1 rounded cursor-pointer transition-all ${
                          selectedSlice === index ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                        onClick={() => setSelectedSlice(index)}
                      >
                        <div className="flex items-start gap-1">
                          <div
                            className="w-2 h-2 rounded-full mt-0.5"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-xs font-medium text-gray-800">{item.name}</span>
                        </div>
                        <span className="text-xs font-bold" style={{ color: item.color }}>
                          {item.value}g
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center items-center h-full">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie
                          data={getDonutData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={80}
                          dataKey="value"
                          onMouseEnter={(_, index) => setSelectedSlice(index)}
                          onMouseLeave={() => setSelectedSlice(null)}
                        >
                          {getDonutData().map((entry, index) => (
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
              ) : (
                // Volume - Bar Chart
                <div className="h-full">
                  <BarChart
                    data={getVolumeBarData()}
                    selectedIndex={selectedSlice}
                    onBarHover={setSelectedSlice}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Time Period + Total Monitoring (Analytics) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 sm:gap-4">
          {/* Time Period */}
          <div className="lg:col-span-2">
            <TimePeriod
              startDate={startDate}
              startTime={startTime}
              endDate={endDate}
              endTime={endTime}
              timeRange={timeRange}
              onStartDateChange={setStartDate}
              onStartTimeChange={setStartTime}
              onEndDateChange={setEndDate}
              onEndTimeChange={setEndTime}
              onTimeRangeChange={handleTimeRangeChange}
              onApply={handleApplyDateRange}
            />
          </div>

          {/* Total Monitoring */}
          <div className="lg:col-span-3 bg-white p-2 sm:p-3 rounded-lg shadow-sm border">
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