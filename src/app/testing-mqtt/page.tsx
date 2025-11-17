'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// API Configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface SensorData {
  timestamp: string
  value: number
}

export default function TestingMQTTPage() {
  const [sensorData1, setSensorData1] = useState<SensorData[]>([])
  const [sensorData2, setSensorData2] = useState<SensorData[]>([])
  const [lastUpdate, setLastUpdate] = useState<string>('')

  // Poll data from HTTP endpoint instead of WebSocket
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/sensor/data`)
        if (response.ok) {
          const result = await response.json()

          // Update sensor 1 data
          if (result.sensors.sensor1 && result.sensors.sensor1.length > 0) {
            setSensorData1(result.sensors.sensor1.map((item: { timestamp: string; value: number }) => ({
              timestamp: new Date(item.timestamp).toLocaleTimeString(),
              value: item.value
            })))
          }

          // Update sensor 2 data
          if (result.sensors.sensor2 && result.sensors.sensor2.length > 0) {
            setSensorData2(result.sensors.sensor2.map((item: { timestamp: string; value: number }) => ({
              timestamp: new Date(item.timestamp).toLocaleTimeString(),
              value: item.value
            })))
          }

          setLastUpdate(new Date().toLocaleTimeString())
        }
      } catch (error) {
        console.error('Error fetching sensor data:', error)
      }
    }

    // Initial fetch
    fetchData()

    // Poll every 1 second
    const interval = setInterval(fetchData, 1000)

    return () => clearInterval(interval)
  }, [])

  const startSimulation = async () => {
    try {
      const response = await fetch(`${API_URL}/api/test/start-simulation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const result = await response.json()
      console.log('Simulation started:', result.message)
    } catch (error) {
      console.error('Error starting simulation:', error)
    }
  }

  const stopSimulation = async () => {
    try {
      const response = await fetch(`${API_URL}/api/test/stop-simulation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const result = await response.json()
      console.log('Simulation stopped:', result.message)
    } catch (error) {
      console.error('Error stopping simulation:', error)
    }
  }

  const sendTestData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/test/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const result = await response.json()
      console.log('Test data sent:', result.message)
    } catch (error) {
      console.error('Error sending test data:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Pure MQTT Testing Dashboard</h1>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm text-gray-600">
              HTTP Polling Mode | Last Update: {lastUpdate || 'Never'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sensor 1 Chart */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Sensor 1 Data</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sensorData1}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Data Points: {sensorData1.length} | Last Value: {sensorData1[sensorData1.length - 1]?.value?.toFixed(2) || 'N/A'}
            </div>
          </div>

          {/* Sensor 2 Chart */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Sensor 2 Data</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sensorData2}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Data Points: {sensorData2.length} | Last Value: {sensorData2[sensorData2.length - 1]?.value?.toFixed(2) || 'N/A'}
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">Test Controls</h3>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={startSimulation}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Start Simulation
            </button>
            <button
              onClick={stopSimulation}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Stop Simulation
            </button>
            <button
              onClick={sendTestData}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Send Test Data
            </button>
          </div>
        </div>

        {/* Instructions for Pure MQTT */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-2">Pure MQTT Mode</h3>
          <ul className="text-green-700 space-y-1">
            <li>• <strong>No WebSocket</strong> - Uses HTTP polling every second</li>
            <li>• MQTT data flows: Device → MQTT Broker → Backend Storage → HTTP API → Charts</li>
            <li>• Your friend&apos;s device publishes to: <code className="bg-green-100 px-1 rounded">sensor/data</code></li>
            <li>• Data format: <code className="bg-green-100 px-1 rounded">{`{"sensor": "sensor1", "value": 75.5}`}</code></li>
            <li>• Backend automatically stores MQTT data for HTTP polling</li>
            <li>• Charts update every second via REST API calls</li>
          </ul>
        </div>

        {/* API Endpoints */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">API Endpoints</h3>
          <ul className="text-gray-700 space-y-1 font-mono text-sm">
            <li>• <code>GET /api/sensor/data</code> - Get all sensor data</li>
            <li>• <code>GET /api/sensor/data/sensor1</code> - Get sensor1 data only</li>
            <li>• <code>GET /api/sensor/data/sensor2</code> - Get sensor2 data only</li>
            <li>• <code>POST /api/test/start-simulation</code> - Start test data</li>
            <li>• <code>POST /api/test/stop-simulation</code> - Stop test data</li>
          </ul>
        </div>
      </div>
    </div>
  )
}