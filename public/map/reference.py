 ============================================================
# SINGLE-SNAPSHOT (sekali waktu) + PEMBANDING PATHFINDER
# - Input: persentase per cluster (0..100)
# - Strategi:
#   * Shortest (NN): hanya cluster DUE (≥ threshold)
#   * Keliling Real: cek semua cluster (DUE=pause lama, non-DUE=cek singkat)
# - Pathfinder segmen: A* dan Dijkstra (GIF: NN+A*, Keliling+A*, NN+Dijkstra)
# - Bin berwarna (R/Y/G), % tampil di layout & GIF
# - GIF disimpan ke ./outputs/
# ============================================================

import os
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib import animation
from heapq import heappush, heappop

# ---------------- CONFIG LAYOUT ----------------
GRID_W, GRID_H = 35, 20
HEAD_Y_TOP, HEAD_Y_BOT = 7, 13

START_POS = (1, 19)      # start
END_POS   = (1, 19)      # end; pakai sama dgn START untuk round-trip; set None jika tidak kembali

SERVICE_PAUSE_SEC = 4    # durasi berhenti di titik service untuk DUE
QUICK_CHECK_SEC   = 1    # durasi berhenti singkat di titik non-DUE (keliling real)
FPS = 8

# Urutan zona untuk strategi keliling
ZONE_RANK = {"bottom_left":0,"bottom_center":1,"bottom_right":2,"kantin":3,"koperasi":4,"lain":5}

# ---------------- THRESHOLD & PERSENTASE (INPUT FIX) ----------------
THRESHOLD = 0.80
THRESHOLD_PCT = THRESHOLD * 100.0

# UBAH NILAI DI SINI (0..100):
PCT_BY_CLUSTER = {
    "top_left_row":     83.0,
    "top_right_col":    55.0,
    "bottom_left_col":  92.0,
    "bottom_mid_row":   48.0,
    "bottom_right_col": 88.0,
}

# ---------------- OBSTACLE GRID ----------------
blocked = np.zeros((GRID_W, GRID_H), dtype=bool)

def block_rect(x, y, w, h):
    for xx in range(x, x+w):
        for yy in range(y, y+h):
            if 0 <= xx < GRID_W and 0 <= yy < GRID_H:
                blocked[xx, yy] = True

def block_hline(x0, x1, y):
    a, b = sorted([x0, x1])
    for xx in range(a, b+1):
        if 0 <= xx < GRID_W and 0 <= y < GRID_H:
            blocked[xx, y] = True

def block_vline(x, y0, y1):
    a, b = sorted([y0, y1])
    for yy in range(a, b+1):
        if 0 <= x < GRID_W and 0 <= yy < GRID_H:
            blocked[x, yy] = True

# ---------------- GAMBAR + SEKALIGUS BLOKIR ----------------
def draw_grid(ax):
    for x in range(GRID_W + 1): ax.plot([x, x], [0, GRID_H], linewidth=0.5)
    for y in range(GRID_H + 1): ax.plot([0, GRID_W], [y, y], linewidth=0.5)

def line_wall(ax, x1, y1, x2, y2, lw=2, color="black"):
    ax.plot([x1, x2], [y1, y2], linewidth=lw, color=color)
    if y1 == y2: block_hline(x1, x2, y1)
    elif x1 == x2: block_vline(x1, y1, y2)
    else: raise ValueError("Hanya garis horizontal/vertikal yang didukung.")

def room_wall(ax, x, y, w, h, label="", lw=2):
    rect = patches.Rectangle((x, y), w, h, fill=False, linewidth=lw)
    ax.add_patch(rect)
    if label: ax.text(x + w/2, y + h/2, label, ha='center', va='center', fontsize=10)
    block_rect(x, y, w, h)

# ---------------- LAYOUT & RINTANGAN ----------------
fig, ax = plt.subplots(figsize=(12,6))
draw_grid(ax)

# Outline gedung & hammer corridor
line_wall(ax, 0, 0, GRID_W, 0); line_wall(ax, 0, GRID_H, GRID_W, GRID_H)
line_wall(ax, 0, 0, 0, GRID_H); line_wall(ax, GRID_W, 0, GRID_W, GRID_H)
line_wall(ax, 0, HEAD_Y_TOP, 16, HEAD_Y_TOP); line_wall(ax, 19, HEAD_Y_TOP, GRID_W, HEAD_Y_TOP)
line_wall(ax, 0, HEAD_Y_BOT, 16, HEAD_Y_BOT); line_wall(ax, 19, HEAD_Y_BOT, GRID_W, HEAD_Y_BOT)
line_wall(ax, 16, HEAD_Y_TOP, 16, HEAD_Y_BOT); line_wall(ax, 19, HEAD_Y_TOP, 19, HEAD_Y_BOT)

