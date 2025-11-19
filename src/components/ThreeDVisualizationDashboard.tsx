"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Save, Table as TableIcon, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import Bin3DVisualization from '@/components/Bin3DVisualization';
import { ChartComponent } from '@/components/ChartComponent';

// Interface for saved 3D visualizations
interface Saved3DVisualization {
  id: string;
  title: string;
  timestamp: string;
  data: ThreeDData;
}

// Interface for 3D bin data
interface BinSensorData {
  topLeft: number;
  topRight: number;
  bottomLeft: number;
  bottomRight: number;
  weight?: number;
}

interface ThreeDData {
  organicSensors: BinSensorData;
  anorganicSensors: BinSensorData;
  residueSensors: BinSensorData;
  organicChart: Array<{time: string, value: number, fullTimestamp: string}>;
  anorganicChart: Array<{time: string, value: number, fullTimestamp: string}>;
  residueChart: Array<{time: string, value: number, fullTimestamp: string}>;
}

// Generate random sensor data
const generateRandomSensorData = (): BinSensorData => {
  return {
    topLeft: Math.floor(Math.random() * 30) + 5,     // 5-35 cm
    topRight: Math.floor(Math.random() * 30) + 5,    // 5-35 cm
    bottomLeft: Math.floor(Math.random() * 30) + 5,  // 5-35 cm
    bottomRight: Math.floor(Math.random() * 30) + 5, // 5-35 cm
    weight: parseFloat((Math.random() * 5 + 0.5).toFixed(2)) // 0.5-5.5 kg
  };
};

// Generate random chart data
const generateRandomChartData = (): Array<{time: string, value: number, fullTimestamp: string}> => {
  const data = [];
  const now = new Date();

  for (let i = 20; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000); // 1-minute intervals
    data.push({
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      value: Math.floor(Math.random() * 30) + 5, // 5-35 cm
      fullTimestamp: time.toLocaleString()
    });
  }

  return data;
};

// Generate complete 3D data
const generate3DData = (): ThreeDData => {
  return {
    organicSensors: generateRandomSensorData(),
    anorganicSensors: generateRandomSensorData(),
    residueSensors: generateRandomSensorData(),
    organicChart: generateRandomChartData(),
    anorganicChart: generateRandomChartData(),
    residueChart: generateRandomChartData()
  };
};

