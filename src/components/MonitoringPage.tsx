"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, AlertCircle, Map as MapIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ToggleButton } from "./ToggleButton";
import { BarChart } from "./BarChart";
import { apiService, Device } from "@/services/api";
import { useMonitoringComposition } from "@/hooks/useMonitoringComposition";

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
  const [selectedFloors, setSelectedFloors] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
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

  // Use aggregated composition data from all bins
  const { volumeData: aggregatedVolumeData, weightData: aggregatedWeightData } = useMonitoringComposition();

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [binsResponse, devicesResponse] = await Promise.all([
          apiService.getTrashBins(),
          apiService.getDevicesWithHealth(),
        ]);

        console.log('API Responses:', { binsResponse, devicesResponse });

        if (binsResponse.success && devicesResponse.success) {
          const binMap = new Map<string, BinData>();

          // Ensure data arrays exist
          const binsData = Array.isArray(binsResponse.data) ? binsResponse.data : [];
          const devicesData = Array.isArray(devicesResponse.data) ? devicesResponse.data : [];

          if (binsData.length === 0) {
            console.warn('No bins data received from API');
          }
          if (devicesData.length === 0) {
            console.warn('No devices data received from API');
          }

          // Initialize bins
          binsData.forEach(bin => {
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
          devicesData.forEach((device: Device) => {
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
  const floorOptions = Array.from({ length: 11 }, (_, i) => `Lantai ${i + 1}`);

  // Status options
  const statusOptions = ["Kosong", "Menengah", "Hampir Penuh", "Penuh"];

  // Filter and sort bins
  const filteredBins = useMemo(() => {
    const filtered = bins.filter(bin => {
      const matchesSearch = bin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           bin.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFloor = selectedFloors.length === 0 ||
                          selectedFloors.some(floor => bin.floor.toLowerCase() === floor.toLowerCase());

      const matchesStatus = selectedStatuses.length === 0 ||
                           selectedStatuses.includes(getStatusCategory(bin.max_percentage));

      return matchesSearch && matchesFloor && matchesStatus;
    });

    // Sort: prioritize "Kantin LT 1" to appear first
    return filtered.sort((a, b) => {
      const aIsKantin = a.name.toLowerCase().includes('kantin lt 1') ||
                        a.location.toLowerCase().includes('kantin lt 1');
      const bIsKantin = b.name.toLowerCase().includes('kantin lt 1') ||
                        b.location.toLowerCase().includes('kantin lt 1');

      if (aIsKantin && !bIsKantin) return -1;
      if (!aIsKantin && bIsKantin) return 1;
      return 0;
    });
  }, [bins, searchQuery, selectedFloors, selectedStatuses]);

  // Calculate status counts
  const statusCounts = useMemo(() => {
    const counts = { 'Penuh': 0, 'Hampir Penuh': 0, 'Menengah': 0, 'Kosong': 0 };
    bins.forEach(bin => {
      const status = getStatusCategory(bin.max_percentage);
      counts[status]++;
    });
    return counts;
  }, [bins]);

  // Use aggregated composition data for Weight and Volume charts
  const volumeData = useMemo(() => {
    if (aggregatedVolumeData.length > 0) {
      return aggregatedVolumeData;
    }
    // Fallback data
    return [
      { name: "Organic", value: 0, color: "#22c55e" },
      { name: "Anorganic", value: 0, color: "#eab308" },
      { name: "Residue", value: 0, color: "#ef4444" }
    ];
  }, [aggregatedVolumeData]);

  const weightData = useMemo(() => {
    if (aggregatedWeightData.length > 0) {
      return aggregatedWeightData;
    }
    // Fallback data
    return [
      { name: "Organic", value: 0, color: "#22c55e" },
      { name: "Anorganic", value: 0, color: "#eab308" },
      { name: "Residue", value: 0, color: "#ef4444" }
    ];
  }, [aggregatedWeightData]);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200">
        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-600">Pemantauan Harian</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-3 sm:px-4 md:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
        {/* Status Overview - Mobile: 4 columns, Desktop: 4 columns */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {/* Penuh */}
          <div
            onClick={() => {
              if (selectedStatuses.includes('Penuh')) {
                setSelectedStatuses(selectedStatuses.filter(s => s !== 'Penuh'));
              } else {
                setSelectedStatuses([...selectedStatuses, 'Penuh']);
              }
            }}
            className={`bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-3 sm:p-4 text-white shadow-md border-2 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
              selectedStatuses.includes('Penuh') ? 'border-white ring-4 ring-red-300' : 'border-red-600'
            }`}
          >
            <h2 className="text-sm sm:text-base md:text-lg font-bold mb-1">Penuh</h2>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold">{statusCounts['Penuh']}</p>
          </div>

          {/* Hampir Penuh */}
          <div
            onClick={() => {
              if (selectedStatuses.includes('Hampir Penuh')) {
                setSelectedStatuses(selectedStatuses.filter(s => s !== 'Hampir Penuh'));
              } else {
                setSelectedStatuses([...selectedStatuses, 'Hampir Penuh']);
              }
            }}
            className={`bg-white rounded-lg p-3 sm:p-4 shadow-md border-2 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
              selectedStatuses.includes('Hampir Penuh') ? 'border-orange-600 ring-4 ring-orange-300' : 'border-orange-500'
            }`}
          >
            <h2 className="text-sm sm:text-base md:text-lg font-bold mb-1 text-gray-800">Hampir Penuh</h2>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-orange-600">{statusCounts['Hampir Penuh']}</p>
          </div>

          {/* Menengah */}
          <div
            onClick={() => {
              if (selectedStatuses.includes('Menengah')) {
                setSelectedStatuses(selectedStatuses.filter(s => s !== 'Menengah'));
              } else {
                setSelectedStatuses([...selectedStatuses, 'Menengah']);
              }
            }}
            className={`bg-white rounded-lg p-3 sm:p-4 shadow-md border-2 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
              selectedStatuses.includes('Menengah') ? 'border-yellow-600 ring-4 ring-yellow-300' : 'border-yellow-400'
            }`}
          >
            <h2 className="text-sm sm:text-base md:text-lg font-bold mb-1 text-gray-800">Menengah</h2>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-yellow-600">{statusCounts['Menengah']}</p>
          </div>

          {/* Kosong */}
          <div
            onClick={() => {
              if (selectedStatuses.includes('Kosong')) {
                setSelectedStatuses(selectedStatuses.filter(s => s !== 'Kosong'));
              } else {
                setSelectedStatuses([...selectedStatuses, 'Kosong']);
              }
            }}
            className={`bg-white rounded-lg p-3 sm:p-4 shadow-md border-2 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
              selectedStatuses.includes('Kosong') ? 'border-blue-600 ring-4 ring-blue-300' : 'border-blue-400'
            }`}
          >
            <h2 className="text-sm sm:text-base md:text-lg font-bold mb-1 text-gray-800">Kosong</h2>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-600">{statusCounts['Kosong']}</p>
          </div>
        </div>

        {/* Search, Filters, and Charts - Mobile: 2 cols (Filter full, Volume/Weight 50:50), Desktop: 4 columns (2:1:1 ratio) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Search and Filters - Takes 2 columns on mobile and desktop */}
          <div className="col-span-2 bg-white rounded-lg p-2.5 sm:p-3 shadow-md border border-gray-200">
            <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-2">Filter</h3>
            <div className="flex flex-col gap-2">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari Bin..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border-2 border-blue-300 rounded-lg text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-500 text-gray-800 pr-9"
                />
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-500" size={16} />
              </div>

              {/* Floor and Status Dropdowns - Side by side */}
              <div className="flex gap-2">
                {/* Floor Dropdown */}
                <div className="relative flex-1">
                  <button
                    onClick={() => {
                      setFloorDropdownOpen(!floorDropdownOpen);
                      setStatusDropdownOpen(false);
                    }}
                    className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border-2 border-blue-300 rounded-lg text-xs sm:text-sm font-medium bg-white flex items-center justify-between hover:border-blue-500 text-gray-800"
                  >
                    <span className="truncate">
                      {selectedFloors.length === 0
                        ? "Semua Lantai"
                        : selectedFloors.length === 1
                        ? selectedFloors[0]
                        : `${selectedFloors.length} Lantai`}
                    </span>
                    <ChevronDown size={16} />
                  </button>
                  {floorDropdownOpen && (
                    <div className="absolute z-20 w-full mt-1 bg-white border-2 border-blue-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div
                        onClick={() => setSelectedFloors([])}
                        className="px-2.5 sm:px-3 py-1.5 hover:bg-blue-50 cursor-pointer text-xs sm:text-sm font-medium text-gray-800 border-b border-gray-200"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFloors.length === 0}
                          onChange={() => {}}
                          className="mr-2"
                        />
                        Semua Lantai
                      </div>
                      {floorOptions.map((floor) => (
                        <div
                          key={floor}
                          onClick={() => {
                            setSelectedFloors(prev =>
                              prev.includes(floor)
                                ? prev.filter(f => f !== floor)
                                : [...prev, floor]
                            );
                          }}
                          className="px-2.5 sm:px-3 py-1.5 hover:bg-blue-50 cursor-pointer text-xs sm:text-sm font-medium text-gray-800"
                        >
                          <input
                            type="checkbox"
                            checked={selectedFloors.includes(floor)}
                            onChange={() => {}}
                            className="mr-2"
                          />
                          {floor}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Dropdown */}
                <div className="relative flex-1">
                  <button
                    onClick={() => {
                      setStatusDropdownOpen(!statusDropdownOpen);
                      setFloorDropdownOpen(false);
                    }}
                    className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border-2 border-blue-300 rounded-lg text-xs sm:text-sm font-medium bg-white flex items-center justify-between hover:border-blue-500 text-gray-800"
                  >
                    <span className="truncate">
                      {selectedStatuses.length === 0
                        ? "Semua Status"
                        : selectedStatuses.length === 1
                        ? selectedStatuses[0]
                        : `${selectedStatuses.length} Status`}
                    </span>
                    <ChevronDown size={16} />
                  </button>
                  {statusDropdownOpen && (
                    <div className="absolute z-20 w-full mt-1 bg-white border-2 border-blue-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div
                        onClick={() => setSelectedStatuses([])}
                        className="px-2.5 sm:px-3 py-1.5 hover:bg-blue-50 cursor-pointer text-xs sm:text-sm font-medium text-gray-800 border-b border-gray-200"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStatuses.length === 0}
                          onChange={() => {}}
                          className="mr-2"
                        />
                        Semua Status
                      </div>
                      {statusOptions.map((status) => (
                        <div
                          key={status}
                          onClick={() => {
                            setSelectedStatuses(prev =>
                              prev.includes(status)
                                ? prev.filter(s => s !== status)
                                : [...prev, status]
                            );
                          }}
                          className="px-2.5 sm:px-3 py-1.5 hover:bg-blue-50 cursor-pointer text-xs sm:text-sm font-medium text-gray-800"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStatuses.includes(status)}
                            onChange={() => {}}
                            className="mr-2"
                          />
                          {status}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Map View Button */}
              <button
                onClick={() => router.push('/map')}
                className="w-full px-2.5 sm:px-3 py-2 sm:py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg text-xs sm:text-sm font-semibold flex items-center my-5 justify-center gap-2 transition-all shadow-md hover:shadow-lg"
              >
                <MapIcon size={16} />
                <span>Simulasi Pengambilan Peta Interaktif</span>
              </button>
            </div>
          </div>

          {/* Volume Chart */}
          <div className="bg-white rounded-lg p-2.5 sm:p-3 shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm sm:text-base font-bold text-gray-800">Volume</h3>
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
            <div className="h-36 sm:h-44">
              {volumeToggle === "donut" ? (
                <div className="flex justify-center items-center h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={volumeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={66}
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
                      <Tooltip
                        formatter={(value: number) => `${value}%`}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '2px solid #3b82f6',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}
                      />
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

          {/* Weight Chart */}
          <div className="bg-white rounded-lg p-2.5 sm:p-3 shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm sm:text-base font-bold text-gray-800">Weight</h3>
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
            <div className="h-36 sm:h-44">
              {weightToggle === "donut" ? (
                <div className="flex justify-center items-center h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={weightData}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={66}
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
                      <Tooltip
                        formatter={(value: number) => `${value}%`}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '2px solid #3b82f6',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}
                      />
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

        {/* Bin Grid - Responsive */}
        <div className="bg-white rounded-lg p-3 sm:p-4 shadow-md border border-gray-200">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Trash Bins</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
            {filteredBins.map((bin) => {
              const borderColor = getBorderColor(bin.max_percentage);
              const bgColor = getBackgroundColor(bin.max_percentage);
              const slug = generateSlug(bin.name);

              return (
                <div
                  key={bin.trashbinid}
                  onClick={() => router.push(`/${slug}`)}
                  className={`bg-gradient-to-br ${bgColor} rounded-lg p-3 sm:p-4 border-3 sm:border-4 ${borderColor} hover:shadow-xl transition-all cursor-pointer hover:scale-105 relative`}
                >
                  <h3 className="font-bold text-center mb-2 sm:mb-3 text-sm sm:text-base text-gray-800" title={bin.name}>
                    {bin.name}
                  </h3>
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="text-gray-700 font-medium">Organik</span>
                      <span className={`font-bold ${getPercentageColor(bin.organic_percentage)}`}>
                        {bin.organic_percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="text-gray-700 font-medium">Anorganik</span>
                      <span className={`font-bold ${getPercentageColor(bin.anorganic_percentage)}`}>
                        {bin.anorganic_percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs sm:text-sm">
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
            <div className="text-center py-8 sm:py-12 text-gray-500">
              <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-gray-400" />
              <p className="text-base sm:text-lg font-medium">No bins found matching the filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonitoringPage;
