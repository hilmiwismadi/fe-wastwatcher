'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface SensorData {
  timestamp: string
  value: number
}

export default function TestingPage() {
  const [sensorData1, setSensorData1] = useState<SensorData[]>([])
  const [sensorData2, setSensorData2] = useState<SensorData[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Initialize WebSocket connection
    const ws = new WebSocket('ws://localhost:5000/ws')

    ws.onopen = () => {
      setIsConnected(true)
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const timestamp = new Date().toLocaleTimeString()

        if (data.sensor === 'sensor1') {
          setSensorData1(prev => {
            const newData = [...prev, { timestamp, value: data.value }]
            return newData.slice(-20) // Keep last 20 data points
          })
        } else if (data.sensor === 'sensor2') {
          setSensorData2(prev => {
            const newData = [...prev, { timestamp, value: data.value }]
            return newData.slice(-20) // Keep last 20 data points
          })
        }
      } catch (error) {
        console.error('Error parsing WebSocket data:', error)
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
      console.log('WebSocket disconnected')
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setIsConnected(false)
    }

    return () => {
      ws.close()
    }
  }, [])

  const startSimulation = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/test/start-simulation', {
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
      const response = await fetch('http://localhost:5000/api/test/stop-simulation', {
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
      const response = await fetch('http://localhost:5000/api/test/simulate', {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-4">MQTT Sensor Testing Dashboard</h1>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected to WebSocket' : 'Disconnected from WebSocket'}
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
              Data Points: {sensorData1.length} | Last Value: {sensorData1[sensorData1.length - 1]?.value || 'N/A'}
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
              Data Points: {sensorData2.length} | Last Value: {sensorData2[sensorData2.length - 1]?.value || 'N/A'}
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

        {/* Instructions */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Instructions</h3>
          <ul className="text-gray-700 space-y-1">
            <li>• Backend server is running on port 5000 with WebSocket support</li>
            <li>• Use "Start Simulation" to begin continuous data streaming</li>
            <li>• Use "Send Test Data" for one-time data injection</li>
            <li>• Connect your device to MQTT broker (optional) with topic: sensor/data</li>
            <li>• MQTT data format: {`{"sensor": "sensor1", "value": 123.45}`}</li>
            <li>• Charts show the last 20 data points with real-time updates</li>
          </ul>
        </div>
      </div>
    </div>
  )
}