# Rooms
room_wall(ax, 2, 0, 7, 5, "Koperasi\ndekat toilet")
room_wall(ax, GRID_W-11, 0, 11, 6, "Kantin")
room_wall(ax, 13, 7, 3, 3, "Lift"); room_wall(ax, 13, 10, 3, 3, "Lift")
room_wall(ax, 19, 7, 3, 3, "Lift"); room_wall(ax, 19, 10, 3, 3, "Lift")

# ---------- BINS: posisi & warna (R/Y/G) ----------
BINS = [
    (2,5), (3,5), (4,5),                               # top_left_row: G, Y, R
    (GRID_W-12,3), (GRID_W-12,4), (GRID_W-12,5),       # top_right_col: R, Y, G
    (1,15), (1,16), (1,17),                            # bottom_left_col: R, Y, G
    (16,19), (17,19), (18,19),                         # bottom_mid_row: G, Y, R
    (GRID_W-2,15), (GRID_W-2,16), (GRID_W-2,17)        # bottom_right_col: R, Y, G
]
BIN_COLOR = {}
BIN_COLOR[(2,5)] = "#00AA00"; BIN_COLOR[(3,5)] = "#FFD000"; BIN_COLOR[(4,5)] = "#CC0000"
BIN_COLOR[(GRID_W-12,3)] = "#CC0000"; BIN_COLOR[(GRID_W-12,4)] = "#FFD000"; BIN_COLOR[(GRID_W-12,5)] = "#00AA00"
BIN_COLOR[(1,15)] = "#CC0000"; BIN_COLOR[(1,16)] = "#FFD000"; BIN_COLOR[(1,17)] = "#00AA00"
BIN_COLOR[(16,19)] = "#00AA00"; BIN_COLOR[(17,19)] = "#FFD000"; BIN_COLOR[(18,19)] = "#CC0000"
BIN_COLOR[(GRID_W-2,15)] = "#CC0000"; BIN_COLOR[(GRID_W-2,16)] = "#FFD000"; BIN_COLOR[(GRID_W-2,17)] = "#00AA00"

for (bx,by) in BINS:
    face = BIN_COLOR.get((bx,by), "#FFFFFF")
    rect = patches.Rectangle((bx, by), 1, 1, facecolor=face, edgecolor='black')
    ax.add_patch(rect)
    blocked[bx, by] = True

# Service point per cluster
CLUSTERS = [
    {"name":"top_left_row",    "bins":[(2,5),(3,5),(4,5)],                         "service":(3,6),         "zone":"koperasi"},
    {"name":"top_right_col",   "bins":[(GRID_W-12,3),(GRID_W-12,4),(GRID_W-12,5)], "service":(GRID_W-13,4), "zone":"kantin"},
    {"name":"bottom_left_col", "bins":[(1,15),(1,16),(1,17)],                      "service":(2,16),        "zone":"bottom_left"},
    {"name":"bottom_mid_row",  "bins":[(16,19),(17,19),(18,19)],                   "service":(17,18),       "zone":"bottom_center"},
    {"name":"bottom_right_col","bins":[(GRID_W-2,15),(GRID_W-2,16),(GRID_W-2,17)], "service":(GRID_W-3,16), "zone":"bottom_right"},
]
for c in CLUSTERS:
    sx, sy = c["service"]
    blocked[sx, sy] = False
    ax.plot(sx+0.5, sy+0.5, marker="s", markersize=6)

# Start & End
blocked[START_POS[0], START_POS[1]] = False
if END_POS is not None: blocked[END_POS[0], END_POS[1]] = False

ax.scatter(START_POS[0]+0.5, START_POS[1]+0.5, s=60, marker="o", label="Start")
ax.set_xlim(0, GRID_W); ax.set_ylim(GRID_H, 0); ax.set_xticks([]); ax.set_yticks([])
ax.set_title("Simulasi Pengambilan Sampah")
plt.show()

# ---------------- PATHFINDING (A* & Dijkstra) ----------------
def astar(start, goal):
    """A* di grid 4-arah, biaya 1, patuh obstacle 'blocked'."""
    if start == goal: return [start]
    def h(p): return abs(p[0]-goal[0]) + abs(p[1]-goal[1])
    openh = []; heappush(openh, (h(start), 0, start, None))
    came = {}; gscore = {start:0}; visited = set()
    while openh:
        f, g, cur, parent = heappop(openh)
        if cur in visited: continue
        visited.add(cur); came[cur] = parent
        if cur == goal:
            path = []; p = cur
            while p is not None: path.append(p); p = came[p]
            return path[::-1]
        x,y = cur
        for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]:
            nx,ny = x+dx, y+dy
            if not (0 <= nx < GRID_W and 0 <= ny < GRID_H): continue
            if blocked[nx,ny]: continue
            ng = g + 1
            if (nx,ny) not in gscore or ng < gscore[(nx,ny)]:
                gscore[(nx,ny)] = ng
                heappush(openh, (ng + h((nx,ny)), ng, (nx,ny), cur))
    return []  # no path

