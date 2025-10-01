'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface WasteBinData {
  timestamp: string
  volume: number
  weight: number
}

interface LocationData {
  organic: WasteBinData[]
  anorganic: WasteBinData[]
  residue: WasteBinData[]
}

export default function TestingBinsPage() {
  const [data, setData] = useState<Record<string, LocationData>>({})
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [isConnected, setIsConnected] = useState(false)

  // Poll data from HTTP endpoint
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔄 Attempting to fetch from backend...')
        const response = await fetch('http://localhost:5000/api/waste-bins', {
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        console.log('📡 Response status:', response.status)
        if (response.ok) {
          const result = await response.json()
          console.log('✅ Data received:', Object.keys(result.data || {}))
          setData(result.data || {})
          setLastUpdate(new Date().toLocaleTimeString())
          setIsConnected(true)
        } else {
          console.log('❌ Response not ok:', response.status, response.statusText)
          setIsConnected(false)
        }
      } catch (error) {
        console.error('❌ Error fetching waste bin data:', error)
        setIsConnected(false)
      }
    }

    // Initial fetch
    fetchData()

    // Poll every 10 seconds to avoid rate limiting
    const interval = setInterval(fetchData, 10000)

    return () => clearInterval(interval)
  }, [])

  // Test simulation with your data format
  const testWithRealData = async () => {
    try {
      // Simulate data in your exact format
      const testData = [
        {
          topic: 'CapsE6/Lt2SGLC',
          data: {"org":{"v":148,"w":530},"an":{"v":134,"w":343},"re":{"v":139,"w":688}}
        },
        {
          topic: 'CapsE6/KantinSGLC',
          data: {"org":{"v":131,"w":892},"an":{"v":101,"w":874},"re":{"v":144,"w":693}}
        }
      ]

      for (const item of testData) {
        // Simulate MQTT message received
        const response = await fetch('http://localhost:5000/api/test/mqtt-simulate', {
          method: 'POST',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic: item.topic,
            data: item.data
          })
        })

        if (response.ok) {
          console.log(`✅ Test data sent for ${item.topic}`)
        } else {
          console.log(`❌ Failed to send test data for ${item.topic}:`, response.status)
        }
      }
    } catch (error) {
      console.error('Error sending test data:', error)
    }
  }

  const formatChartData = (binData: WasteBinData[], metric: 'volume' | 'weight') => {
    return binData.slice(-10).map(item => ({
      time: new Date(item.timestamp).toLocaleTimeString(),
      value: item[metric]
    }))
  }

  const getLatestValue = (binData: WasteBinData[], metric: 'volume' | 'weight') => {
    if (binData.length === 0) return 'N/A'
    return binData[binData.length - 1][metric]
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Waste Bin Monitoring Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'} | Last Update: {lastUpdate || 'Never'}
            </span>
            <button
              onClick={testWithRealData}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Test Real Data Format
            </button>
          </div>
        </div>

        {Object.keys(data).length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Data Yet</h3>
            <p className="text-yellow-700">
              Waiting for MQTT data from topics: CapsE6/Lt2SGLC and CapsE6/KantinSGLC
            </p>
            <div className="mt-4">
              <p className="text-sm text-yellow-600 mb-2">Expected data format:</p>
              <pre className="bg-yellow-100 p-2 rounded text-xs">
{`{"org":{"v":148,"w":530},"an":{"v":134,"w":343},"re":{"v":139,"w":688}}`}
              </pre>
            </div>
          </div>
        ) : (
          Object.entries(data).map(([location, locationData]) => (
            <div key={location} className="mb-12">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">{location}</h2>

              {/* Volume Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {['organic', 'anorganic', 'residue'].map((type) => (
                  <div key={`${location}-${type}-volume`} className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 capitalize">
                      {type} - Volume
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formatChartData(locationData[type as keyof LocationData], 'volume')}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="time"
                            tick={{ fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                          />
                          <YAxis />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={type === 'organic' ? '#22C55E' : type === 'anorganic' ? '#3B82F6' : '#EF4444'}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      Latest: {getLatestValue(locationData[type as keyof LocationData], 'volume')} units
                    </div>
                  </div>
                ))}
              </div>

              {/* Weight Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {['organic', 'anorganic', 'residue'].map((type) => (
                  <div key={`${location}-${type}-weight`} className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 capitalize">
                      {type} - Weight
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={formatChartData(locationData[type as keyof LocationData], 'weight')}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="time"
                            tick={{ fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                          />
                          <YAxis />
                          <Tooltip />
                          <Bar
                            dataKey="value"
                            fill={type === 'organic' ? '#22C55E' : type === 'anorganic' ? '#3B82F6' : '#EF4444'}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      Latest: {getLatestValue(locationData[type as keyof LocationData], 'weight')} kg
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* MQTT Configuration Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">MQTT Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-700">
            <div>
              <h4 className="font-semibold">Topics:</h4>
              <ul className="text-sm">
                <li>• CapsE6/Lt2SGLC</li>
                <li>• CapsE6/KantinSGLC</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">Data Format:</h4>
              <pre className="text-xs bg-blue-100 p-2 rounded mt-1">
{`{
  "org": {"v": 148, "w": 530},
  "an": {"v": 134, "w": 343},
  "re": {"v": 139, "w": 688}
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* API Endpoints */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">API Endpoints</h3>
          <ul className="text-gray-700 space-y-1 font-mono text-sm">
            <li>• <code>GET /api/waste-bins</code> - Get all waste bin data</li>
            <li>• <code>GET /api/waste-bins/Lt2SGLC</code> - Get Lt2SGLC data</li>
            <li>• <code>GET /api/waste-bins/KantinSGLC</code> - Get KantinSGLC data</li>
          </ul>
        </div>
      </div>
    </div>
  )
}