'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

// Grid configuration
const GRID_W = 35;
const GRID_H = 20;
const BASE_CELL_SIZE = 25; // Base cell size for desktop
const HEAD_Y_TOP = 7;
const HEAD_Y_BOT = 13;
const THRESHOLD = 0.80;
const LIFT_POS = { x: 0, y: 3 }; // Lift position for floor transitions

// Types
interface Position {
  x: number;
  y: number;
}

interface Bin {
  id: string;
  position: Position;
  color: string;
  fillLevel: number;
  cluster: string;
}

interface Cluster {
  name: string;
  bins: string[];
  service: Position;
  zone: string;
}

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

interface PathNode {
  x: number;
  y: number;
  floor?: FloorType;
}

type FloorType = 'F1' | 'F4' | 'F5' | 'F6';

export default function InteractiveMapVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentFloor, setCurrentFloor] = useState<FloorType>('F1');
  const [selectedFloors, setSelectedFloors] = useState<FloorType[]>(['F1']);
  const [floorDropdownOpen, setFloorDropdownOpen] = useState(false);
  const [draggedBin, setDraggedBin] = useState<string | null>(null);
  const [bins, setBins] = useState<Bin[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [blocked, setBlocked] = useState<boolean[][]>([]);
  const [path, setPath] = useState<PathNode[]>([]);
  const [animating, setAnimating] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [strategy, setStrategy] = useState<'shortest' | 'patrol'>('shortest');
  const [_algorithm, _setAlgorithm] = useState<'astar' | 'dijkstra'>('astar');
  const [mode, _setMode] = useState<'drag' | 'block' | 'select'>('drag');
  const [selectedPoints, setSelectedPoints] = useState<Position[]>([]);
  const [customBlocked, setCustomBlocked] = useState<Position[]>([]);
  const [speed, setSpeed] = useState<1 | 2 | 4 | 8 | 16>(1);
  const [isPaused, setIsPaused] = useState(false);
  const [cellSize, setCellSize] = useState(BASE_CELL_SIZE);

  // Store all floors' bins
  const [allFloorsBins, setAllFloorsBins] = useState<{
    F1: { bins: Bin[], clusters: Cluster[] },
    F4: { bins: Bin[], clusters: Cluster[] },
    F5: { bins: Bin[], clusters: Cluster[] },
    F6: { bins: Bin[], clusters: Cluster[] }
  }>(() => {
    const f1Data = initializeFloor('F1');
    const f4Data = initializeFloor('F4');
    const f5Data = initializeFloor('F5');
    const f6Data = initializeFloor('F6');
    return {
      F1: { bins: f1Data.bins, clusters: f1Data.clusters },
      F4: { bins: f4Data.bins, clusters: f4Data.clusters },
      F5: { bins: f5Data.bins, clusters: f5Data.clusters },
      F6: { bins: f6Data.bins, clusters: f6Data.clusters }
    };
  });

  // Initialize floor on mount and when floor changes
  useEffect(() => {
    const floorData = allFloorsBins[currentFloor];
    const { blocked: newBlocked } = initializeFloor(currentFloor);
    setBins(floorData.bins);
    setClusters(floorData.clusters);
    setBlocked(newBlocked);

    // Don't clear path/customBlocked/selectedPoints during animation
    if (!animating) {
      setPath([]);
      setCustomBlocked([]);
      setSelectedPoints([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFloor, animating]);

  // Sync bins changes back to allFloorsBins
  useEffect(() => {
    setAllFloorsBins(prev => ({
      ...prev,
      [currentFloor]: { bins, clusters }
    }));
  }, [bins, clusters, currentFloor]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (floorDropdownOpen && !target.closest('.relative')) {
        setFloorDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [floorDropdownOpen]);

  // Calculate cell size based on window width for mobile responsiveness
  useEffect(() => {
    const calculateCellSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const padding = 32; // Account for padding
        const availableWidth = containerWidth - padding;
        const calculatedSize = Math.floor(availableWidth / GRID_W);
        // Minimum cell size of 10px, maximum of BASE_CELL_SIZE
        const newSize = Math.max(10, Math.min(BASE_CELL_SIZE, calculatedSize));
        setCellSize(newSize);
      }
    };

    // Calculate on mount and resize
    calculateCellSize();
    window.addEventListener('resize', calculateCellSize);
    return () => window.removeEventListener('resize', calculateCellSize);
  }, []);

  function initializeFloor(floor: FloorType) {
    if (floor === 'F1') {
      return initializeFloor1();
    } else {
      return initializeFloor456(floor);
    }
  }

  // Floor 1 initialization (original layout)
  function initializeFloor1() {
    const bins: Bin[] = [
      // Koperasi Bin
      { id: 'koperasi1', position: { x: 2, y: 5 }, color: '#00AA00', fillLevel: 60, cluster: 'Koperasi Bin' },
      { id: 'koperasi2', position: { x: 3, y: 5 }, color: '#FFD000', fillLevel: 83, cluster: 'Koperasi Bin' },
      { id: 'koperasi3', position: { x: 4, y: 5 }, color: '#CC0000', fillLevel: 90, cluster: 'Koperasi Bin' },
      // Kantin Bin
      { id: 'kantin1', position: { x: GRID_W - 12, y: 3 }, color: '#CC0000', fillLevel: 70, cluster: 'Kantin Bin' },
      { id: 'kantin2', position: { x: GRID_W - 12, y: 4 }, color: '#FFD000', fillLevel: 55, cluster: 'Kantin Bin' },
      { id: 'kantin3', position: { x: GRID_W - 12, y: 5 }, color: '#00AA00', fillLevel: 40, cluster: 'Kantin Bin' },
      // LT1 Barat (West)
      { id: 'lt1barat1', position: { x: 1, y: 15 }, color: '#CC0000', fillLevel: 92, cluster: 'LT1 Barat' },
      { id: 'lt1barat2', position: { x: 1, y: 16 }, color: '#FFD000', fillLevel: 88, cluster: 'LT1 Barat' },
      { id: 'lt1barat3', position: { x: 1, y: 17 }, color: '#00AA00', fillLevel: 95, cluster: 'LT1 Barat' },
      // LT1 Selatan (South)
      { id: 'lt1selatan1', position: { x: 16, y: 19 }, color: '#00AA00', fillLevel: 35, cluster: 'LT1 Selatan' },
      { id: 'lt1selatan2', position: { x: 17, y: 19 }, color: '#FFD000', fillLevel: 48, cluster: 'LT1 Selatan' },
      { id: 'lt1selatan3', position: { x: 18, y: 19 }, color: '#CC0000', fillLevel: 60, cluster: 'LT1 Selatan' },
      // LT1 Timur (East)
      { id: 'lt1timur1', position: { x: GRID_W - 2, y: 15 }, color: '#CC0000', fillLevel: 88, cluster: 'LT1 Timur' },
      { id: 'lt1timur2', position: { x: GRID_W - 2, y: 16 }, color: '#FFD000', fillLevel: 85, cluster: 'LT1 Timur' },
      { id: 'lt1timur3', position: { x: GRID_W - 2, y: 17 }, color: '#00AA00', fillLevel: 90, cluster: 'LT1 Timur' },
    ];

    const clusters: Cluster[] = [
      { name: 'Koperasi Bin', bins: ['koperasi1', 'koperasi2', 'koperasi3'], service: { x: 3, y: 6 }, zone: 'koperasi' },
      { name: 'Kantin Bin', bins: ['kantin1', 'kantin2', 'kantin3'], service: { x: GRID_W - 13, y: 4 }, zone: 'kantin' },
      { name: 'LT1 Barat', bins: ['lt1barat1', 'lt1barat2', 'lt1barat3'], service: { x: 2, y: 16 }, zone: 'bottom_left' },
      { name: 'LT1 Selatan', bins: ['lt1selatan1', 'lt1selatan2', 'lt1selatan3'], service: { x: 17, y: 18 }, zone: 'bottom_center' },
      { name: 'LT1 Timur', bins: ['lt1timur1', 'lt1timur2', 'lt1timur3'], service: { x: GRID_W - 3, y: 16 }, zone: 'bottom_right' },
    ];

    const blocked = initializeBlockedF1(clusters, bins);

    return { bins, clusters, blocked };
  }

  // Floor 4/5/6 initialization (classroom layout)
  function initializeFloor456(floor: FloorType) {
    const fillLevels: Record<string, { left: number; right: number }> = {
      F4: { left: 70, right: 90 },
      F5: { left: 40, right: 85 },
      F6: { left: 95, right: 55 },
    };

    const levels = fillLevels[floor];
    const floorNum = floor.substring(1); // "4", "5", or "6"

    const bins: Bin[] = [
      // Barat (West - left side)
      { id: `lt${floorNum}barat1`, position: { x: 0, y: 6 }, color: '#CC0000', fillLevel: levels.left + 10, cluster: `LT${floorNum} Barat` },
      { id: `lt${floorNum}barat2`, position: { x: 0, y: 7 }, color: '#FFD000', fillLevel: levels.left, cluster: `LT${floorNum} Barat` },
      { id: `lt${floorNum}barat3`, position: { x: 0, y: 8 }, color: '#00AA00', fillLevel: levels.left - 10, cluster: `LT${floorNum} Barat` },
      // Timur (East - right side)
      { id: `lt${floorNum}timur1`, position: { x: GRID_W - 1, y: 9 }, color: '#00AA00', fillLevel: levels.right - 10, cluster: `LT${floorNum} Timur` },
      { id: `lt${floorNum}timur2`, position: { x: GRID_W - 1, y: 10 }, color: '#FFD000', fillLevel: levels.right, cluster: `LT${floorNum} Timur` },
      { id: `lt${floorNum}timur3`, position: { x: GRID_W - 1, y: 11 }, color: '#CC0000', fillLevel: levels.right + 10, cluster: `LT${floorNum} Timur` },
    ];

    const clusters: Cluster[] = [
      { name: `LT${floorNum} Barat`, bins: [`lt${floorNum}barat1`, `lt${floorNum}barat2`, `lt${floorNum}barat3`], service: { x: 1, y: 7 }, zone: 'barat' },
      { name: `LT${floorNum} Timur`, bins: [`lt${floorNum}timur1`, `lt${floorNum}timur2`, `lt${floorNum}timur3`], service: { x: GRID_W - 2, y: 10 }, zone: 'timur' },
    ];

    const blocked = initializeBlockedF456(clusters, bins);

    return { bins, clusters, blocked };
  }

  function initializeBlockedF1(clusters: Cluster[], bins: Bin[]): boolean[][] {
    const grid: boolean[][] = Array(GRID_W).fill(null).map(() => Array(GRID_H).fill(false));

    const blockHLine = (x0: number, x1: number, y: number) => {
      const [a, b] = x0 <= x1 ? [x0, x1] : [x1, x0];
      for (let x = a; x <= b; x++) {
        if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) grid[x][y] = true;
      }
    };

    const blockVLine = (x: number, y0: number, y1: number) => {
      const [a, b] = y0 <= y1 ? [y0, y1] : [y1, y0];
      for (let y = a; y <= b; y++) {
        if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) grid[x][y] = true;
      }
    };

    // Block room areas
    const rooms: Room[] = [
      { x: 2, y: 0, w: 7, h: 5, label: 'Koperasi' },
      { x: GRID_W - 11, y: 0, w: 11, h: 6, label: 'Kantin' },
      { x: 13, y: 7, w: 3, h: 3, label: 'Lift' },
      { x: 13, y: 10, w: 3, h: 3, label: 'Lift' },
      { x: 19, y: 7, w: 3, h: 3, label: 'Lift' },
      { x: 19, y: 10, w: 3, h: 3, label: 'Lift' },
    ];

    rooms.forEach(room => {
      for (let x = room.x; x < room.x + room.w; x++) {
        for (let y = room.y; y < room.y + room.h; y++) {
          if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) grid[x][y] = true;
        }
      }
    });

    // Block corridor walls
    blockHLine(0, 16, HEAD_Y_TOP);
    blockHLine(19, GRID_W - 1, HEAD_Y_TOP);
    blockHLine(0, 16, HEAD_Y_BOT);
    blockHLine(19, GRID_W - 1, HEAD_Y_BOT);
    blockVLine(16, HEAD_Y_TOP, HEAD_Y_BOT);
    blockVLine(19, HEAD_Y_TOP, HEAD_Y_BOT);

    // Block outer walls
    blockHLine(0, GRID_W - 1, 0);
    blockHLine(0, GRID_W - 1, GRID_H - 1);
    blockVLine(0, 0, GRID_H - 1);
    blockVLine(GRID_W - 1, 0, GRID_H - 1);

    // Block additional interior wall
    blockVLine(12, 7, 12);

    // Block all bin positions
    bins.forEach(bin => {
      if (bin.position.x >= 0 && bin.position.x < GRID_W &&
          bin.position.y >= 0 && bin.position.y < GRID_H) {
        grid[bin.position.x][bin.position.y] = true;
      }
    });

    // Unblock service points and lift position (these should be accessible)
    clusters.forEach(c => {
      if (c.service.x >= 0 && c.service.x < GRID_W && c.service.y >= 0 && c.service.y < GRID_H) {
        grid[c.service.x][c.service.y] = false;
      }
    });
    grid[LIFT_POS.x][LIFT_POS.y] = false; // lift position for all floors

    return grid;
  }

  function initializeBlockedF456(clusters: Cluster[], bins: Bin[]): boolean[][] {
    const grid: boolean[][] = Array(GRID_W).fill(null).map(() => Array(GRID_H).fill(false));

    // Block classrooms and lifts
    const rooms: Room[] = [
      { x: 13, y: 11, w: 3, h: 3, label: 'Lift' },
      { x: 13, y: 14, w: 3, h: 3, label: 'Lift' },
      { x: 19, y: 11, w: 3, h: 3, label: 'Lift' },
      { x: 19, y: 14, w: 3, h: 3, label: 'Lift' },
      { x: 19, y: 0, w: 12, h: 6, label: 'Kelas' },
      { x: 4, y: 0, w: 12, h: 6, label: 'Kelas' },
      { x: 22, y: 9, w: 9, h: 11, label: 'Kelas' },
      { x: 4, y: 9, w: 9, h: 11, label: 'Kelas' },
    ];

    rooms.forEach(room => {
      for (let x = room.x; x < room.x + room.w; x++) {
        for (let y = room.y; y < room.y + room.h; y++) {
          if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) grid[x][y] = true;
        }
      }
    });

    // Block all bin positions
    bins.forEach(bin => {
      if (bin.position.x >= 0 && bin.position.x < GRID_W &&
          bin.position.y >= 0 && bin.position.y < GRID_H) {
        grid[bin.position.x][bin.position.y] = true;
      }
    });

    // Unblock service points and lift position (these should be accessible)
    clusters.forEach(c => {
      if (c.service.x >= 0 && c.service.x < GRID_W && c.service.y >= 0 && c.service.y < GRID_H) {
        grid[c.service.x][c.service.y] = false;
      }
    });
    grid[LIFT_POS.x][LIFT_POS.y] = false; // lift position for all floors

    return grid;
  }

  // A* pathfinding algorithm - guarantees shortest path
  function astar(start: Position, goal: Position, blockedGrid: boolean[][]): PathNode[] {
    if (start.x === goal.x && start.y === goal.y) return [start];

    // Manhattan distance heuristic (admissible for 4-directional movement)
    const h = (p: Position) => Math.abs(p.x - goal.x) + Math.abs(p.y - goal.y);

    const openSet: Array<{ f: number; g: number; pos: Position }> = [];
    openSet.push({ f: h(start), g: 0, pos: start });

    const closedSet = new Set<string>();
    const cameFrom = new Map<string, Position>();
    const gScore = new Map<string, number>();
    gScore.set(`${start.x},${start.y}`, 0);

    while (openSet.length > 0) {
      // Sort by f-score to get node with lowest cost
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;
      const key = `${current.pos.x},${current.pos.y}`;

      // If already processed, skip
      if (closedSet.has(key)) continue;
      closedSet.add(key);

      // Goal reached - reconstruct path
      if (current.pos.x === goal.x && current.pos.y === goal.y) {
        const path: PathNode[] = [];
        let p: Position = current.pos;
        while (true) {
          path.unshift(p);
          const k = `${p.x},${p.y}`;
          if (!cameFrom.has(k)) break;
          p = cameFrom.get(k)!;
        }
        return path;
      }

      // Explore neighbors (4-directional movement)
      const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of directions) {
        const nx = current.pos.x + dx;
        const ny = current.pos.y + dy;
        const nkey = `${nx},${ny}`;

        // Check bounds
        if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) continue;

        // Check if blocked or already processed
        if (blockedGrid[nx][ny]) continue;
        if (closedSet.has(nkey)) continue;

        // Calculate tentative g-score (cost from start)
        const ng = current.g + 1;

        // Only update if this is a better path
        if (!gScore.has(nkey) || ng < gScore.get(nkey)!) {
          gScore.set(nkey, ng);
          cameFrom.set(nkey, current.pos);

          // Add to open set with f-score = g + h
          openSet.push({
            f: ng + h({ x: nx, y: ny }),
            g: ng,
            pos: { x: nx, y: ny }
          });
        }
      }
    }

    // No path found
    return [];
  }

  // Build route based on strategy (supports multi-floor)
  function buildMultiFloorRoute(strat: 'shortest' | 'patrol'): Array<{pos: Position, floor: FloorType}> {
    const route: Array<{pos: Position, floor: FloorType}> = [];

    // Build route for each selected floor
    selectedFloors.forEach((floor, index) => {
      const floorData = allFloorsBins[floor];

      // Calculate cluster fill levels for this floor
      const clusterFillLevels = new Map<string, number>();
      floorData.clusters.forEach(cluster => {
        const clusterBins = floorData.bins.filter(b => cluster.bins.includes(b.id));
        const avgFill = clusterBins.reduce((sum, b) => sum + b.fillLevel, 0) / clusterBins.length;
        clusterFillLevels.set(cluster.name, avgFill);
      });

      // Start at lift for EVERY floor (not just first)
      route.push({ pos: LIFT_POS, floor });

      if (strat === 'shortest') {
        // Only visit DUE clusters (≥80% full)
        const dueClusters = floorData.clusters.filter(c => {
          const avgFill = clusterFillLevels.get(c.name)!;
          return avgFill >= THRESHOLD * 100;
        });

        console.log(`${floor} - Clusters:`, floorData.clusters.map(c => ({
          name: c.name,
          avgFill: clusterFillLevels.get(c.name)?.toFixed(1) + '%',
          isDue: clusterFillLevels.get(c.name)! >= THRESHOLD * 100
        })));

        // Only process if there are DUE clusters
        if (dueClusters.length > 0) {
          // Get service points for DUE clusters only
          const duePoints = dueClusters.map(c => c.service);

          // Add DUE service points using nearest neighbor
          const remaining = [...duePoints];
          let current = LIFT_POS;

          while (remaining.length > 0) {
            const nearest = remaining.reduce((best, p) => {
              const dist = Math.abs(p.x - current.x) + Math.abs(p.y - current.y);
              const bestDist = Math.abs(best.x - current.x) + Math.abs(best.y - current.y);
              return dist < bestDist ? p : best;
            });
            route.push({ pos: nearest, floor });
            remaining.splice(remaining.indexOf(nearest), 1);
            current = nearest;
          }
        } else {
          console.log(`${floor} - No DUE clusters to visit`);
        }
      } else {
        // Visit all clusters (Full Patrol mode)
        floorData.clusters.forEach(cluster => {
          route.push({ pos: cluster.service, floor });
        });
      }

      // Return to lift to transition to next floor (only if not the last floor)
      if (index < selectedFloors.length - 1) {
        route.push({ pos: LIFT_POS, floor });
      }
    });

    // End at lift on the last floor
    route.push({ pos: LIFT_POS, floor: selectedFloors[selectedFloors.length - 1] });

    return route;
  }

  // Build full path with pathfinding (multi-floor support)
  function buildFullPathMultiFloor(route: Array<{pos: Position, floor: FloorType}>): PathNode[] {
    const fullPath: PathNode[] = [];

    for (let i = 0; i < route.length - 1; i++) {
      const start = route[i];
      const end = route[i + 1];

      // Get bins and blocked grid for current floor (bins should be blocked)
      const _floorData = allFloorsBins[start.floor];
      const floorBlocked = initializeFloor(start.floor).blocked;

      // If transitioning between floors, just add lift positions
      if (start.floor !== end.floor) {
        fullPath.push({ ...start.pos, floor: start.floor });
        fullPath.push({ ...LIFT_POS, floor: end.floor });
      } else {
        // Same floor - calculate path
        const segment = astar(start.pos, end.pos, floorBlocked);
        if (segment.length > 0) {
          const segmentWithFloor = segment.map(node => ({ ...node, floor: start.floor }));
          if (fullPath.length === 0) {
            fullPath.push(...segmentWithFloor);
          } else {
            fullPath.push(...segmentWithFloor.slice(1));
          }
        }
      }
    }

    return fullPath;
  }

  function handleFindRoute() {
    const route = buildMultiFloorRoute(strategy);
    const fullPath = buildFullPathMultiFloor(route);
    setPath(fullPath);
    setCurrentFrame(0);
    setAnimating(true);
  }

  // Animation effect (with floor switching and pause support)
  useEffect(() => {
    if (!animating || isPaused || currentFrame >= path.length - 1) {
      if (currentFrame >= path.length - 1 && path.length > 0) {
        setAnimating(false);
        setIsPaused(false);
      }
      return;
    }

    // Check if we need to change floors
    const currentNode = path[currentFrame];
    if (currentNode?.floor && currentNode.floor !== currentFloor) {
      // Switch to the new floor
      setCurrentFloor(currentNode.floor);
    }

    // Base interval 200ms divided by speed multiplier
    const interval = 200 / speed;
    const timer = setTimeout(() => {
      setCurrentFrame(prev => prev + 1);
    }, interval);

    return () => clearTimeout(timer);
  }, [animating, isPaused, currentFrame, path, speed, currentFloor]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ensure blocked array is initialized
    if (blocked.length === 0) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= GRID_W; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, GRID_H * cellSize);
      ctx.stroke();
    }
    for (let y = 0; y <= GRID_H; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(GRID_W * cellSize, y * cellSize);
      ctx.stroke();
    }

    // Draw walls (black lines)
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, GRID_W * cellSize, GRID_H * cellSize);

    if (currentFloor === 'F1') {
      // Hammer corridor walls
      ctx.beginPath();
      ctx.moveTo(0, HEAD_Y_TOP * cellSize);
      ctx.lineTo(16 * cellSize, HEAD_Y_TOP * cellSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(19 * cellSize, HEAD_Y_TOP * cellSize);
      ctx.lineTo(GRID_W * cellSize, HEAD_Y_TOP * cellSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, HEAD_Y_BOT * cellSize);
      ctx.lineTo(16 * cellSize, HEAD_Y_BOT * cellSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(19 * cellSize, HEAD_Y_BOT * cellSize);
      ctx.lineTo(GRID_W * cellSize, HEAD_Y_BOT * cellSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(16 * cellSize, HEAD_Y_TOP * cellSize);
      ctx.lineTo(16 * cellSize, HEAD_Y_BOT * cellSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(19 * cellSize, HEAD_Y_TOP * cellSize);
      ctx.lineTo(19 * cellSize, HEAD_Y_BOT * cellSize);
      ctx.stroke();
    }

    // Draw blocked cells (gray)
    for (let x = 0; x < GRID_W; x++) {
      for (let y = 0; y < GRID_H; y++) {
        if (blocked[x][y]) {
          ctx.fillStyle = '#d1d5db';
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }

    // Draw rooms with labels
    const rooms: Room[] = currentFloor === 'F1' ? [
      { x: 2, y: 0, w: 7, h: 5, label: 'Koperasi' },
      { x: GRID_W - 11, y: 0, w: 11, h: 6, label: 'Kantin' },
      { x: 13, y: 7, w: 3, h: 3, label: 'Lift' },
      { x: 13, y: 10, w: 3, h: 3, label: 'Lift' },
      { x: 19, y: 7, w: 3, h: 3, label: 'Lift' },
      { x: 19, y: 10, w: 3, h: 3, label: 'Lift' },
    ] : [
      { x: 13, y: 11, w: 3, h: 3, label: 'Lift' },
      { x: 13, y: 14, w: 3, h: 3, label: 'Lift' },
      { x: 19, y: 11, w: 3, h: 3, label: 'Lift' },
      { x: 19, y: 14, w: 3, h: 3, label: 'Lift' },
      { x: 19, y: 0, w: 12, h: 6, label: 'Kelas' },
      { x: 4, y: 0, w: 12, h: 6, label: 'Kelas' },
      { x: 22, y: 9, w: 9, h: 11, label: 'Kelas' },
      { x: 4, y: 9, w: 9, h: 11, label: 'Kelas' },
    ];

    rooms.forEach(room => {
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(room.x * cellSize, room.y * cellSize, room.w * cellSize, room.h * cellSize);
      ctx.strokeRect(room.x * cellSize, room.y * cellSize, room.w * cellSize, room.h * cellSize);

      ctx.fillStyle = '#666';
      ctx.font = `${Math.max(8, cellSize * 0.4)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(room.label, (room.x + room.w / 2) * cellSize, (room.y + room.h / 2) * cellSize);
    });

    // Draw custom blocked cells
    customBlocked.forEach(pos => {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.fillRect(pos.x * cellSize, pos.y * cellSize, cellSize, cellSize);
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.strokeRect(pos.x * cellSize, pos.y * cellSize, cellSize, cellSize);
    });

    // Draw selected points
    selectedPoints.forEach(pos => {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
      ctx.fillRect(pos.x * cellSize, pos.y * cellSize, cellSize, cellSize);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(pos.x * cellSize, pos.y * cellSize, cellSize, cellSize);

      ctx.fillStyle = '#1e40af';
      ctx.font = `${Math.max(7, cellSize * 0.36)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${pos.x},${pos.y}`, pos.x * cellSize + cellSize / 2, pos.y * cellSize + cellSize / 2);
    });

    // Draw path (only current floor's segments)
    if (path.length > 1) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = Math.max(2, cellSize * 0.12);

      // Filter path to only show current floor
      const currentFloorPath = path
        .slice(0, currentFrame + 1)
        .filter(node => !node.floor || node.floor === currentFloor);

      if (currentFloorPath.length > 1) {
        ctx.beginPath();
        ctx.moveTo(currentFloorPath[0].x * cellSize + cellSize / 2, currentFloorPath[0].y * cellSize + cellSize / 2);
        for (let i = 1; i < currentFloorPath.length; i++) {
          ctx.lineTo(currentFloorPath[i].x * cellSize + cellSize / 2, currentFloorPath[i].y * cellSize + cellSize / 2);
        }
        ctx.stroke();
      }
    }

    // Draw bins
    bins.forEach(bin => {
      const isDragged = draggedBin === bin.id;
      const padding = isDragged ? Math.max(1, cellSize * 0.08) : 0;
      ctx.fillStyle = bin.color;
      ctx.fillRect(
        bin.position.x * cellSize + padding,
        bin.position.y * cellSize + padding,
        cellSize - padding * 2,
        cellSize - padding * 2
      );
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(bin.position.x * cellSize, bin.position.y * cellSize, cellSize, cellSize);

      ctx.fillStyle = '#000';
      ctx.font = `${Math.max(6, cellSize * 0.32)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${bin.fillLevel}%`, bin.position.x * cellSize + cellSize / 2, bin.position.y * cellSize + cellSize / 2);
    });

    // Draw service points
    clusters.forEach(cluster => {
      ctx.fillStyle = '#8b5cf6';
      ctx.beginPath();
      ctx.arc(cluster.service.x * cellSize + cellSize / 2, cluster.service.y * cellSize + cellSize / 2, Math.max(3, cellSize * 0.16), 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw lift position (elevator icon - square with up/down arrows)
    const liftPadding = Math.max(3, cellSize * 0.16);
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(LIFT_POS.x * cellSize + liftPadding, LIFT_POS.y * cellSize + liftPadding, cellSize - liftPadding * 2, cellSize - liftPadding * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(LIFT_POS.x * cellSize + liftPadding, LIFT_POS.y * cellSize + liftPadding, cellSize - liftPadding * 2, cellSize - liftPadding * 2);

    // Draw elevator symbol (up/down arrows)
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(10, cellSize * 0.56)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⇅', LIFT_POS.x * cellSize + cellSize / 2, LIFT_POS.y * cellSize + cellSize / 2);

    // Draw current position during animation (only if on current floor)
    if (animating && currentFrame < path.length) {
      const currentNode = path[currentFrame];
      if (!currentNode.floor || currentNode.floor === currentFloor) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(currentNode.x * cellSize + cellSize / 2, currentNode.y * cellSize + cellSize / 2, Math.max(6, cellSize * 0.32), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [bins, draggedBin, path, currentFrame, animating, clusters, blocked, customBlocked, selectedPoints, currentFloor, cellSize]);

  // Mouse event handlers
  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);

    if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return;

    if (mode === 'drag') {
      const clickedBin = bins.find(b => b.position.x === x && b.position.y === y);
      if (clickedBin) {
        setDraggedBin(clickedBin.id);
      }
    } else if (mode === 'block') {
      const newBlocked = blocked.map(row => [...row]);
      newBlocked[x][y] = !newBlocked[x][y];
      setBlocked(newBlocked);

      const idx = customBlocked.findIndex(p => p.x === x && p.y === y);
      if (idx >= 0) {
        setCustomBlocked(prev => prev.filter((_, i) => i !== idx));
      } else {
        setCustomBlocked(prev => [...prev, { x, y }]);
      }
    } else if (mode === 'select') {
      const idx = selectedPoints.findIndex(p => p.x === x && p.y === y);
      if (idx >= 0) {
        setSelectedPoints(prev => prev.filter((_, i) => i !== idx));
      } else {
        setSelectedPoints(prev => [...prev, { x, y }]);
      }
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (mode !== 'drag' || !draggedBin) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);

    if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H && !blocked[x][y]) {
      setBins(prev => prev.map(b => b.id === draggedBin ? { ...b, position: { x, y } } : b));
    }
  }

  function handleMouseUp() {
    setDraggedBin(null);
  }

  function clearSelectedPoints() {
    setSelectedPoints([]);
  }

  function clearCustomBlocked() {
    setCustomBlocked([]);
    const { blocked: newBlocked } = initializeFloor(currentFloor);
    setBlocked(newBlocked);
  }

  function copyCoordinates(points: Position[]) {
    const coordsText = points.map(p => `(${p.x}, ${p.y})`).join(', ');
    navigator.clipboard.writeText(coordsText);
  }

  function randomizeAllBins() {
    // Randomize all bins in all floors, ensuring at least 4 CLUSTERS are DUE (≥80% average)
    const newFloors = { ...allFloorsBins };

    // Collect all clusters across all floors
    const allClusters: Array<{ floor: FloorType; clusterName: string; binIds: string[] }> = [];
    (['F1', 'F4', 'F5', 'F6'] as FloorType[]).forEach(floor => {
      newFloors[floor].clusters.forEach(cluster => {
        allClusters.push({
          floor,
          clusterName: cluster.name,
          binIds: cluster.bins
        });
      });
    });

    // Randomly select at least 4 clusters to be DUE
    const minDueClusters = 4;
    const maxDueClusters = Math.min(allClusters.length, 7); // Up to 7 clusters can be DUE
    const numDueClusters = Math.floor(Math.random() * (maxDueClusters - minDueClusters + 1)) + minDueClusters;

    // Shuffle and select clusters to be DUE
    const shuffled = [...allClusters].sort(() => Math.random() - 0.5);
    const dueClusters = new Set(shuffled.slice(0, numDueClusters).map(c => `${c.floor}-${c.clusterName}`));

    console.log(`Randomizing: ${numDueClusters} out of ${allClusters.length} clusters will be DUE`);

    // Randomize each floor
    (['F1', 'F4', 'F5', 'F6'] as FloorType[]).forEach(floor => {
      newFloors[floor] = {
        ...newFloors[floor],
        bins: newFloors[floor].bins.map(bin => {
          const clusterKey = `${floor}-${bin.cluster}`;
          const isDueCluster = dueClusters.has(clusterKey);

          let newFillLevel: number;
          if (isDueCluster) {
            // This cluster should be DUE - all bins should be 75-95% to ensure average ≥80%
            newFillLevel = Math.floor(Math.random() * 21) + 75; // 75-95
          } else {
            // This cluster should NOT be DUE - bins should be 20-70% to ensure average <80%
            newFillLevel = Math.floor(Math.random() * 51) + 20; // 20-70
          }

          const newColor = newFillLevel >= 80 ? '#CC0000' : newFillLevel >= 50 ? '#FFD000' : '#00AA00';
          return {
            ...bin,
            fillLevel: newFillLevel,
            color: newColor
          };
        })
      };
    });

    setAllFloorsBins(newFloors);

    // Update current floor's bins to reflect the changes immediately
    setBins(newFloors[currentFloor].bins);

    console.log(`Randomized: ${numDueClusters} DUE clusters out of ${allClusters.length} total clusters`);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-3 md:p-4 space-y-4">
        <div className="flex gap-2 md:gap-4 items-center flex-wrap">
          <div className="relative w-full sm:w-auto">
            <label className="block text-xs md:text-sm font-medium mb-1 text-gray-800">Floor:</label>
            <button
              onClick={() => setFloorDropdownOpen(!floorDropdownOpen)}
              className="w-full sm:w-auto px-3 py-2 border-2 border-blue-300 rounded-lg text-xs md:text-sm font-medium bg-white flex items-center justify-between hover:border-blue-500 text-gray-800 min-w-[160px] sm:min-w-[200px]"
            >
              <span className="truncate">
                {selectedFloors.length === 0
                  ? "Select Floors"
                  : selectedFloors.length === 1
                  ? selectedFloors[0] === 'F1' ? "LT1 - Koperasi & Kantin" :
                    selectedFloors[0] === 'F4' ? "LT4 - Barat & Timur" :
                    selectedFloors[0] === 'F5' ? "LT5 - Barat & Timur" : "LT6 - Barat & Timur"
                  : `${selectedFloors.length} Floors`}
              </span>
              <ChevronDown size={16} className="ml-2" />
            </button>
            {floorDropdownOpen && (
              <div className="absolute z-20 w-full mt-1 bg-white border-2 border-blue-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <div
                  onClick={() => {
                    const allFloors: FloorType[] = ['F1', 'F4', 'F5', 'F6'];
                    setSelectedFloors(allFloors);
                    setCurrentFloor('F1');
                  }}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm font-medium text-gray-800 border-b border-gray-200"
                >
                  <input
                    type="checkbox"
                    checked={selectedFloors.length === 4}
                    onChange={() => {}}
                    className="mr-2"
                  />
                  All Floors
                </div>
                {[
                  { value: 'F1', label: 'LT1 - Koperasi & Kantin' },
                  { value: 'F4', label: 'LT4 - Barat & Timur' },
                  { value: 'F5', label: 'LT5 - Barat & Timur' },
                  { value: 'F6', label: 'LT6 - Barat & Timur' }
                ].map((floor) => (
                  <div
                    key={floor.value}
                    onClick={() => {
                      setSelectedFloors(prev => {
                        const newSelection = prev.includes(floor.value as FloorType)
                          ? prev.filter(f => f !== floor.value)
                          : [...prev, floor.value as FloorType];

                        // Update currentFloor to the first selected floor
                        if (newSelection.length > 0) {
                          setCurrentFloor(newSelection[0]);
                        }
                        return newSelection;
                      });
                    }}
                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm font-medium text-gray-800"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFloors.includes(floor.value as FloorType)}
                      onChange={() => {}}
                      className="mr-2"
                    />
                    {floor.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-xs md:text-sm font-medium mb-1 text-gray-800">Strategy:</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as 'shortest' | 'patrol')}
              className="w-full sm:w-auto px-3 py-2 border-2 border-blue-300 rounded-lg text-xs md:text-sm font-medium bg-white hover:border-blue-500 text-gray-800"
            >
              <option value="shortest">Shortest (DUE only)</option>
              <option value="patrol">Full Patrol (All bins)</option>
            </select>
          </div>

          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            <button
              onClick={handleFindRoute}
              disabled={animating && !isPaused}
              className="bg-blue-500 text-white px-4 md:px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-xs md:text-sm"
            >
              Find Route
            </button>

            {animating && (
              <>
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="bg-yellow-500 text-white px-4 md:px-6 py-2 rounded-lg hover:bg-yellow-600 font-medium text-xs md:text-sm"
                >
                  {isPaused ? '▶ Continue' : '⏸ Stop'}
                </button>
                <button
                  onClick={() => {
                    setAnimating(false);
                    setIsPaused(false);
                    setCurrentFrame(0);
                    setPath([]);
                  }}
                  className="bg-red-500 text-white px-4 md:px-6 py-2 rounded-lg hover:bg-red-600 font-medium text-xs md:text-sm"
                >
                  🔄 Reset
                </button>
              </>
            )}
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-xs md:text-sm font-medium mb-1 text-gray-800">Speed:</label>
            <div className="flex gap-1">
              {([1, 2, 4, 8, 16] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 md:px-3 py-2 rounded-lg text-xs md:text-sm font-semibold ${
                    speed === s
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {path.length > 0 && (
            <div className="text-xs md:text-sm text-gray-600 w-full sm:w-auto">
              Path: {path.length} steps | Frame: {currentFrame + 1}
            </div>
          )}
        </div>

        <div className="flex gap-2 md:gap-3 text-xs md:text-sm flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 md:w-4 md:h-4 bg-green-600"></div>
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 md:w-4 md:h-4 bg-yellow-400"></div>
            <span>Med</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 md:w-4 md:h-4 bg-red-600"></div>
            <span>High (≥80%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 md:w-4 md:h-4 bg-purple-500 rounded-full"></div>
            <span>Service</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 md:w-5 md:h-5 bg-violet-600 border border-white flex items-center justify-center text-white text-xs font-bold">⇅</div>
            <span className="hidden sm:inline">Lift (0,3)</span>
            <span className="sm:hidden">Lift</span>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="bg-white rounded-lg shadow p-4">
        <div className="mb-3 text-center">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">
            {currentFloor === 'F1' ? 'Lantai 1' :
             currentFloor === 'F4' ? 'Lantai 4' :
             currentFloor === 'F5' ? 'Lantai 5' :
             'Lantai 6'}
            {animating && selectedFloors.length > 1 && (
              <span className="text-base md:text-lg text-purple-600 ml-2 md:ml-3">
                ({selectedFloors.indexOf(currentFloor) + 1}/{selectedFloors.length})
              </span>
            )}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <canvas
            ref={canvasRef}
            width={GRID_W * cellSize}
            height={GRID_H * cellSize}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="border border-gray-300 cursor-crosshair mx-auto"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-3 md:p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h3 className="font-semibold text-base md:text-lg">All Bins - All Floors:</h3>
          <button
            onClick={randomizeAllBins}
            className="bg-purple-500 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-purple-600 font-medium flex items-center gap-2 text-xs md:text-sm w-full sm:w-auto justify-center"
          >
            🎲 Randomize All
          </button>
        </div>

        {/* LT1 */}
        <div className="mb-6">
          <h4 className="font-semibold text-base md:text-lg mb-3 text-purple-700">LT1 - Koperasi & Kantin</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
            {allFloorsBins.F1.clusters.map(cluster => {
              const clusterBins = allFloorsBins.F1.bins.filter(b => cluster.bins.includes(b.id));
              const avgFill = clusterBins.reduce((sum, b) => sum + b.fillLevel, 0) / clusterBins.length;
              const isDue = avgFill >= THRESHOLD * 100;

              return (
                <div key={cluster.name} className="space-y-2">
                  <h5 className="text-sm font-medium">{cluster.name}</h5>
                  <div className={`text-xs p-2 rounded ${isDue ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    Avg: {avgFill.toFixed(1)}% {isDue && '(DUE)'}
                  </div>
                  {clusterBins.map(bin => (
                    <div key={bin.id} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: bin.color }}></div>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={bin.fillLevel}
                        onChange={(e) => {
                          const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                          setAllFloorsBins(prev => ({
                            ...prev,
                            F1: {
                              ...prev.F1,
                              bins: prev.F1.bins.map(b => b.id === bin.id ? { ...b, fillLevel: value } : b)
                            }
                          }));
                          // Update current view if this is the active floor
                          if (currentFloor === 'F1') {
                            setBins(prev => prev.map(b => b.id === bin.id ? { ...b, fillLevel: value } : b));
                          }
                        }}
                        className="border rounded px-2 py-1 w-16 text-sm"
                      />
                      <span className="text-xs">%</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* LT4 */}
        <div className="mb-6">
          <h4 className="font-semibold text-base md:text-lg mb-3 text-purple-700">LT4 - Barat & Timur</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
            {allFloorsBins.F4.clusters.map(cluster => {
              const clusterBins = allFloorsBins.F4.bins.filter(b => cluster.bins.includes(b.id));
              const avgFill = clusterBins.reduce((sum, b) => sum + b.fillLevel, 0) / clusterBins.length;
              const isDue = avgFill >= THRESHOLD * 100;

              return (
                <div key={cluster.name} className="space-y-2">
                  <h5 className="text-sm font-medium">{cluster.name}</h5>
                  <div className={`text-xs p-2 rounded ${isDue ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    Avg: {avgFill.toFixed(1)}% {isDue && '(DUE)'}
                  </div>
                  {clusterBins.map(bin => (
                    <div key={bin.id} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: bin.color }}></div>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={bin.fillLevel}
                        onChange={(e) => {
                          const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                          setAllFloorsBins(prev => ({
                            ...prev,
                            F4: {
                              ...prev.F4,
                              bins: prev.F4.bins.map(b => b.id === bin.id ? { ...b, fillLevel: value } : b)
                            }
                          }));
                          // Update current view if this is the active floor
                          if (currentFloor === 'F4') {
                            setBins(prev => prev.map(b => b.id === bin.id ? { ...b, fillLevel: value } : b));
                          }
                        }}
                        className="border rounded px-2 py-1 w-16 text-sm"
                      />
                      <span className="text-xs">%</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* LT5 */}
        <div className="mb-6">
          <h4 className="font-semibold text-base md:text-lg mb-3 text-purple-700">LT5 - Barat & Timur</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
            {allFloorsBins.F5.clusters.map(cluster => {
              const clusterBins = allFloorsBins.F5.bins.filter(b => cluster.bins.includes(b.id));
              const avgFill = clusterBins.reduce((sum, b) => sum + b.fillLevel, 0) / clusterBins.length;
              const isDue = avgFill >= THRESHOLD * 100;

              return (
                <div key={cluster.name} className="space-y-2">
                  <h5 className="text-sm font-medium">{cluster.name}</h5>
                  <div className={`text-xs p-2 rounded ${isDue ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    Avg: {avgFill.toFixed(1)}% {isDue && '(DUE)'}
                  </div>
                  {clusterBins.map(bin => (
                    <div key={bin.id} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: bin.color }}></div>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={bin.fillLevel}
                        onChange={(e) => {
                          const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                          setAllFloorsBins(prev => ({
                            ...prev,
                            F5: {
                              ...prev.F5,
                              bins: prev.F5.bins.map(b => b.id === bin.id ? { ...b, fillLevel: value } : b)
                            }
                          }));
                          // Update current view if this is the active floor
                          if (currentFloor === 'F5') {
                            setBins(prev => prev.map(b => b.id === bin.id ? { ...b, fillLevel: value } : b));
                          }
                        }}
                        className="border rounded px-2 py-1 w-16 text-sm"
                      />
                      <span className="text-xs">%</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* LT6 */}
        <div className="mb-6">
          <h4 className="font-semibold text-base md:text-lg mb-3 text-purple-700">LT6 - Barat & Timur</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
            {allFloorsBins.F6.clusters.map(cluster => {
              const clusterBins = allFloorsBins.F6.bins.filter(b => cluster.bins.includes(b.id));
              const avgFill = clusterBins.reduce((sum, b) => sum + b.fillLevel, 0) / clusterBins.length;
              const isDue = avgFill >= THRESHOLD * 100;

              return (
                <div key={cluster.name} className="space-y-2">
                  <h5 className="text-sm font-medium">{cluster.name}</h5>
                  <div className={`text-xs p-2 rounded ${isDue ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    Avg: {avgFill.toFixed(1)}% {isDue && '(DUE)'}
                  </div>
                  {clusterBins.map(bin => (
                    <div key={bin.id} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: bin.color }}></div>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={bin.fillLevel}
                        onChange={(e) => {
                          const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                          setAllFloorsBins(prev => ({
                            ...prev,
                            F6: {
                              ...prev.F6,
                              bins: prev.F6.bins.map(b => b.id === bin.id ? { ...b, fillLevel: value } : b)
                            }
                          }));
                          // Update current view if this is the active floor
                          if (currentFloor === 'F6') {
                            setBins(prev => prev.map(b => b.id === bin.id ? { ...b, fillLevel: value } : b));
                          }
                        }}
                        className="border rounded px-2 py-1 w-16 text-sm"
                      />
                      <span className="text-xs">%</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {(selectedPoints.length > 0 || customBlocked.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedPoints.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-blue-700">📍 Selected Points ({selectedPoints.length})</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyCoordinates(selectedPoints)}
                    className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
                  >
                    📋 Copy
                  </button>
                  <button
                    onClick={clearSelectedPoints}
                    className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto bg-gray-50 p-2 rounded text-sm font-mono">
                {selectedPoints.map((p, i) => (
                  <div key={i} className="py-1 border-b border-gray-200 last:border-0">
                    Point {i + 1}: ({p.x}, {p.y})
                  </div>
                ))}
              </div>
            </div>
          )}

          {customBlocked.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-red-700">🚫 Blocked Points ({customBlocked.length})</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyCoordinates(customBlocked)}
                    className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
                  >
                    📋 Copy
                  </button>
                  <button
                    onClick={clearCustomBlocked}
                    className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto bg-gray-50 p-2 rounded text-sm font-mono">
                {customBlocked.map((p, i) => (
                  <div key={i} className="py-1 border-b border-gray-200 last:border-0">
                    Block {i + 1}: ({p.x}, {p.y})
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
