'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Database } from 'lucide-react'
import Bin3DVisualization from '@/components/Bin3DVisualization'
import { ChartComponent } from '@/components/ChartComponent'
import { binSlugToMqttTopic, binSlugMapping } from '@/data/mockData'

export const dynamic = 'force-dynamic'

// API Configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
const WS_URL = API_URL.replace('https://', 'wss://').replace('http://', 'ws://')

// ====================================
// INTERFACE UNTUK FORMAT DATA BARU
// ====================================
// Data dari 4 sensor ultrasonic (4 sudut bin)
interface BinSensorData {
  topLeft: number
  topRight: number
  bottomLeft: number
  bottomRight: number
  weight?: number // Weight in kilograms
}

// History data untuk tracking
interface BinDataHistory {
  timestamp: string
  sensors: BinSensorData
  average: number
  weight: number // Weight in kilograms
}

// API Response type for sensor readings
interface SensorReading {
  timestamp: string
  average_distance: number
}

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function ConditionPage({ params }: PageProps) {
  const router = useRouter()
  const [mqttTopic, setMqttTopic] = useState<string>('')
  const [binName, setBinName] = useState<string>('')

  // MQTT topics for Organic and Anorganic bins
  const [organicTopic, setOrganicTopic] = useState<string>('')
  const [anorganicTopic, setAnorganicTopic] = useState<string>('')

  // Unwrap params
  useEffect(() => {
    params.then(p => {
      const baseTopic = binSlugToMqttTopic[p.slug.toLowerCase()] || 'CapsE6/Unknown'
      setMqttTopic(baseTopic)

      // Set specific topics for Organic and Anorganic
      const location = baseTopic.split('/')[1] || 'Unknown'
      setOrganicTopic(`CapsE6/${location}/Organik`)
      setAnorganicTopic(`CapsE6/${location}/Anorganik`)

      const name = binSlugMapping[p.slug.toLowerCase()]?.name || 'Unknown Bin'
      setBinName(name)
    })
  }, [params])

  // ====================================
  // STATE UNTUK 3 BIN (masing-masing punya 4 sensor)
  // ====================================
  const [organicSensors, setOrganicSensors] = useState<BinSensorData | null>(null)
  const [anorganicSensors, setAnorganicSensors] = useState<BinSensorData | null>(null)
  const [residueSensors, setResidueSensors] = useState<BinSensorData | null>(null)

  // History untuk tracking perubahan
  const [organicHistory, setOrganicHistory] = useState<BinDataHistory[]>([])
  const [anorganicHistory, setAnorganicHistory] = useState<BinDataHistory[]>([])
  const [residueHistory, setResidueHistory] = useState<BinDataHistory[]>([])

  const [isConnected, setIsConnected] = useState(false)
  const [location, setLocation] = useState<string>('')
  const [lastUpdate, setLastUpdate] = useState<string>('')

  // Chart data for each bin type
  const [organicChartData, setOrganicChartData] = useState<Array<{time: string, value: number, fullTimestamp: string}>>([])
  const [anorganicChartData, setAnorganicChartData] = useState<Array<{time: string, value: number, fullTimestamp: string}>>([])
  const [residueChartData, setResidueChartData] = useState<Array<{time: string, value: number, fullTimestamp: string}>>([])

  // Fetch historical data from database
  useEffect(() => {
    const fetchHistoricalData = async () => {
      if (!mqttTopic) return

      const locationName = mqttTopic.split('/')[1] // Extract location from topic

      try {
        // Fetch data for each bin type
        const [organicRes, anorganicRes, residueRes] = await Promise.all([
          fetch(`${API_URL}/api/sensors/readings/${locationName}?binType=organic&limit=20`),
          fetch(`${API_URL}/api/sensors/readings/${locationName}?binType=anorganic&limit=20`),
          fetch(`${API_URL}/api/sensors/readings/${locationName}?binType=residue&limit=20`)
        ])

        if (organicRes.ok) {
          const data = await organicRes.json()
          if (data.success && data.data) {
            const chartData = data.data.reverse().map((reading: SensorReading) => ({
              time: new Date(reading.timestamp).toLocaleTimeString(),
              value: reading.average_distance || 0,
              fullTimestamp: new Date(reading.timestamp).toLocaleString()
            }))
            setOrganicChartData(chartData)
          }
        }

        if (anorganicRes.ok) {
          const data = await anorganicRes.json()
          if (data.success && data.data) {
            const chartData = data.data.reverse().map((reading: SensorReading) => ({
              time: new Date(reading.timestamp).toLocaleTimeString(),
              value: reading.average_distance || 0,
              fullTimestamp: new Date(reading.timestamp).toLocaleString()
            }))
            setAnorganicChartData(chartData)
          }
        }

        if (residueRes.ok) {
          const data = await residueRes.json()
          if (data.success && data.data) {
            const chartData = data.data.reverse().map((reading: SensorReading) => ({
              time: new Date(reading.timestamp).toLocaleTimeString(),
              value: reading.average_distance || 0,
              fullTimestamp: new Date(reading.timestamp).toLocaleString()
            }))
            setResidueChartData(chartData)
          }
        }
      } catch (error) {
        console.error('Error fetching historical data:', error)
      }
    }

    fetchHistoricalData()
    // Refresh historical data every 30 seconds
    const interval = setInterval(fetchHistoricalData, 30000)
    return () => clearInterval(interval)
  }, [mqttTopic])

  useEffect(() => {
    if (!organicTopic || !anorganicTopic) return

    // Initialize WebSocket connection
    const ws = new WebSocket(`${WS_URL}/ws`)

    ws.onopen = () => {
      setIsConnected(true)
      console.log('WebSocket connected for topics:', {
        organic: organicTopic,
        anorganic: anorganicTopic
      })

      // Subscribe to both topics
      ws.send(JSON.stringify({
        type: 'subscribe',
        topics: [organicTopic, anorganicTopic]
      }))
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        console.log('📩 WebSocket message received:', message)

        // Skip connection message
        if (message.type === 'connection') {
          console.log('WebSocket connection confirmed')
          return
        }

        // Skip subscription confirmation
        if (message.type === 'subscribed') {
          console.log('✅ Subscribed to topics:', message.topics)
          return
        }

        // Update location
        if (message.location) {
          setLocation(message.location)
        }

        // Update timestamp
        const timestamp = new Date().toLocaleTimeString()
        setLastUpdate(timestamp)

        // PARSING: Update sensor data based on MQTT topic
        if (message.data && message.data.sensors) {
          const sensors: BinSensorData = {
            ...message.data.sensors,
            weight: message.data.weight || 0
          }
          const historyEntry: BinDataHistory = {
            timestamp,
            sensors,
            average: message.data.average || 0,
            weight: message.data.weight || 0
          }

          // Determine bin type from MQTT topic
          const topic = message.topic || ''
          let binType: 'organic' | 'anorganic' | 'residue' = 'anorganic'

          if (topic.includes('/Organik')) {
            binType = 'organic'
          } else if (topic.includes('/Anorganik')) {
            binType = 'anorganic'
          } else if (topic.includes('/Residue')) {
            binType = 'residue'
          }

          console.log(`📥 Message from topic: ${topic} → ${binType}`)

          if (binType === 'organic') {
            setOrganicSensors(sensors)
            setOrganicHistory(prev => {
              const newData = [...prev, historyEntry]
              return newData.slice(-50) // Keep last 50 data points
            })
            console.log('✅ Updated organic bin:', sensors)
          } else if (binType === 'anorganic') {
            setAnorganicSensors(sensors)
            setAnorganicHistory(prev => {
              const newData = [...prev, historyEntry]
              return newData.slice(-50)
            })
            console.log('✅ Updated anorganic bin:', sensors)
          } else if (binType === 'residue') {
            setResidueSensors(sensors)
            setResidueHistory(prev => {
              const newData = [...prev, historyEntry]
              return newData.slice(-50)
            })
            console.log('✅ Updated residue bin:', sensors)
          }
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket data:', error)
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
  }, [organicTopic, anorganicTopic])

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* ====================================
            HEADER WITH BACK BUTTON
            ==================================== */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-xs sm:text-sm font-medium">Back</span>
              </button>
              <button
                onClick={() => router.push('/database-readings')}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Database className="w-4 h-4" />
                <span className="text-xs sm:text-sm font-medium">View DB</span>
              </button>
            </div>
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900 break-words">
              🗑️ {binName}
            </h1>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="font-semibold text-green-600">🌱 Organic:</span>
                <code className="bg-green-50 px-1.5 py-0.5 rounded text-xs break-all">{organicTopic}</code>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="font-semibold text-yellow-600">♻️ Anorganic:</span>
                <code className="bg-yellow-50 px-1.5 py-0.5 rounded text-xs break-all">{anorganicTopic}</code>
              </div>
            </div>
            {location && (
              <div className="flex items-center gap-1">
                <span className="font-semibold text-blue-600">📍 {location}</span>
              </div>
            )}
            {lastUpdate && (
              <div className="flex items-center gap-1 text-gray-500">
                <span>⏱️ {lastUpdate}</span>
              </div>
            )}
          </div>
        </div>

        {/* ====================================
            WASTE TYPE SECTIONS (Weight + 3D Visualization)
            On mobile: Organic → Anorganic → Residue
            On desktop: Side by side
            ==================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6 md:mb-8">
          {/* Organic Section */}
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Organic Weight */}
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-xs sm:text-sm font-semibold text-green-700 mb-1">🌱 Organic</h3>
                  <p className="text-xl sm:text-2xl font-bold text-green-900">
                    {organicSensors?.weight ? `${organicSensors.weight.toFixed(2)} kg` : '--'}
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">
                    {organicSensors?.weight && organicHistory.length >= 2 ?
                      (() => {
                        const previousWeight = organicHistory[organicHistory.length - 2]?.weight || 0
                        const diff = organicSensors.weight - previousWeight
                        const sign = diff >= 0 ? '+' : ''
                        return `${sign}${diff.toFixed(2)} kg`
                      })()
                      : 'No previous data'}
                  </p>
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl">⚖️</div>
              </div>
            </div>

            {/* Organic 3D Visualization */}
            <Bin3DVisualization
              binType="organic"
              sensorData={organicSensors}
            />

            {/* Organic Chart */}
            <div className="bg-white rounded-lg shadow p-3 sm:p-4">
              <h3 className="text-xs sm:text-sm font-semibold text-green-600 mb-2">Organic Distance Chart</h3>
              {organicChartData.length > 0 ? (
                <ChartComponent
                  data={organicChartData}
                  bgColor="bg-green-100"
                  height={150}
                />
              ) : (
                <div className="bg-green-50 rounded-lg p-4 text-center text-sm text-gray-500">
                  No historical data available
                </div>
              )}
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
                    {anorganicSensors?.weight ? `${anorganicSensors.weight.toFixed(2)} kg` : '--'}
                  </p>
                  <p className="text-xs text-yellow-600 mt-0.5">
                    {anorganicSensors?.weight && anorganicHistory.length >= 2 ?
                      (() => {
                        const previousWeight = anorganicHistory[anorganicHistory.length - 2]?.weight || 0
                        const diff = anorganicSensors.weight - previousWeight
                        const sign = diff >= 0 ? '+' : ''
                        return `${sign}${diff.toFixed(2)} kg`
                      })()
                      : 'No previous data'}
                  </p>
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl">⚖️</div>
              </div>
            </div>

            {/* Anorganic 3D Visualization */}
            <Bin3DVisualization
              binType="anorganic"
              sensorData={anorganicSensors}
            />

            {/* Anorganic Chart */}
            <div className="bg-white rounded-lg shadow p-3 sm:p-4">
              <h3 className="text-xs sm:text-sm font-semibold text-yellow-600 mb-2">Anorganic Distance Chart</h3>
              {anorganicChartData.length > 0 ? (
                <ChartComponent
                  data={anorganicChartData}
                  bgColor="bg-yellow-100"
                  height={150}
                />
              ) : (
                <div className="bg-yellow-50 rounded-lg p-4 text-center text-sm text-gray-500">
                  No historical data available
                </div>
              )}
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
                    {residueSensors?.weight ? `${residueSensors.weight.toFixed(2)} kg` : '--'}
                  </p>
                  <p className="text-xs text-orange-600 mt-0.5">
                    {residueSensors?.weight && residueHistory.length >= 2 ?
                      (() => {
                        const previousWeight = residueHistory[residueHistory.length - 2]?.weight || 0
                        const diff = residueSensors.weight - previousWeight
                        const sign = diff >= 0 ? '+' : ''
                        return `${sign}${diff.toFixed(2)} kg`
                      })()
                      : 'No previous data'}
                  </p>
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl">⚖️</div>
              </div>
            </div>

            {/* Residue 3D Visualization */}
            <Bin3DVisualization
              binType="residue"
              sensorData={residueSensors}
            />

            {/* Residue Chart */}
            <div className="bg-white rounded-lg shadow p-3 sm:p-4">
              <h3 className="text-xs sm:text-sm font-semibold text-orange-600 mb-2">Residue Distance Chart</h3>
              {residueChartData.length > 0 ? (
                <ChartComponent
                  data={residueChartData}
                  bgColor="bg-orange-100"
                  height={150}
                />
              ) : (
                <div className="bg-orange-50 rounded-lg p-4 text-center text-sm text-gray-500">
                  No historical data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* DATA HISTORY */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          {/* Anorganic History */}
          <div className="bg-white rounded-lg shadow p-3 sm:p-4">
            <h3 className="text-xs sm:text-sm font-semibold text-yellow-600 mb-2">♻️ Anorganic History</h3>
            <div className="text-xs text-gray-500 space-y-1 max-h-32 sm:max-h-40 overflow-y-auto">
              {anorganicHistory.length === 0 ? (
                <p className="text-orange-500">No data yet</p>
              ) : (
                anorganicHistory.slice(-5).reverse().map((entry, idx) => (
                  <div key={idx} className="border-b pb-1">
                    <div className="font-semibold">{entry.timestamp}</div>
                    <div>Avg: {entry.average}cm | Weight: {entry.weight.toFixed(2)}kg</div>
                    <div className="text-gray-400">Sensors: [{entry.sensors.topLeft}, {entry.sensors.topRight}, {entry.sensors.bottomLeft}, {entry.sensors.bottomRight}]</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Organic History */}
          <div className="bg-white rounded-lg shadow p-3 sm:p-4">
            <h3 className="text-xs sm:text-sm font-semibold text-green-600 mb-2">🌱 Organic History</h3>
            <div className="text-xs text-gray-500 space-y-1 max-h-32 sm:max-h-40 overflow-y-auto">
              {organicHistory.length === 0 ? (
                <p className="text-orange-500">No data yet</p>
              ) : (
                organicHistory.slice(-5).reverse().map((entry, idx) => (
                  <div key={idx} className="border-b pb-1">
                    <div className="font-semibold">{entry.timestamp}</div>
                    <div>Avg: {entry.average}cm | Weight: {entry.weight.toFixed(2)}kg</div>
                    <div className="text-gray-400">Sensors: [{entry.sensors.topLeft}, {entry.sensors.topRight}, {entry.sensors.bottomLeft}, {entry.sensors.bottomRight}]</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Residue History */}
          <div className="bg-white rounded-lg shadow p-3 sm:p-4">
            <h3 className="text-xs sm:text-sm font-semibold text-orange-600 mb-2">🗑️ Residue History</h3>
            <div className="text-xs text-gray-500 space-y-1 max-h-32 sm:max-h-40 overflow-y-auto">
              {residueHistory.length === 0 ? (
                <p className="text-orange-500">No data yet</p>
              ) : (
                residueHistory.slice(-5).reverse().map((entry, idx) => (
                  <div key={idx} className="border-b pb-1">
                    <div className="font-semibold">{entry.timestamp}</div>
                    <div>Avg: {entry.average}cm | Weight: {entry.weight.toFixed(2)}kg</div>
                    <div className="text-gray-400">Sensors: [{entry.sensors.topLeft}, {entry.sensors.topRight}, {entry.sensors.bottomLeft}, {entry.sensors.bottomRight}]</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3 sm:p-4 md:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">📖 System Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <h4 className="font-semibold text-xs sm:text-sm text-blue-800 mb-1 sm:mb-2">Current Implementation</h4>
              <ul className="text-xs sm:text-sm text-gray-700 space-y-0.5 sm:space-y-1">
                <li className="break-words">• Bin: <strong className="break-all">{binName}</strong></li>
                <li className="break-words">• Organic: <code className="bg-white px-1.5 py-0.5 rounded text-xs break-all">{organicTopic}</code></li>
                <li className="break-words">• Anorganic: <code className="bg-white px-1.5 py-0.5 rounded text-xs break-all">{anorganicTopic}</code></li>
                <li>• Total: <strong>8 sensors</strong> (4 per bin)</li>
                <li>• Weight in kilograms</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-xs sm:text-sm text-purple-800 mb-1 sm:mb-2">Future Phase</h4>
              <ul className="text-xs sm:text-sm text-gray-700 space-y-0.5 sm:space-y-1">
                <li className="break-words">• Add Residue bin</li>
                <li className="break-words">• Topic: <code className="bg-white px-1.5 py-0.5 rounded text-xs break-all">{mqttTopic}/Residue</code></li>
                <li>• Total: <strong>12 sensors</strong> (4 per bin × 3 bins)</li>
                <li>• Full waste categorization</li>
              </ul>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-blue-200">
            <p className="text-xs sm:text-sm text-gray-600 break-words">
              <strong>MQTT:</strong> <code className="bg-white px-1.5 py-0.5 rounded text-xs break-all">test.mosquitto.org:1883</code>
            </p>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
              <strong>WebSocket:</strong> <code className="bg-white px-1.5 py-0.5 rounded text-xs break-all">{WS_URL}/ws</code>
            </p>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
              <strong>API URL:</strong> <code className="bg-white px-1.5 py-0.5 rounded text-xs break-all">{API_URL}</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
