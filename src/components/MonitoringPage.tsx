"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, AlertCircle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { ToggleButton } from "./ToggleButton";
import { BarChart } from "./BarChart";
import { apiService, Device } from "@/services/api";

// Status categories based on fill percentage
const getStatusCategory = (percentage: number): 'Penuh' | 'Hampir Penuh' | 'Menengah' | 'Kosong' => {
  if (percentage >= 75) return 'Penuh';
  if (percentage >= 50) return 'Hampir Penuh';
  if (percentage >= 25) return 'Menengah';
  return 'Kosong';
};

// Get border color based on highest fill percentage
const getBorderColor = (percentage: number): string => {
  if (percentage >= 75) return 'border-red-500';
  if (percentage >= 50) return 'border-orange-500';
  if (percentage >= 25) return 'border-yellow-400';
  return 'border-blue-400';
};

// Get background color based on highest fill percentage
const getBackgroundColor = (percentage: number): string => {
  if (percentage >= 75) return 'from-red-50 to-red-100';
  if (percentage >= 50) return 'from-orange-50 to-orange-100';
  if (percentage >= 25) return 'from-yellow-50 to-yellow-100';
  return 'from-blue-50 to-blue-100';
};

// Get text color for percentage display
const getPercentageColor = (percentage: number): string => {
  if (percentage >= 75) return 'text-red-600';
  if (percentage >= 50) return 'text-orange-600';
  if (percentage >= 25) return 'text-yellow-600';
  return 'text-gray-700';
};

interface BinData {
  trashbinid: string;
  name: string;
  location: string;
  floor: string;
  organic_percentage: number;
  anorganic_percentage: number;
  residue_percentage: number;
  organic_weight: number;
  anorganic_weight: number;
  residue_weight: number;
  max_percentage: number;
}

// Map old bin names to new names
const binNameMapping: Record<string, string> = {
  'B3 Hazardous Bin': 'Timur Selasar',
  'Inorganic Waste Bin': 'Barat Selasar',
  'Main Cafeteria Bin': 'Selatan Selasar'
};

// Function to generate slug from bin name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s+/g, '') // Remove all spaces
    .replace(/[^a-z0-9]/g, ''); // Remove special characters
};

