'use client';

import React, { useState, useEffect } from 'react';
import { Battery, Download, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Types
interface TrashData {
  organic: number;
  anorganic: number;
  residue: number;
  empty?: number;
}

interface ChartData {
  time: string;
  value: number;
}

const TrashBinDashboard = () => {
  // State management
  const [compositionToggle, setCompositionToggle] = useState<'weight' | 'volume'>('weight');
  const [totalToggle, setTotalToggle] = useState<'weight' | 'volume'>('weight');
  const [residueToggle, setResidueToggle] = useState<'weight' | 'volume'>('weight');
  const [organicToggle, setOrganicToggle] = useState<'weight' | 'volume'>('weight');
  const [anorganicToggle, setAnorganicToggle] = useState<'weight' | 'volume'>('weight');

  const [startDate, setStartDate] = useState('2025-01-25');
  const [startTime, setStartTime] = useState('10:00');
  const [endDate, setEndDate] = useState('2025-01-25');
  const [endTime, setEndTime] = useState('18:00');

  // Mock data
  const trashBinName = "Trash Bin Kantin It 1";
  const batteryPercentage = 80;
  const condition = "Menumpuk di satu sisi";
  
  const currentWeight: TrashData = { organic: 22.5, anorganic: 30.8, residue: 38.6 };
  const currentVolume: TrashData = { organic: 25, anorganic: 30, residue: 35, empty: 10 };
  
  const currentTotals = {
    weight: 72.5,
    volume: 25
  };

  const currentSpecific = {
    organic: { weight: 72.1, volume: 95 },
    anorganic: { weight: 72.1, volume: 25 },
    residue: { weight: 72.1, volume: 25 }
  };

  // Generate mock chart data
  const generateChartData = (): ChartData[] => {
    const data: ChartData[] = [];
    const hours = ['06:00', '09:00', '12:00', '15:00', '18:00'];
    
    hours.forEach(hour => {
      data.push({
        time: hour,
        value: Math.floor(Math.random() * 80) + 20
      });
    });
    
    return data;
  };

  const [totalChartData, setTotalChartData] = useState<ChartData[]>([]);
  const [residueChartData, setResidueChartData] = useState<ChartData[]>([]);
  const [organicChartData, setOrganicChartData] = useState<ChartData[]>([]);
  const [anorganicChartData, setAnorganicChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    setTotalChartData(generateChartData());
    setResidueChartData(generateChartData());
    setOrganicChartData(generateChartData());
    setAnorganicChartData(generateChartData());
  }, []);

  // Donut chart data
  const getDonutData = (type: 'weight' | 'volume') => {
    const data = type === 'weight' ? currentWeight : currentVolume;
    return [
      { name: 'Organic', value: data.organic, color: '#22c55e' },
      { name: 'Anorganic', value: data.anorganic, color: '#eab308' },
      { name: 'Residue', value: data.residue, color: '#ef4444' },
      ...(data.empty ? [{ name: 'Empty', value: data.empty, color: '#94a3b8' }] : [])
    ];
  };

  // Check if any bin is full (>90% volume)
  const isAnyBinFull = () => {
    return currentSpecific.organic.volume > 90 || 
           currentSpecific.anorganic.volume > 90 || 
           currentSpecific.residue.volume > 90;
  };

  // Toggle button component
  const ToggleButton = ({ 
    value, 
    onChange, 
    options = [{ value: 'weight', label: 'Weight' }, { value: 'volume', label: 'Volume' }] 
  }: {
    value: string;
    onChange: (value: any) => void;
    options?: { value: string; label: string }[];
  }) => (
    <div className="flex bg-gray-100 rounded-lg p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            value === option.value
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  // Chart component
  const ChartComponent = ({ 
    data, 
    color, 
    toggle, 
    onToggleChange 
  }: {
    data: ChartData[];
    color: string;
    toggle: 'weight' | 'volume';
    onToggleChange: (value: 'weight' | 'volume') => void;
  }) => (
    <div className="space-y-4">
      <ToggleButton value={toggle} onChange={onToggleChange} />
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={3}
            dot={{ fill: color, strokeWidth: 2, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-4">
            {/* Title and Battery */}
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-blue-600">{trashBinName}</h1>
              <div className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full">
                <Battery className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-600">{batteryPercentage}</span>
              </div>
            </div>

            {/* Time Period */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Waktu awal</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Akhir</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <button className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
            <span>Export</span>
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* First Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Volume and Weight Composition */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="space-y-4">
              <ToggleButton value={compositionToggle} onChange={setCompositionToggle} />
              
              <div className="flex items-center justify-center">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie
                      data={getDonutData(compositionToggle)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                    >
                      {getDonutData(compositionToggle).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                {getDonutData(compositionToggle).map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Current Condition */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4 text-blue-600">Kondisi</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700">{condition}</p>
              </div>
              
              <div className="bg-blue-100 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800">Weight (gr):</h4>
                <p className="text-2xl font-bold text-blue-600">{currentTotals.weight}</p>
              </div>

              <div className="bg-blue-100 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800">Volume (cm):</h4>
                <p className="text-2xl font-bold text-blue-600">{currentTotals.volume}%</p>
              </div>
            </div>
          </div>

          {/* Total Graph */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4 text-blue-600">Total</h3>
            <ChartComponent
              data={totalChartData}
              color="#3b82f6"
              toggle={totalToggle}
              onToggleChange={setTotalToggle}
            />
          </div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Residue */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Residue</h3>
            <ChartComponent
              data={residueChartData}
              color="#ef4444"
              toggle={residueToggle}
              onToggleChange={setResidueToggle}
            />
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Weight (gram)</p>
                <p className="font-bold text-red-600">{currentSpecific.residue.weight}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Volume (cm)</p>
                <p className="font-bold text-red-600">{currentSpecific.residue.volume}%</p>
              </div>
            </div>
          </div>

          {/* Organic */}
          <div className={`bg-white p-6 rounded-lg shadow-sm border relative ${
            currentSpecific.organic.volume > 90 ? 'border-red-500 border-2' : ''
          }`}>
            {currentSpecific.organic.volume > 90 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Penuh
              </div>
            )}
            <h3 className="text-lg font-semibold mb-4 text-green-600">Organik</h3>
            <ChartComponent
              data={organicChartData}
              color="#22c55e"
              toggle={organicToggle}
              onToggleChange={setOrganicToggle}
            />
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Weight (gram)</p>
                <p className="font-bold text-green-600">{currentSpecific.organic.weight}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Volume (cm)</p>
                <p className={`font-bold ${currentSpecific.organic.volume > 90 ? 'text-red-600' : 'text-green-600'}`}>
                  {currentSpecific.organic.volume}%
                </p>
              </div>
            </div>
          </div>

          {/* Anorganic */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4 text-yellow-600">Anorganik</h3>
            <ChartComponent
              data={anorganicChartData}
              color="#eab308"
              toggle={anorganicToggle}
              onToggleChange={setAnorganicToggle}
            />
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Weight (gram)</p>
                <p className="font-bold text-yellow-600">{currentSpecific.anorganic.weight}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Volume (cm)</p>
                <p className="font-bold text-yellow-600">{currentSpecific.anorganic.volume}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alert Notification */}
        {isAnyBinFull() && (
          <div className="fixed bottom-6 right-6 bg-red-500 text-white p-4 rounded-lg shadow-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Alert: One or more bins are full!</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrashBinDashboard;