'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, Database } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface SensorReading {
  id: number
  location: string
  bin_type: string
  sensor_top_left: number
  sensor_top_right: number
  sensor_bottom_left: number
  sensor_bottom_right: number
  average_distance: number
  weight: number
  timestamp: string
  created_at: string
}

export default function DatabaseReadingsPage() {
  const router = useRouter()
  const [readings, setReadings] = useState<SensorReading[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string>('all')
  const [selectedBinType, setSelectedBinType] = useState<string>('all')
  const [locations, setLocations] = useState<string[]>([])

  // Fetch available locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/sensors/locations')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setLocations(data.data)
          }
        }
      } catch (err) {
        console.error('Error fetching locations:', err)
      }
    }

    fetchLocations()
  }, [])

  // Fetch readings
  const fetchReadings = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let url = 'http://localhost:5000/api/sensors/readings/all?limit=100'

      // If a specific location is selected
      if (selectedLocation !== 'all') {
        url = `http://localhost:5000/api/sensors/readings/${selectedLocation}?limit=100`
        if (selectedBinType !== 'all') {
          url += `&binType=${selectedBinType}`
        }
      }

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch readings')
      }

      const data = await response.json()

      if (data.success && data.data) {
        setReadings(data.data)
      } else {
        setReadings([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setReadings([])
    } finally {
      setLoading(false)
    }
  }, [selectedLocation, selectedBinType])

  useEffect(() => {
    fetchReadings()
  }, [fetchReadings])

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Jakarta'
    })
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Jakarta'
    }) + ' WIB'
  }

  const getBinTypeColor = (binType: string) => {
    switch (binType.toLowerCase()) {
      case 'organic':
        return 'bg-green-100 text-green-800'
      case 'anorganic':
        return 'bg-blue-100 text-blue-800'
      case 'residue':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back</span>
              </button>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Database className="w-8 h-8" />
                Database Readings
              </h1>
            </div>
            <button
              onClick={fetchReadings}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">Refresh</span>
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg shadow">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Locations</option>
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bin Type
              </label>
              <select
                value={selectedBinType}
                onChange={(e) => setSelectedBinType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="organic">Organic</option>
                <option value="anorganic">Anorganic</option>
                <option value="residue">Residue</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                Total Records: <strong>{readings.length}</strong>
              </span>
              {readings.length > 0 && (
                <span className="text-sm text-blue-700">
                  Latest: {formatDate(readings[0].timestamp)} at {formatTime(readings[0].timestamp)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium">Error: {error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading readings...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && readings.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Database className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 text-lg font-medium mb-2">No readings found</p>
            <p className="text-gray-500 text-sm">
              No sensor readings have been saved to the database yet.
            </p>
          </div>
        )}

        {/* Table */}
        {!loading && !error && readings.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bin Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sensors (cm)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Distance
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Weight (g)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {readings.map((reading) => (
                    <tr key={reading.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{reading.id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(reading.timestamp)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {formatTime(reading.timestamp)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {reading.location}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBinTypeColor(reading.bin_type)}`}>
                          {reading.bin_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <span>TL: {reading.sensor_top_left}</span>
                          <span>TR: {reading.sensor_top_right}</span>
                          <span>BL: {reading.sensor_bottom_left}</span>
                          <span>BR: {reading.sensor_bottom_right}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">
                        {typeof reading.average_distance === 'number' ? reading.average_distance : parseFloat(reading.average_distance)} cm
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {typeof reading.weight === 'number' ? reading.weight.toFixed(2) : parseFloat(reading.weight).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Database Info</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p>• All sensor readings are automatically saved when MQTT messages arrive</p>
            <p>• Data includes: location, bin type, 4 sensor readings, average distance, and weight</p>
            <p>• Showing last 100 records (most recent first)</p>
            <p>• Sensor positions: TL (Top Left), TR (Top Right), BL (Bottom Left), BR (Bottom Right)</p>
          </div>
        </div>
      </div>
    </div>
  )
}