const MonitoringPage = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("Semua Lantai");
  const [selectedStatus, setSelectedStatus] = useState("Semua Status");
  const [floorDropdownOpen, setFloorDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [volumeToggle, setVolumeToggle] = useState<"percentage" | "donut">("donut");
  const [weightToggle, setWeightToggle] = useState<"percentage" | "donut">("donut");
  const [selectedVolumeSlice, setSelectedVolumeSlice] = useState<number | null>(null);
  const [selectedWeightSlice, setSelectedWeightSlice] = useState<number | null>(null);

  // Data fetching
  const [bins, setBins] = React.useState<BinData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Note: Not using aggregated composition - using Kantin LT 1 specific data instead

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [binsResponse, devicesResponse] = await Promise.all([
          apiService.getTrashBins(),
          apiService.getDevicesWithHealth(),
        ]);

        if (binsResponse.success && devicesResponse.success) {
          const binMap = new Map<string, BinData>();

          // Initialize bins
          binsResponse.data.forEach(bin => {
            binMap.set(bin.trashbinid, {
              trashbinid: bin.trashbinid,
              name: binNameMapping[bin.name] || bin.name, // Apply name mapping
              location: bin.location,
              floor: bin.floor,
              organic_percentage: 0,
              anorganic_percentage: 0,
              residue_percentage: 0,
              organic_weight: 0,
              anorganic_weight: 0,
              residue_weight: 0,
              max_percentage: 0,
            });
          });

          // Populate with device data
          devicesResponse.data.forEach((device: Device) => {
            const binData = binMap.get(device.trashbinid);
            if (binData) {
              const percentage = device.average_volume_percentage || 0;
              const weight = device.total_weight_kg || 0;

              if (device.category === 'Organic') {
                binData.organic_percentage = percentage;
                binData.organic_weight = weight;
              } else if (device.category === 'Anorganic' || device.category === 'Inorganic') {
                binData.anorganic_percentage = percentage;
                binData.anorganic_weight = weight;
              } else if (device.category === 'Residue' || device.category === 'B3') {
                binData.residue_percentage = percentage;
                binData.residue_weight = weight;
              }

              binData.max_percentage = Math.max(
                binData.organic_percentage,
                binData.anorganic_percentage,
                binData.residue_percentage
              );
            }
          });

          // Convert binMap to array
          setBins(Array.from(binMap.values()));
        } else {
          setError('Failed to fetch monitoring data');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching monitoring data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Floor options
  const floorOptions = ["Semua Lantai", ...Array.from({ length: 11 }, (_, i) => `Lantai ${i + 1}`)];

  // Status options
  const statusOptions = ["Semua Status", "Kosong", "Menengah", "Hampir Penuh", "Penuh"];

  // Filter bins
  const filteredBins = useMemo(() => {
    return bins.filter(bin => {
      const matchesSearch = bin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           bin.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFloor = selectedFloor === "Semua Lantai" || bin.floor.toLowerCase() === selectedFloor.toLowerCase();

      let matchesStatus = true;
      if (selectedStatus !== "Semua Status") {
        const category = getStatusCategory(bin.max_percentage);
        matchesStatus = category === selectedStatus;
      }

      return matchesSearch && matchesFloor && matchesStatus;
    });
  }, [bins, searchQuery, selectedFloor, selectedStatus]);

  // Calculate status counts
  const statusCounts = useMemo(() => {
    const counts = { 'Penuh': 0, 'Hampir Penuh': 0, 'Menengah': 0, 'Kosong': 0 };
    bins.forEach(bin => {
      const status = getStatusCategory(bin.max_percentage);
      counts[status]++;
    });
    return counts;
  }, [bins]);

  // Use Kantin LT 1 specific data for Weight and Volume charts
  const kantinLt1 = useMemo(() => bins.find(bin => bin.name === 'Kantin LT 1'), [bins]);

  const volumeData = useMemo(() => {
    if (!kantinLt1) return [
      { name: "Organic", value: 81.5, color: "#22c55e" },
      { name: "Anorganic", value: 39.4, color: "#eab308" },
      { name: "Residue", value: 19.4, color: "#ef4444" }
    ];

    return [
      { name: "Organic", value: kantinLt1.organic_percentage, color: "#22c55e" },
      { name: "Anorganic", value: kantinLt1.anorganic_percentage, color: "#eab308" },
      { name: "Residue", value: kantinLt1.residue_percentage, color: "#ef4444" }
    ];
  }, [kantinLt1]);

  const weightData = useMemo(() => {
    if (!kantinLt1) return [
      { name: "Organic", value: 1222.5, color: "#22c55e" },
      { name: "Anorganic", value: 472.8, color: "#eab308" },
      { name: "Residue", value: 155.2, color: "#ef4444" }
    ];

    // Return actual weight values in grams (not percentages)
    return [
      { name: "Organic", value: Math.round(kantinLt1.organic_weight * 10) / 10, color: "#22c55e" },
      { name: "Anorganic", value: Math.round(kantinLt1.anorganic_weight * 10) / 10, color: "#eab308" },
      { name: "Residue", value: Math.round(kantinLt1.residue_weight * 10) / 10, color: "#ef4444" }
    ];
  }, [kantinLt1]);

  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600 font-medium">Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg border">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col overflow-hidden">
      {/* 1st Row: Header (10% height) */}
      <div className="h-[10vh] flex items-center px-4 sm:px-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-blue-600">Pemantauan Harian</h1>
      </div>

      {/* 2nd Row: Status Overview + Filters + Charts (20% height) */}
      <div className="h-[20vh] px-4 sm:px-6 pb-3">
        <div className="h-full grid grid-cols-3 gap-3 sm:gap-4">
          {/* Left Section: 2/3 width */}
          <div className="col-span-2 flex flex-col gap-2">
            {/* Status Boxes */}
            <div className="flex-1 grid grid-cols-4 gap-2 sm:gap-3">
              {/* Penuh */}
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg sm:rounded-xl p-3 sm:p-4 text-white shadow-sm border-2 border-red-600">
                <h2 className="text-base sm:text-xl font-bold mb-0.5 sm:mb-1">Penuh</h2>
                <p className="text-3xl sm:text-4xl font-bold">{statusCounts['Penuh']}</p>
              </div>

              {/* Hampir Penuh */}
              <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border-2 border-red-500">
                <h2 className="text-base sm:text-xl font-bold mb-0.5 sm:mb-1 text-gray-800">Hampir Penuh</h2>
                <p className="text-3xl sm:text-4xl font-bold text-gray-800">{statusCounts['Hampir Penuh']}</p>
              </div>

              {/* Menengah */}
              <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border-2 border-yellow-400">
                <h2 className="text-base sm:text-xl font-bold mb-0.5 sm:mb-1 text-gray-800">Menengah</h2>
                <p className="text-3xl sm:text-4xl font-bold text-gray-800">{statusCounts['Menengah']}</p>
              </div>

              {/* Kosong */}
              <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border-2 border-blue-400">
                <h2 className="text-base sm:text-xl font-bold mb-0.5 sm:mb-1 text-gray-800">Kosong</h2>
                <p className="text-3xl sm:text-4xl font-bold text-gray-800">{statusCounts['Kosong']}</p>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="h-10 sm:h-12 flex gap-2 sm:gap-3">
              {/* Search */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Cari Bin................................."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-full px-3 pr-10 border-2 border-blue-300 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 text-gray-800"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500" size={16} />
              </div>

              {/* Floor */}
              <div className="w-32 sm:w-40 relative">
                <button
                  onClick={() => {
                    setFloorDropdownOpen(!floorDropdownOpen);
                    setStatusDropdownOpen(false);
                  }}
                  className="w-full h-full px-2 sm:px-3 border-2 border-blue-300 rounded-lg text-sm font-medium bg-white flex items-center justify-between hover:border-blue-500 text-gray-800"
                >
                  <span className="truncate">{selectedFloor}</span>
                  <ChevronDown size={16} />
                </button>
                {floorDropdownOpen && (
                  <div className="absolute z-20 w-full mt-1 bg-white border-2 border-blue-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {floorOptions.map((floor) => (
                      <div
                        key={floor}
                        onClick={() => {
                          setSelectedFloor(floor);
                          setFloorDropdownOpen(false);
                        }}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm font-medium text-gray-800"
                      >
                        {floor}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="w-32 sm:w-40 relative">
                <button
                  onClick={() => {
                    setStatusDropdownOpen(!statusDropdownOpen);
                    setFloorDropdownOpen(false);
                  }}
                  className="w-full h-full px-2 sm:px-3 border-2 border-blue-300 rounded-lg text-sm font-medium bg-white flex items-center justify-between hover:border-blue-500 text-gray-800"
                >
                  <span className="truncate">{selectedStatus}</span>
                  <ChevronDown size={16} />
                </button>
                {statusDropdownOpen && (
                  <div className="absolute z-20 w-full mt-1 bg-white border-2 border-blue-300 rounded-lg shadow-lg">
                    {statusOptions.map((status) => (
                      <div
                        key={status}
                        onClick={() => {
                          setSelectedStatus(status);
                          setStatusDropdownOpen(false);
                        }}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm font-medium text-gray-800"
                      >
                        {status}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Apply Button */}
              <button className="w-20 sm:w-24 px-2 sm:px-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-semibold hover:from-blue-600 hover:to-blue-700 shadow-sm transition-all">
                Penuh
              </button>
            </div>
          </div>

          {/* Right Section: Charts */}
          <div className="col-span-1 grid grid-cols-2 gap-2 sm:gap-3">
            {/* Volume */}
            <div className="bg-white rounded-lg p-2 shadow-sm border">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-xs sm:text-sm font-bold text-gray-800">Volume</h3>
                <ToggleButton
                  value={volumeToggle === 'donut' ? 'weight' : 'volume'}
                  onChange={(val) => setVolumeToggle(val === 'weight' ? 'donut' : 'percentage')}
                  options={[
                    { value: "weight", label: "Chart" },
                    { value: "volume", label: "%" },
                  ]}
                  size="small"
                />
              </div>
              <div className="h-[calc(100%-1.5rem)]">
                {volumeToggle === "donut" ? (
                  <div className="flex justify-center items-center h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={volumeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          dataKey="value"
                          onMouseEnter={(_, index) => setSelectedVolumeSlice(index)}
                          onMouseLeave={() => setSelectedVolumeSlice(null)}
                        >
                          {volumeData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color}
                              stroke={selectedVolumeSlice === index ? "#000" : "none"}
                              strokeWidth={selectedVolumeSlice === index ? 2 : 0}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-full">
                    <BarChart
                      data={volumeData}
                      selectedIndex={selectedVolumeSlice}
                      onBarHover={setSelectedVolumeSlice}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Weight */}
            <div className="bg-white rounded-lg p-2 shadow-sm border">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-xs sm:text-sm font-bold text-gray-800">Weight</h3>
                <ToggleButton
                  value={weightToggle === 'donut' ? 'weight' : 'volume'}
                  onChange={(val) => setWeightToggle(val === 'weight' ? 'donut' : 'percentage')}
                  options={[
                    { value: "weight", label: "Chart" },
                    { value: "volume", label: "%" },
                  ]}
                  size="small"
                />
              </div>
              <div className="h-[calc(100%-1.5rem)]">
                {weightToggle === "donut" ? (
                  <div className="flex justify-center items-center h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={weightData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          dataKey="value"
                          onMouseEnter={(_, index) => setSelectedWeightSlice(index)}
                          onMouseLeave={() => setSelectedWeightSlice(null)}
                        >
                          {weightData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color}
                              stroke={selectedWeightSlice === index ? "#000" : "none"}
                              strokeWidth={selectedWeightSlice === index ? 2 : 0}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-full">
                    <BarChart
                      data={weightData}
                      selectedIndex={selectedWeightSlice}
                      onBarHover={setSelectedWeightSlice}
                      unit="g"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3rd Row: Bin Grid (70% height, scrollable) */}
      <div className="flex-1 px-4 sm:px-6 pb-4 sm:pb-6 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="grid grid-cols-6 gap-2 sm:gap-3 pb-4">
            {filteredBins.map((bin) => {
              const borderColor = getBorderColor(bin.max_percentage);
              const bgColor = getBackgroundColor(bin.max_percentage);
              const slug = generateSlug(bin.name);

              return (
                <div
                  key={bin.trashbinid}
                  onClick={() => router.push(`/${slug}`)}
                  className={`bg-gradient-to-br ${bgColor} rounded-lg sm:rounded-xl p-2 sm:p-3 border-4 ${borderColor} hover:shadow-lg transition-all cursor-pointer hover:scale-105`}
                >
                  <h3 className="font-bold text-center mb-1.5 sm:mb-2 text-xs sm:text-sm truncate text-gray-800" title={bin.name}>
                    {bin.name}
                  </h3>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] sm:text-xs">
                      <span className="text-gray-700 font-medium">Organik</span>
                      <span className={`font-bold ${getPercentageColor(bin.organic_percentage)}`}>
                        {bin.organic_percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] sm:text-xs">
                      <span className="text-gray-700 font-medium">Anorganik</span>
                      <span className={`font-bold ${getPercentageColor(bin.anorganic_percentage)}`}>
                        {bin.anorganic_percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] sm:text-xs">
                      <span className="text-gray-700 font-medium">Residue</span>
                      <span className={`font-bold ${getPercentageColor(bin.residue_percentage)}`}>
                        {bin.residue_percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredBins.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg sm:text-xl font-medium">No bins found matching the filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonitoringPage;