def dijkstra(start, goal):
    """Dijkstra 4-arah di grid biaya 1, patuh obstacle 'blocked'."""
    if start == goal: return [start]
    import math
    dist = {start: 0}
    prev = {}
    visited = set()
    pq = []
    heappush(pq, (0, start))
    while pq:
        d, cur = heappop(pq)
        if cur in visited:
            continue
        visited.add(cur)
        if cur == goal:
            path = []
            p = cur
            while p in prev or p == start:
                path.append(p)
                if p == start: break
                p = prev[p]
            return path[::-1]
        x, y = cur
        for dx, dy in [(1,0),(-1,0),(0,1),(0,-1)]:
            nx, ny = x+dx, y+dy
            if not (0 <= nx < GRID_W and 0 <= ny < GRID_H):
                continue
            if blocked[nx, ny]:
                continue
            nd = d + 1
            if nd < dist.get((nx,ny), math.inf):
                dist[(nx,ny)] = nd
                prev[(nx,ny)] = cur
                heappush(pq, (nd, (nx,ny)))
    return []  # no path

# ---------------- PERSENTASE & DUE ----------------
PCT_FILL = {c["name"]: float(PCT_BY_CLUSTER.get(c["name"], 0.0)) for c in CLUSTERS}

def pct_color(p):
    if p >= THRESHOLD_PCT: return "red"
    elif p >= THRESHOLD_PCT*0.8: return "orange"
    else: return "green"

DUE_POINTS = [tuple(c["service"]) for c in CLUSTERS if PCT_FILL[c["name"]] >= THRESHOLD_PCT]
service_points = [tuple(c["service"]) for c in CLUSTERS]
sp2zone = {tuple(c["service"]): c["zone"] for c in CLUSTERS}
sp2name = {tuple(c["service"]): c["name"] for c in CLUSTERS}

# ---------------- RUTE ----------------
def build_route_nn(start):
    remaining = DUE_POINTS.copy()
    cur = start; route = [cur]
    while remaining:
        nxt = min(remaining, key=lambda p: abs(p[0]-cur[0]) + abs(p[1]-cur[1]))
        route.append(nxt)
        remaining.remove(nxt); cur = nxt
    if END_POS is not None: route.append(END_POS)
    return route

def build_route_patrol_real(start):
    ordered = sorted(service_points,
                     key=lambda p: (ZONE_RANK.get(sp2zone.get(tuple(p),"lain"),5), p[1], p[0]))
    route = [start] + ordered
    if END_POS is not None: route.append(END_POS)
    return route

route_nn = build_route_nn(START_POS)
route_patrol_real = build_route_patrol_real(START_POS)

# ---------------- PATH (FRAME) BUILDER ----------------
def build_path(route, mode="nn", pathfinder="astar"):
    """
    mode:
      - 'nn'      : pause hanya di DUE
      - 'patrol'  : semua berhenti, DUE=SERVICE_PAUSE_SEC, non-DUE=QUICK_CHECK_SEC
    pathfinder:
      - 'astar' atau 'dijkstra'
    """
    frames = []
    if len(route) < 2:
        return frames
    pf = astar if pathfinder == "astar" else dijkstra
    for a, b in zip(route[:-1], route[1:]):
        seg = pf(a, b)
        if len(seg) <= 1:
            continue
        frames += seg[1:]  # hindari duplikasi node awal
        if END_POS is None or b != END_POS:
            if mode == "nn":
                if b in DUE_POINTS:
                    frames += [b] * max(1, int(SERVICE_PAUSE_SEC * FPS))
            elif mode == "patrol":
                is_due = b in DUE_POINTS
                dur = SERVICE_PAUSE_SEC if is_due else QUICK_CHECK_SEC
                frames += [b] * max(1, int(dur * FPS))
    return frames

# PATHS
path_nn_astar        = build_path(route_nn, mode="nn",     pathfinder="astar")
path_patrol_astar    = build_path(route_patrol_real, mode="patrol", pathfinder="astar")
path_nn_dijkstra     = build_path(route_nn, mode="nn",     pathfinder="dijkstra")

