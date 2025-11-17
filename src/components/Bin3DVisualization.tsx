'use client'

import { useEffect, useRef } from 'react'

// =====================================================
// INTERFACE UNTUK DATA SENSOR
// =====================================================
interface SensorData {
  topLeft: number      // Sensor di (12.5, 12.5)
  topRight: number     // Sensor di (37.5, 12.5)
  bottomLeft: number   // Sensor di (12.5, 37.5)
  bottomRight: number  // Sensor di (37.5, 37.5)
}

interface Bin3DVisualizationProps {
  binType: 'organic' | 'anorganic' | 'residue'
  sensorData: SensorData | null
}

// =====================================================
// KONSTANTA - DIMENSI BIN (dalam cm)
// =====================================================
const BIN_WIDTH = 50    // Panjang bin (cm)
const BIN_DEPTH = 50    // Lebar bin (cm)
const BIN_HEIGHT = 60   // Tinggi bin (cm) - adjusted for modified bin

// Posisi sensor dalam koordinat bin (cm dari sudut kiri bawah)
const SENSOR_POSITIONS = {
  topLeft: { x: 12.5, y: 12.5 },
  topRight: { x: 37.5, y: 12.5 },
  bottomLeft: { x: 12.5, y: 37.5 },
  bottomRight: { x: 37.5, y: 37.5 }
}