const ThreeDVisualizationDashboard: React.FC = () => {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  // State for saved visualizations
  const [savedVisualizations, setSavedVisualizations] = useState<Saved3DVisualization[]>([]);
  const [showTable, setShowTable] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');

  // State for current data
  const [currentData, setCurrentData] = useState<ThreeDData>(() => generate3DData());

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handler to save current visualization
  const handleSaveVisualization = () => {
    setSaveDialogOpen(true);
  };

  // Handler to confirm save with title
  const handleConfirmSave = () => {
    if (!saveTitle.trim()) {
      alert('Please enter a title for this visualization');
      return;
    }

    const newVisualization: Saved3DVisualization = {
      id: Date.now().toString(),
      title: saveTitle.trim(),
      timestamp: new Date().toLocaleString(),
      data: { ...currentData }
    };

    setSavedVisualizations(prev => [...prev, newVisualization]);
    setSaveTitle('');
    setSaveDialogOpen(false);
    alert('Visualization saved successfully!');
  };

  // Handler to generate new randomization
  const handleNewRandomization = () => {
    setCurrentData(generate3DData());
  };

  // Handler to delete saved visualization
  const handleDeleteVisualization = (id: string) => {
    if (confirm('Are you sure you want to delete this visualization?')) {
      setSavedVisualizations(prev => prev.filter(v => v.id !== id));
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading visualization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-xs sm:text-sm font-medium">Back</span>
              </button>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900">
                🗑️ 3D Visualization - Random Simulation
              </h1>
            </div>
          </div>
          <div className="text-xs sm:text-sm text-gray-600">
            <p>Simulated 3D bin visualization with randomized sensor data. Click &quot;Randomize&quot; to generate new data.</p>
          </div>
        </div>

        {/* Waste Type Sections (Weight + 3D Visualization) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6 md:mb-8">
          {/* Organic Section */}
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Organic Weight */}
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-xs sm:text-sm font-semibold text-green-700 mb-1">🌱 Organic</h3>
                  <p className="text-xl sm:text-2xl font-bold text-green-900">
                    {currentData.organicSensors.weight?.toFixed(2)} kg
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">
                    Randomized data
                  </p>
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl">⚖️</div>
              </div>
            </div>

            {/* Organic 3D Visualization */}
            <Bin3DVisualization
              binType="organic"
              sensorData={currentData.organicSensors}
            />

            {/* Organic Chart */}
            <div className="bg-white rounded-lg shadow p-3 sm:p-4">
              <h3 className="text-xs sm:text-sm font-semibold text-green-600 mb-2">Organic Distance Chart</h3>
              <ChartComponent
                data={currentData.organicChart}
                bgColor="bg-green-100"
                height={150}
              />
            </div>
          </div>

          {/* Anorganic Section */}
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Anorganic Weight */}
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-xs sm:text-sm font-semibold text-yellow-700 mb-1">♻️ Anorganic</h3>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-900">
                    {currentData.anorganicSensors.weight?.toFixed(2)} kg
                  </p>
                  <p className="text-xs text-yellow-600 mt-0.5">
                    Randomized data
                  </p>
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl">⚖️</div>
              </div>
            </div>

            {/* Anorganic 3D Visualization */}
            <Bin3DVisualization
              binType="anorganic"
              sensorData={currentData.anorganicSensors}
            />

            {/* Anorganic Chart */}
            <div className="bg-white rounded-lg shadow p-3 sm:p-4">
              <h3 className="text-xs sm:text-sm font-semibold text-yellow-600 mb-2">Anorganic Distance Chart</h3>
              <ChartComponent
                data={currentData.anorganicChart}
                bgColor="bg-yellow-100"
                height={150}
              />
            </div>
          </div>

          {/* Residue Section */}
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Residue Weight */}
            <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-xs sm:text-sm font-semibold text-orange-700 mb-1">🗑️ Residue</h3>
                  <p className="text-xl sm:text-2xl font-bold text-orange-900">
                    {currentData.residueSensors.weight?.toFixed(2)} kg
                  </p>
                  <p className="text-xs text-orange-600 mt-0.5">
                    Randomized data
                  </p>
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl">⚖️</div>
              </div>
            </div>

            {/* Residue 3D Visualization */}
            <Bin3DVisualization
              binType="residue"
              sensorData={currentData.residueSensors}
            />

            {/* Residue Chart */}
            <div className="bg-white rounded-lg shadow p-3 sm:p-4">
              <h3 className="text-xs sm:text-sm font-semibold text-orange-600 mb-2">Residue Distance Chart</h3>
              <ChartComponent
                data={currentData.residueChart}
                bgColor="bg-orange-100"
                height={150}
              />
            </div>
          </div>
        </div>

        {/* Saved Visualizations Table */}
        {showTable && (
          <div className="mt-6 bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Saved Visualizations</h3>
            {savedVisualizations.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No saved visualizations yet. Click &quot;Save&quot; to save the current visualization.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-300">
                      <th className="text-left p-3 font-semibold text-gray-700">Title</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Timestamp</th>
                      <th className="text-center p-3 font-semibold text-gray-700">Organic (kg)</th>
                      <th className="text-center p-3 font-semibold text-gray-700">Anorganic (kg)</th>
                      <th className="text-center p-3 font-semibold text-gray-700">Residue (kg)</th>
                      <th className="text-center p-3 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedVisualizations.map((viz, index) => (
                      <tr key={viz.id} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                        <td className="p-3 font-medium text-gray-800">{viz.title}</td>
                        <td className="p-3 text-gray-600 text-sm">{viz.timestamp}</td>
                        <td className="p-3 text-center font-semibold text-green-600">{viz.data.organicSensors.weight?.toFixed(2)}</td>
                        <td className="p-3 text-center font-semibold text-yellow-600">{viz.data.anorganicSensors.weight?.toFixed(2)}</td>
                        <td className="p-3 text-center font-semibold text-orange-600">{viz.data.residueSensors.weight?.toFixed(2)}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDeleteVisualization(viz.id)}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Save Dialog Modal */}
        {saveDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Save Visualization</h3>
              <p className="text-gray-600 mb-4">Enter a title for this visualization:</p>
              <input
                type="text"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                placeholder="e.g., High Volume Scenario - Nov 19"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmSave();
                  }
                }}
                autoFocus
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setSaveDialogOpen(false);
                    setSaveTitle('');
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSave}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3 sm:p-4 md:p-6 mt-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">📖 About This Visualization</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <h4 className="font-semibold text-xs sm:text-sm text-blue-800 mb-1 sm:mb-2">Features</h4>
              <ul className="text-xs sm:text-sm text-gray-700 space-y-0.5 sm:space-y-1">
                <li>• <strong>3 Bins:</strong> Organic, Anorganic, Residue</li>
                <li>• <strong>4 Sensors per bin:</strong> Top-Left, Top-Right, Bottom-Left, Bottom-Right</li>
                <li>• <strong>Weight Display:</strong> Kilograms</li>
                <li>• <strong>Distance Charts:</strong> Sensor readings over time</li>
                <li>• <strong>Randomization:</strong> Generate new scenarios</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-xs sm:text-sm text-purple-800 mb-1 sm:mb-2">How to Use</h4>
              <ul className="text-xs sm:text-sm text-gray-700 space-y-0.5 sm:space-y-1">
                <li>• Click <strong>&quot;Randomize&quot;</strong> to generate new data</li>
                <li>• Click <strong>&quot;Save&quot;</strong> to save current scenario</li>
                <li>• Click <strong>&quot;Show Table&quot;</strong> to view saved scenarios</li>
                <li>• Compare different scenarios side by side</li>
                <li>• All data is simulated for demonstration</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleNewRandomization}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors font-medium shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Randomize
            </button>
            <button
              onClick={handleSaveVisualization}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium shadow-sm"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={() => setShowTable(!showTable)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium shadow-sm"
            >
              <TableIcon className="w-4 h-4" />
              {showTable ? 'Hide' : 'Show'} Table ({savedVisualizations.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreeDVisualizationDashboard;
