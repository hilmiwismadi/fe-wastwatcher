'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Bin3DVisualization from '@/components/Bin3DVisualization'
import { binSlugToMqttTopic, binSlugMapping } from '@/data/mockData'

// ====================================
// INTERFACE UNTUK FORMAT DATA BARU
// ====================================
// Data dari 4 sensor ultrasonic (4 sudut bin)
interface BinSensorData {
  topLeft: number
  topRight: number
  bottomLeft: number
  bottomRight: number
  weight?: number // Weight in grams
}

// History data untuk tracking
interface BinDataHistory {
  timestamp: string
  sensors: BinSensorData
  average: number
  weight: number // Weight in grams
}

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function ConditionPage({ params }: PageProps) {
  const router = useRouter()
  const [slug, setSlug] = useState<string>('')
  const [mqttTopic, setMqttTopic] = useState<string>('')
  const [binName, setBinName] = useState<string>('')

  // Unwrap params
  useEffect(() => {
    params.then(p => {
      setSlug(p.slug)
      const topic = binSlugToMqttTopic[p.slug.toLowerCase()] || 'CapsE6/Unknown'
      setMqttTopic(topic)
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

  useEffect(() => {
    if (!mqttTopic) return

    // Initialize WebSocket connection
    const ws = new WebSocket('ws://localhost:5000/ws')

    ws.onopen = () => {
      setIsConnected(true)
      console.log('WebSocket connected for topic:', mqttTopic)
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

        // Update location
        if (message.location) {
          setLocation(message.location)
        }

        // Update timestamp
        const timestamp = new Date().toLocaleTimeString()
        setLastUpdate(timestamp)

        // PARSING: Update sensor data berdasarkan binType
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

          // Update based on bin type
          const binType = message.binType || 'organic' // Default ke organic

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
  }, [mqttTopic])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* ====================================
            HEADER WITH BACK BUTTON
            ==================================== */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back</span>
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              🗑️ {binName} - Real-time Condition
            </h1>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected to WebSocket' : 'Disconnected from WebSocket'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-purple-600">
                📡 MQTT Topic: <code className="bg-purple-50 px-2 py-1 rounded">{mqttTopic}</code>
              </span>
            </div>
            {location && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-blue-600">
                  📍 Location: {location}
                </span>
              </div>
            )}
            {lastUpdate && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  ⏱️ Last Update: {lastUpdate}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ====================================
            WEIGHT DISPLAY CARDS
            ==================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Organic Weight */}
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-green-700 mb-1">🌱 Organic Weight</h3>
                <p className="text-2xl font-bold text-green-900">
                  {organicSensors?.weight ? `${(organicSensors.weight / 1000).toFixed(2)} kg` : '-- kg'}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {organicSensors?.weight ? `${organicSensors.weight} grams` : 'No data'}
                </p>
              </div>
              <div className="text-4xl">⚖️</div>
            </div>
          </div>

          {/* Anorganic Weight */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-blue-700 mb-1">♻️ Anorganic Weight</h3>
                <p className="text-2xl font-bold text-blue-900">
                  {anorganicSensors?.weight ? `${(anorganicSensors.weight / 1000).toFixed(2)} kg` : '-- kg'}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {anorganicSensors?.weight ? `${anorganicSensors.weight} grams` : 'No data'}
                </p>
              </div>
              <div className="text-4xl">⚖️</div>
            </div>
          </div>

          {/* Residue Weight */}
          <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-orange-700 mb-1">🗑️ Residue Weight</h3>
                <p className="text-2xl font-bold text-orange-900">
                  {residueSensors?.weight ? `${(residueSensors.weight / 1000).toFixed(2)} kg` : '-- kg'}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  {residueSensors?.weight ? `${residueSensors.weight} grams` : 'No data'}
                </p>
              </div>
              <div className="text-4xl">⚖️</div>
            </div>
          </div>
        </div>

        {/* ====================================
            3 VISUALISASI 3D UNTUK 3 BIN
            ==================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Bin3DVisualization
            binType="organic"
            sensorData={organicSensors}
          />
          <Bin3DVisualization
            binType="anorganic"
            sensorData={anorganicSensors}
          />
          <Bin3DVisualization
            binType="residue"
            sensorData={residueSensors}
          />
        </div>

        {/* DATA HISTORY */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Organic History */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-green-600 mb-2">🌱 Organic History</h3>
            <div className="text-xs text-gray-500 space-y-1 max-h-40 overflow-y-auto">
              {organicHistory.length === 0 ? (
                <p className="text-orange-500">No data yet</p>
              ) : (
                organicHistory.slice(-5).reverse().map((entry, idx) => (
                  <div key={idx} className="border-b pb-1">
                    <div className="font-semibold">{entry.timestamp}</div>
                    <div>Avg: {entry.average}cm | Weight: {(entry.weight / 1000).toFixed(2)}kg</div>
                    <div className="text-gray-400">Sensors: [{entry.sensors.topLeft}, {entry.sensors.topRight}, {entry.sensors.bottomLeft}, {entry.sensors.bottomRight}]</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Anorganic History */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-blue-600 mb-2">♻️ Anorganic History</h3>
            <div className="text-xs text-gray-500 space-y-1 max-h-40 overflow-y-auto">
              {anorganicHistory.length === 0 ? (
                <p className="text-orange-500">No data yet</p>
              ) : (
                anorganicHistory.slice(-5).reverse().map((entry, idx) => (
                  <div key={idx} className="border-b pb-1">
                    <div className="font-semibold">{entry.timestamp}</div>
                    <div>Avg: {entry.average}cm | Weight: {(entry.weight / 1000).toFixed(2)}kg</div>
                    <div className="text-gray-400">Sensors: [{entry.sensors.topLeft}, {entry.sensors.topRight}, {entry.sensors.bottomLeft}, {entry.sensors.bottomRight}]</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Residue History */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-orange-600 mb-2">🗑️ Residue History</h3>
            <div className="text-xs text-gray-500 space-y-1 max-h-40 overflow-y-auto">
              {residueHistory.length === 0 ? (
                <p className="text-orange-500">No data yet</p>
              ) : (
                residueHistory.slice(-5).reverse().map((entry, idx) => (
                  <div key={idx} className="border-b pb-1">
                    <div className="font-semibold">{entry.timestamp}</div>
                    <div>Avg: {entry.average}cm | Weight: {(entry.weight / 1000).toFixed(2)}kg</div>
                    <div className="text-gray-400">Sensors: [{entry.sensors.topLeft}, {entry.sensors.topRight}, {entry.sensors.bottomLeft}, {entry.sensors.bottomRight}]</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">📖 System Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-sm text-blue-800 mb-2">Current Phase (Development)</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Bin: <strong>{binName}</strong></li>
                <li>• Topic: <code className="bg-white px-2 py-1 rounded text-xs">{mqttTopic}</code></li>
                <li>• Data: <code className="bg-white px-2 py-1 rounded text-xs">{`{"DISTANCE":[60,59,75,73],"WEIGHT":2454}`}</code></li>
                <li>• Currently showing: <strong>Organic only</strong> (4 sensors + weight)</li>
                <li>• Sensor layout: [TopLeft, TopRight, BottomLeft, BottomRight]</li>
                <li>• Weight: in grams (e.g., 2454g = 2.45kg)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-purple-800 mb-2">Future Phase (Production)</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Topic: <code className="bg-white px-2 py-1 rounded text-xs">{mqttTopic}/Organic</code></li>
                <li>• Topic: <code className="bg-white px-2 py-1 rounded text-xs">{mqttTopic}/Anorganic</code></li>
                <li>• Topic: <code className="bg-white px-2 py-1 rounded text-xs">{mqttTopic}/Residue</code></li>
                <li>• Total: <strong>12 sensors</strong> (4 per bin × 3 bins)</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-sm text-gray-600">
              <strong>MQTT Broker:</strong> <code className="bg-white px-2 py-1 rounded text-xs">mqtt://test.mosquitto.org:1883</code>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>WebSocket:</strong> <code className="bg-white px-2 py-1 rounded text-xs">ws://localhost:5000/ws</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