# ---------------- STATIC LAYER (persen + bins) ----------------
def draw_static(ax, pct_fill):
    draw_grid(ax)
    # outline & hammer
    ax.plot([0, GRID_W], [0, 0], lw=2); ax.plot([0, GRID_W], [GRID_H, GRID_H], lw=2)
    ax.plot([0, 0], [0, GRID_H], lw=2); ax.plot([GRID_W, GRID_W], [0, GRID_H], lw=2)
    ax.plot([0, 16], [HEAD_Y_TOP, HEAD_Y_TOP], lw=2); ax.plot([19, GRID_W], [HEAD_Y_TOP, HEAD_Y_TOP], lw=2)
    ax.plot([0, 16], [HEAD_Y_BOT, HEAD_Y_BOT], lw=2); ax.plot([19, GRID_W], [HEAD_Y_BOT, HEAD_Y_BOT], lw=2)
    ax.plot([16, 16], [HEAD_Y_TOP, HEAD_Y_BOT], lw=2); ax.plot([19, 19], [HEAD_Y_TOP, HEAD_Y_BOT], lw=2)
    # rooms
    for (x,y,w,h,label) in [(2,0,7,5,"Koperasi\ndekat toilet"),
                            (GRID_W-11,0,11,6,"Kantin"),
                            (13,7,3,3,"Lift"), (13,10,3,3,"Lift"),
                            (19,7,3,3,"Lift"), (19,10,3,3,"Lift")]:
        rect = patches.Rectangle((x,y), w,h, fill=False, linewidth=2)
        ax.add_patch(rect); ax.text(x+w/2, y+h/2, label, ha='center', va='center', fontsize=10)
    # bins (colored)
    for (bx,by) in BINS:
        face = BIN_COLOR.get((bx,by), "#FFFFFF")
        ax.add_patch(patches.Rectangle((bx,by),1,1,facecolor=face,edgecolor='black'))
    # service point + label %
    due_set = set(DUE_POINTS)
    for c in CLUSTERS:
        sx, sy = c["service"]
        mk = "s" if (sx,sy) in due_set else "x"
        ms = 9 if (sx,sy) in due_set else 6
        ax.plot(sx+0.5, sy+0.5, marker=mk, markersize=ms)
        p = PCT_FILL.get(c["name"], 0.0)
        ax.text(sx+0.5, sy-0.35, f"{p:.0f}%", ha="center", va="center",
                fontsize=9,
                color=("red" if p>=THRESHOLD_PCT else ("orange" if p>=THRESHOLD_PCT*0.8 else "green")),
                fontweight="bold")
    # start
    ax.plot(START_POS[0]+0.5, START_POS[1]+0.5, marker="o", markersize=7)
    # legenda singkat
    ax.text(1, GRID_H-0.8,
            f"Threshold {int(THRESHOLD_PCT)}% | merah: ≥thr | oranye: ~thr | hijau: aman | 's': due | 'x': tidak due | cek singkat={QUICK_CHECK_SEC}s",
            fontsize=9)

# ---------------- ANIMASI ----------------
def animate(path, filename, title):
    if not path:
        print(f"Skip anim '{filename}': path kosong (tidak ada perpindahan).")
        return
    fig, ax = plt.subplots(figsize=(12,6))
    draw_static(ax, PCT_FILL)
    agent, = ax.plot([], [], marker="o", markersize=8)
    ax.set_xlim(0, GRID_W); ax.set_ylim(GRID_H, 0); ax.set_xticks([]); ax.set_yticks([])
    ax.set_title(title)

    def init():
        agent.set_data([START_POS[0]+0.5],[START_POS[1]+0.5])
        return (agent,)

    def update(i):
        x,y = path[i]
        agent.set_data([x+0.5],[y+0.5])
        return (agent,)

    anim = animation.FuncAnimation(fig, update, init_func=init,
                                   frames=len(path), interval=1000//FPS, blit=True)
    from matplotlib.animation import PillowWriter
    os.makedirs("outputs", exist_ok=True)
    anim.save(f"outputs/{filename}", writer=PillowWriter(fps=FPS))
    plt.close(fig)

# Buat GIF
animate(path_nn_astar,       "route_shortest_due_astar.gif",    "Shortest (NN) — A*")
animate(path_patrol_astar,   "route_keliling_real_astar.gif",   "Keliling Real — A* (DUE=lama, non-DUE=cepat)")
animate(path_nn_dijkstra,    "route_shortest_due_dijkstra.gif", "Shortest (NN) — Dijkstra")

print("GIF tersimpan di ./outputs/:")
print("- outputs/route_shortest_due_astar.gif")
print("- outputs/route_keliling_real_astar.gif")
print("- outputs/route_shortest_due_dijkstra.gif")