export default function Bin3DVisualization({
  binType,
  sensorData
}: Bin3DVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // =====================================================
  // KONFIGURASI WARNA UNTUK SETIAP BIN
  // =====================================================
  const getColor = () => {
    switch (binType) {
      case 'organic':
        return { primary: '#22C55E', secondary: '#16A34A', light: '#86EFAC', dark: '#15803D' }
      case 'anorganic':
        return { primary: '#3B82F6', secondary: '#2563EB', light: '#93C5FD', dark: '#1E40AF' }
      case 'residue':
        return { primary: '#F97316', secondary: '#EA580C', light: '#FDBA74', dark: '#C2410C' }
    }
  }

  const colors = getColor()

  // =====================================================
  // KONVERSI DISTANCE KE TINGGI SAMPAH
  // =====================================================
  // Distance = jarak dari sensor (di atas bin) ke permukaan terdeteksi
  // Baseline: TL/TR read 9cm when closed, BL/BR read 6cm when closed
  // When closed (baseline): show full bin = 60cm
  // Sensor is mounted ABOVE the bin, so distance includes air gap + bin content
  const distanceToWasteHeight = (distance: number, sensorPosition: 'TL' | 'TR' | 'BL' | 'BR'): number => {
    const baseline = (sensorPosition === 'TL' || sensorPosition === 'TR') ? 9 : 6
    // When at baseline (lid closed/full bin): height = 60cm (full bin)
    // When at baseline + BIN_HEIGHT (empty bin): height = 0cm (empty)
    // wasteHeight = (baseline + BIN_HEIGHT) - distance
    const wasteHeight = (baseline + BIN_HEIGHT) - distance
    return Math.max(0, Math.min(BIN_HEIGHT, wasteHeight))
  }

  // Konversi tinggi sampah ke persentase
  const wasteHeightToPercent = (wasteHeight: number): number => {
    return (wasteHeight / BIN_HEIGHT) * 100
  }

  // =====================================================
  // RENDER 3D VISUALIZATION
  // =====================================================
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = 500
    canvas.height = 500

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Default values jika tidak ada data (empty bin = baseline + BIN_HEIGHT)
    // TL/TR: 9 + 60 = 69cm, BL/BR: 6 + 60 = 66cm
    const sensors = sensorData || { topLeft: 69, topRight: 69, bottomLeft: 66, bottomRight: 66 }

    // Konversi distance ke tinggi sampah (dalam cm)
    // SWAPPED: Top row shows bottom data, Bottom row shows top data (swapped left-right)
    const wasteHeights = {
      topLeft: distanceToWasteHeight(sensors.bottomLeft, 'BL'),    // Shows C (bottomLeft data) - baseline 6cm
      topRight: distanceToWasteHeight(sensors.bottomRight, 'BR'),  // Shows D (bottomRight data) - baseline 6cm
      bottomLeft: distanceToWasteHeight(sensors.topRight, 'TR'),   // Shows B (topRight data) - baseline 9cm
      bottomRight: distanceToWasteHeight(sensors.topLeft, 'TL')    // Shows A (topLeft data) - baseline 9cm
    }

    // =====================================================
    // SETUP PERSPEKTIF & SKALA - ISOMETRIC VIEW
    // =====================================================

    const centerX = canvas.width / 2
    // Kamera adjustment: -35 + 20 = -15 pixels (dari baseline +50)
    const centerY = canvas.height / 2 + 50 - 15  // Adjustment total: +35

    // Scale factor untuk fit ke canvas
    const scale = 3.5

    // Perspective offset untuk 3D effect
    const perspectiveX = 60
    const perspectiveY = 80  // Diperbesar dari 40 ke 80 untuk sudut pandang lebih ke bawah

    // =====================================================
    // HELPER: Konversi koordinat bin ke canvas (Isometric)
    // =====================================================
    const binToCanvas = (x: number, y: number, z: number) => {
      return {
        x: centerX + (x - BIN_WIDTH / 2) * scale + (y / BIN_DEPTH) * perspectiveX,
        y: centerY - z * scale + (y / BIN_DEPTH) * perspectiveY
      }
    }

    // =====================================================
    // 1. GAMBAR CONTAINER BIN (WIREFRAME)
    // =====================================================

    // Bottom corners (z=0)
    const c1 = binToCanvas(0, 0, 0)      // Front-left-bottom
    const c2 = binToCanvas(BIN_WIDTH, 0, 0)   // Front-right-bottom
    const c3 = binToCanvas(BIN_WIDTH, BIN_DEPTH, 0) // Back-right-bottom
    const c4 = binToCanvas(0, BIN_DEPTH, 0)   // Back-left-bottom

    // Top corners (z=80)
    const c5 = binToCanvas(0, 0, BIN_HEIGHT)      // Front-left-top
    const c6 = binToCanvas(BIN_WIDTH, 0, BIN_HEIGHT)   // Front-right-top
    const c7 = binToCanvas(BIN_WIDTH, BIN_DEPTH, BIN_HEIGHT) // Back-right-top
    const c8 = binToCanvas(0, BIN_DEPTH, BIN_HEIGHT)   // Back-left-top

    // Draw bottom face
    ctx.fillStyle = '#F3F4F6'
    ctx.beginPath()
    ctx.moveTo(c1.x, c1.y)
    ctx.lineTo(c2.x, c2.y)
    ctx.lineTo(c3.x, c3.y)
    ctx.lineTo(c4.x, c4.y)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#9CA3AF'
    ctx.lineWidth = 2
    ctx.stroke()

    // Dinding sisi dihapus untuk tampilan lebih bersih

    // Draw bin wireframe edges only
    ctx.strokeStyle = '#9CA3AF'
    ctx.lineWidth = 2

    // Bottom edges
    ctx.beginPath()
    ctx.moveTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y)
    ctx.moveTo(c2.x, c2.y); ctx.lineTo(c3.x, c3.y)
    ctx.moveTo(c3.x, c3.y); ctx.lineTo(c4.x, c4.y)
    ctx.moveTo(c4.x, c4.y); ctx.lineTo(c1.x, c1.y)
    ctx.stroke()

    // Vertical edges
    ctx.strokeStyle = '#6B7280'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(c1.x, c1.y); ctx.lineTo(c5.x, c5.y)
    ctx.moveTo(c2.x, c2.y); ctx.lineTo(c6.x, c6.y)
    ctx.moveTo(c3.x, c3.y); ctx.lineTo(c7.x, c7.y)
    ctx.moveTo(c4.x, c4.y); ctx.lineTo(c8.x, c8.y)
    ctx.stroke()

    // Top edges
    ctx.strokeStyle = '#9CA3AF'
    ctx.beginPath()
    ctx.moveTo(c5.x, c5.y); ctx.lineTo(c6.x, c6.y)
    ctx.moveTo(c6.x, c6.y); ctx.lineTo(c7.x, c7.y)
    ctx.moveTo(c7.x, c7.y); ctx.lineTo(c8.x, c8.y)
    ctx.moveTo(c8.x, c8.y); ctx.lineTo(c5.x, c5.y)
    ctx.stroke()

    // =====================================================
    // 2. GAMBAR 4 KUBUS SAMPAH DI POSISI SENSOR
    // =====================================================

    const drawWasteCube = (
      posX: number,
      posY: number,
      height: number,
      label: string,
      distance: number,
      sensorPosition: 'TL' | 'TR' | 'BL' | 'BR',
      customColors?: { primary: string, secondary: string, light: string, dark: string }
    ) => {
      // Use custom colors if provided, otherwise use default bin colors
      const cubeColors = customColors || colors
      const cubeWidth = 25  // Lebar kubus dalam cm (mengisi 1/2 bin = 50/2 = 25cm)
      const cubeDepth = 25  // Kedalaman kubus dalam cm (mengisi 1/2 bin = 50/2 = 25cm)

      // 8 corners of the cube
      const cb1 = binToCanvas(posX - cubeWidth / 2, posY - cubeDepth / 2, 0)
      const cb2 = binToCanvas(posX + cubeWidth / 2, posY - cubeDepth / 2, 0)
      const cb3 = binToCanvas(posX + cubeWidth / 2, posY + cubeDepth / 2, 0)
      const cb4 = binToCanvas(posX - cubeWidth / 2, posY + cubeDepth / 2, 0)

      const ct1 = binToCanvas(posX - cubeWidth / 2, posY - cubeDepth / 2, height)
      const ct2 = binToCanvas(posX + cubeWidth / 2, posY - cubeDepth / 2, height)
      const ct3 = binToCanvas(posX + cubeWidth / 2, posY + cubeDepth / 2, height)
      const ct4 = binToCanvas(posX - cubeWidth / 2, posY + cubeDepth / 2, height)

      // =====================================================
      // TRANSPARENT SIDES (hanya wireframe)
      // =====================================================

      // Front face - TRANSPARENT dengan outline
      ctx.strokeStyle = cubeColors.primary
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(cb1.x, cb1.y)
      ctx.lineTo(cb2.x, cb2.y)
      ctx.lineTo(ct2.x, ct2.y)
      ctx.lineTo(ct1.x, ct1.y)
      ctx.closePath()
      ctx.stroke()

      // Right face - TRANSPARENT dengan outline
      ctx.strokeStyle = cubeColors.primary
      ctx.beginPath()
      ctx.moveTo(cb2.x, cb2.y)
      ctx.lineTo(cb3.x, cb3.y)
      ctx.lineTo(ct3.x, ct3.y)
      ctx.lineTo(ct2.x, ct2.y)
      ctx.closePath()
      ctx.stroke()

      // Left face - TRANSPARENT dengan outline
      ctx.strokeStyle = cubeColors.primary
      ctx.beginPath()
      ctx.moveTo(cb1.x, cb1.y)
      ctx.lineTo(cb4.x, cb4.y)
      ctx.lineTo(ct4.x, ct4.y)
      ctx.lineTo(ct1.x, ct1.y)
      ctx.closePath()
      ctx.stroke()

      // Back face - TRANSPARENT dengan outline
      ctx.strokeStyle = cubeColors.primary
      ctx.beginPath()
      ctx.moveTo(cb4.x, cb4.y)
      ctx.lineTo(cb3.x, cb3.y)
      ctx.lineTo(ct3.x, ct3.y)
      ctx.lineTo(ct4.x, ct4.y)
      ctx.closePath()
      ctx.stroke()

      // =====================================================
      // TOP FACE - SOLID (tidak transparan)
      // =====================================================
      const gradientTop = ctx.createRadialGradient(
        (ct1.x + ct2.x + ct3.x + ct4.x) / 4,
        (ct1.y + ct2.y + ct3.y + ct4.y) / 4,
        0,
        (ct1.x + ct2.x + ct3.x + ct4.x) / 4,
        (ct1.y + ct2.y + ct3.y + ct4.y) / 4,
        50
      )
      gradientTop.addColorStop(0, cubeColors.light)
      gradientTop.addColorStop(1, cubeColors.primary)

      ctx.fillStyle = gradientTop
      ctx.beginPath()
      ctx.moveTo(ct1.x, ct1.y)
      ctx.lineTo(ct2.x, ct2.y)
      ctx.lineTo(ct3.x, ct3.y)
      ctx.lineTo(ct4.x, ct4.y)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = cubeColors.dark
      ctx.lineWidth = 2
      ctx.stroke()

      // =====================================================
      // WIREFRAME VERTICAL EDGES (untuk volume)
      // =====================================================
      ctx.strokeStyle = cubeColors.secondary
      ctx.lineWidth = 1.5
      ctx.setLineDash([])

      // 4 vertical edges
      ctx.beginPath()
      ctx.moveTo(cb1.x, cb1.y); ctx.lineTo(ct1.x, ct1.y)
      ctx.moveTo(cb2.x, cb2.y); ctx.lineTo(ct2.x, ct2.y)
      ctx.moveTo(cb3.x, cb3.y); ctx.lineTo(ct3.x, ct3.y)
      ctx.moveTo(cb4.x, cb4.y); ctx.lineTo(ct4.x, ct4.y)
      ctx.stroke()

      // =====================================================
      // LABELS
      // =====================================================
      const labelX = (ct1.x + ct2.x + ct3.x + ct4.x) / 4
      const labelY = (ct1.y + ct2.y + ct3.y + ct4.y) / 4

      // Distance label
      ctx.fillStyle = '#FFFFFF'
      ctx.strokeStyle = '#1F2937'
      ctx.lineWidth = 3
      ctx.font = 'bold 12px monospace'
      ctx.strokeText(`${distance.toFixed(0)}cm`, labelX - 20, labelY)
      ctx.fillText(`${distance.toFixed(0)}cm`, labelX - 20, labelY)

      // Sensor label
      ctx.font = '10px monospace'
      ctx.fillStyle = '#6B7280'
      ctx.fillText(label, labelX - 10, labelY - 12)

      // Waste height below
      const wasteHeightCm = distanceToWasteHeight(distance, sensorPosition)
      ctx.font = '9px monospace'
      ctx.fillStyle = cubeColors.dark
      ctx.fillText(`↑${wasteHeightCm.toFixed(0)}cm`, labelX - 18, labelY + 12)
    }

    // =====================================================
    // ACAK URUTAN RENDERING (untuk depth variation)
    // =====================================================

    // Define custom colors for organic bin to distinguish sensors
    const getSensorColors = () => {
      // For organic bin, use default green colors for all sensors
      // For other bin types, return undefined to use their default colors
      return undefined
    }

    // Array of cubes dengan data lengkap
    // SWAPPED: Visual positions swapped with data sources
    const cubes = [
      {
        pos: SENSOR_POSITIONS.topLeft,
        height: wasteHeights.topLeft,
        label: 'TL',
        distance: sensors.bottomLeft,  // Shows C data at top-left visual position
        sensorPosition: 'BL' as const,  // Uses BL sensor baseline (6cm)
        colors: getSensorColors(),
        // Tambahkan sedikit offset acak untuk visual variety
        offsetX: Math.sin(sensors.bottomLeft) * 2,
        offsetY: Math.cos(sensors.bottomLeft) * 2
      },
      {
        pos: SENSOR_POSITIONS.topRight,
        height: wasteHeights.topRight,
        label: 'TR',
        distance: sensors.bottomRight,  // Shows D data at top-right visual position
        sensorPosition: 'BR' as const,  // Uses BR sensor baseline (6cm)
        colors: getSensorColors(),
        offsetX: Math.sin(sensors.bottomRight + 1) * 2,
        offsetY: Math.cos(sensors.bottomRight + 1) * 2
      },
      {
        pos: SENSOR_POSITIONS.bottomLeft,
        height: wasteHeights.bottomLeft,
        label: 'BL',
        distance: sensors.topRight,  // Shows B data at bottom-left visual position
        sensorPosition: 'TR' as const,  // Uses TR sensor baseline (9cm)
        colors: getSensorColors(),
        offsetX: Math.sin(sensors.topRight + 2) * 2,
        offsetY: Math.cos(sensors.topRight + 2) * 2
      },
      {
        pos: SENSOR_POSITIONS.bottomRight,
        height: wasteHeights.bottomRight,
        label: 'BR',
        distance: sensors.topLeft,  // Shows A data at bottom-right visual position
        sensorPosition: 'TL' as const,  // Uses TL sensor baseline (9cm)
        colors: getSensorColors(),
        offsetX: Math.sin(sensors.topLeft + 3) * 2,
        offsetY: Math.cos(sensors.topLeft + 3) * 2
      }
    ]

    // Sort by Y position (back to front) untuk proper depth
    // Tapi dengan sedikit randomness berdasarkan height
    cubes.sort((a, b) => {
      const aDepth = a.pos.y + (a.height * 0.1)  // Height influence depth slightly
      const bDepth = b.pos.y + (b.height * 0.1)
      return aDepth - bDepth
    })

    // Draw cubes dalam urutan yang sudah diacak
    cubes.forEach(cube => {
      drawWasteCube(
        cube.pos.x + cube.offsetX,
        cube.pos.y + cube.offsetY,
        cube.height,
        cube.label,
        cube.distance,
        cube.sensorPosition,
        cube.colors
      )
    })

    // =====================================================
    // 3. LEGEND & SCALE
    // =====================================================

    // Scale indicator on the left
    ctx.strokeStyle = '#6B7280'
    ctx.lineWidth = 2
    const scaleX = 30
    const scaleBottomY = centerY
    const scaleTopY = centerY - BIN_HEIGHT * scale

    // Scale line
    ctx.beginPath()
    ctx.moveTo(scaleX, scaleBottomY)
    ctx.lineTo(scaleX, scaleTopY)
    ctx.stroke()

    // Scale markers
    ctx.font = '10px monospace'
    ctx.fillStyle = '#6B7280'
    for (let i = 0; i <= 4; i++) {
      const y = scaleBottomY - (BIN_HEIGHT * scale * i / 4)
      const label = (BIN_HEIGHT * i / 4).toFixed(0)

      ctx.beginPath()
      ctx.moveTo(scaleX - 5, y)
      ctx.lineTo(scaleX + 5, y)
      ctx.stroke()

      ctx.fillText(label + 'cm', scaleX + 10, y + 4)
    }

    // Bin dimensions label
    ctx.font = 'bold 11px monospace'
    ctx.fillStyle = '#374151'
    ctx.fillText(`Bin: ${BIN_WIDTH}×${BIN_DEPTH}×${BIN_HEIGHT}cm`, 10, 20)

  }, [sensorData, colors])

  // =====================================================
  // RENDER COMPONENT
  // =====================================================
  const getBinName = () => {
    switch (binType) {
      case 'organic': return '🌱 Organic Waste'
      case 'anorganic': return '♻️ Anorganic Waste'
      case 'residue': return '🗑️ Residue Waste'
    }
  }

  const getAverageHeight = () => {
    if (!sensorData) return 0
    // Calculate waste height for each sensor with their respective baselines
    const tlHeight = distanceToWasteHeight(sensorData.topLeft, 'TL')
    const trHeight = distanceToWasteHeight(sensorData.topRight, 'TR')
    const blHeight = distanceToWasteHeight(sensorData.bottomLeft, 'BL')
    const brHeight = distanceToWasteHeight(sensorData.bottomRight, 'BR')
    const avgWasteHeight = (tlHeight + trHeight + blHeight + brHeight) / 4
    return wasteHeightToPercent(avgWasteHeight)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2" style={{ color: colors.primary }}>
          {getBinName()}
        </h2>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Avg Fill Level: <strong>{getAverageHeight().toFixed(1)}%</strong></span>
          {!sensorData && <span className="text-orange-500 text-xs">⚠️ No data</span>}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ maxWidth: '500px', margin: '0 auto', display: 'block' }}
      />

      {sensorData && (
        <div className="mt-4">
          <div className="text-xs text-gray-500 mb-2 font-semibold">Sensor Readings (Distance from top):</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 p-2 rounded">
              <div className="flex justify-between">
                <span className="text-gray-500">TL (12.5, 12.5):</span>
                <strong>{sensorData.topLeft}cm</strong>
              </div>
              <div className="text-xs text-gray-400">
                Waste: {distanceToWasteHeight(sensorData.topLeft, 'TL').toFixed(0)}cm (baseline: 9cm)
              </div>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <div className="flex justify-between">
                <span className="text-gray-500">TR (37.5, 12.5):</span>
                <strong>{sensorData.topRight}cm</strong>
              </div>
              <div className="text-xs text-gray-400">
                Waste: {distanceToWasteHeight(sensorData.topRight, 'TR').toFixed(0)}cm (baseline: 9cm)
              </div>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <div className="flex justify-between">
                <span className="text-gray-500">BL (12.5, 37.5):</span>
                <strong>{sensorData.bottomLeft}cm</strong>
              </div>
              <div className="text-xs text-gray-400">
                Waste: {distanceToWasteHeight(sensorData.bottomLeft, 'BL').toFixed(0)}cm (baseline: 6cm)
              </div>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <div className="flex justify-between">
                <span className="text-gray-500">BR (37.5, 37.5):</span>
                <strong>{sensorData.bottomRight}cm</strong>
              </div>
              <div className="text-xs text-gray-400">
                Waste: {distanceToWasteHeight(sensorData.bottomRight, 'BR').toFixed(0)}cm (baseline: 6cm)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
