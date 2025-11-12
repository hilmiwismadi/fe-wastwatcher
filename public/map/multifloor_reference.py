# ============================================================
# MULTI-FLOOR SNAPSHOT (L1 → L4 → L5 → L6)
# - Input: persentase per cluster PER LANTAI
# - Strategi:
#   * Shortest (NN): hanya cluster DUE (≥ threshold)
#   * Keliling Real: cek semua (DUE=pause lama, non-DUE=cek singkat)
# - Floor handoff: L1 finish di TRANSFER_POS (tengah-atas), L4/L5/L6 start & end di TRANSFER_POS
# - Pathfinding: A* (grid 4-arah, biaya 1, hormat obstacle)
# - GIF: 1 file per lantai per strategi (disimpan ke ./outputs/)
# ============================================================

import os
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib import animation
from heapq import heappush, heappop

# ---------------- PARAM UMUM ----------------
GRID_W, GRID_H = 35, 20
HEAD_Y_TOP, HEAD_Y_BOT = 7, 13

SERVICE_PAUSE_SEC = 4     # berhenti di titik DUE
QUICK_CHECK_SEC   = 1     # cek singkat titik non-DUE (keliling real)
FPS = 8

THRESHOLD = 0.80
THRESHOLD_PCT = THRESHOLD * 100.0

# Urutan zona utk keliling
ZONE_RANK = {"bottom_left":0,"bottom_center":1,"bottom_right":2,"kantin":3,"koperasi":4,"lain":5}

# Titik transfer antarlantai (tengah-atas koridor)
TRANSFER_POS = (GRID_W//2, 1)  # boleh digeser sesuai layout

# ---------------- HELPER GRID & GAMBAR ----------------
def draw_grid(ax):
    for x in range(GRID_W + 1): ax.plot([x, x], [0, GRID_H], linewidth=0.5, color="#999")
    for y in range(GRID_H + 1): ax.plot([0, GRID_W], [y, y], linewidth=0.5, color="#999")

def block_rect(blocked, x, y, w, h):
    for xx in range(x, x+w):
        for yy in range(y, y+h):
            if 0 <= xx < GRID_W and 0 <= yy < GRID_H:
                blocked[xx, yy] = True

def block_hline(blocked, x0, x1, y):
    a, b = sorted([x0, x1])
    for xx in range(a, b+1):
        if 0 <= xx < GRID_W and 0 <= y < GRID_H:
            blocked[xx, y] = True

def block_vline(blocked, x, y0, y1):
    a, b = sorted([y0, y1])
    for yy in range(a, b+1):
        if 0 <= x < GRID_W and 0 <= yy < GRID_H:
            blocked[x, yy] = True

def line_wall(ax, blocked, x1, y1, x2, y2, lw=2):
    ax.plot([x1, x2], [y1, y2], linewidth=lw, color="black")
    if y1 == y2: block_hline(blocked, x1, x2, y1)
    elif x1 == x2: block_vline(blocked, x1, y1, y2)

def room_wall(ax, blocked, x, y, w, h, label="", lw=2):
    rect = patches.Rectangle((x, y), w, h, fill=False, linewidth=lw)
    ax.add_patch(rect)
    if label: ax.text(x + w/2, y + h/2, label, ha='center', va='center', fontsize=10)
    block_rect(blocked, x, y, w, h)

def draw_layout_floor1():
    """Return (blocked, CLUSTERS, BINS_COLORS, START_POS, END_POS) utk Lantai 1."""
    blocked = np.zeros((GRID_W, GRID_H), dtype=bool)
    fig, ax = plt.subplots(figsize=(12,6)); draw_grid(ax)
    # outline & hammer
    line_wall(ax, blocked, 0, 0, GRID_W, 0); line_wall(ax, blocked, 0, GRID_H, GRID_W, GRID_H)
    line_wall(ax, blocked, 0, 0, 0, GRID_H); line_wall(ax, blocked, GRID_W, 0, GRID_W, GRID_H)
    line_wall(ax, blocked, 0, HEAD_Y_TOP, 16, HEAD_Y_TOP); line_wall(ax, blocked, 19, HEAD_Y_TOP, GRID_W, HEAD_Y_TOP)
    line_wall(ax, blocked, 0, HEAD_Y_BOT, 16, HEAD_Y_BOT); line_wall(ax, blocked, 19, HEAD_Y_BOT, GRID_W, HEAD_Y_BOT)
    line_wall(ax, blocked, 16, HEAD_Y_TOP, 16, HEAD_Y_BOT); line_wall(ax, blocked, 19, HEAD_Y_TOP, 19, HEAD_Y_BOT)
    # rooms
    room_wall(ax, blocked, 2, 0, 7, 5, "Koperasi\ndekat toilet")
    room_wall(ax, blocked, GRID_W-11, 0, 11, 6, "Kantin")
    room_wall(ax, blocked, 13, 7, 3, 3, "Lift"); room_wall(ax, blocked, 13, 10, 3, 3, "Lift")
    room_wall(ax, blocked, 19, 7, 3, 3, "Lift"); room_wall(ax, blocked, 19, 10, 3, 3, "Lift")
    # bins
    bins = [(2,5),(3,5),(4,5),
            (GRID_W-12,3),(GRID_W-12,4),(GRID_W-12,5),
            (1,15),(1,16),(1,17),
            (16,19),(17,19),(18,19),
            (GRID_W-2,15),(GRID_W-2,16),(GRID_W-2,17)]
    color = {}
    color[(2,5)]="#00AA00"; color[(3,5)]="#FFD000"; color[(4,5)]="#CC0000"
    color[(GRID_W-12,3)]="#CC0000"; color[(GRID_W-12,4)]="#FFD000"; color[(GRID_W-12,5)]="#00AA00"
    color[(1,15)]="#CC0000"; color[(1,16)]="#FFD000"; color[(1,17)]="#00AA00"
    color[(16,19)]="#00AA00"; color[(17,19)]="#FFD000"; color[(18,19)]="#CC0000"
    color[(GRID_W-2,15)]="#CC0000"; color[(GRID_W-2,16)]="#FFD000"; color[(GRID_W-2,17)]="#00AA00"
    for (bx,by) in bins:
        ax.add_patch(patches.Rectangle((bx,by),1,1,facecolor=color[(bx,by)],edgecolor='black'))
        blocked[bx,by]=True
    # clusters
    CLUSTERS = [
        {"name":"top_left_row",    "bins":[(2,5),(3,5),(4,5)],                         "service":(3,6),          "zone":"koperasi"},
        {"name":"top_right_col",   "bins":[(GRID_W-12,3),(GRID_W-12,4),(GRID_W-12,5)], "service":(GRID_W-13,4),  "zone":"kantin"},
        {"name":"bottom_left_col", "bins":[(1,15),(1,16),(1,17)],                      "service":(2,16),         "zone":"bottom_left"},
        {"name":"bottom_mid_row",  "bins":[(16,19),(17,19),(18,19)],                   "service":(17,18),        "zone":"bottom_center"},
        {"name":"bottom_right_col","bins":[(GRID_W-2,15),(GRID_W-2,16),(GRID_W-2,17)], "service":(GRID_W-3,16),  "zone":"bottom_right"},
    ]
    for c in CLUSTERS:
        sx,sy=c["service"]; blocked[sx,sy]=False; ax.plot(sx+0.5,sy+0.5,marker="s",markersize=6)
    START_POS=(1,19); END_POS=TRANSFER_POS  # lantai1 finish di transfer
    blocked[START_POS[0],START_POS[1]]=False; blocked[END_POS[0],END_POS[1]]=False
    ax.scatter(START_POS[0]+0.5,START_POS[1]+0.5,s=60,marker="o")
    ax.set_xlim(0,GRID_W); ax.set_ylim(GRID_H,0); ax.set_xticks([]); ax.set_yticks([])
    ax.set_title("Lantai 1"); plt.show()
    return blocked, CLUSTERS, color, START_POS, END_POS

def draw_layout_floor456(title="Lantai 4/5/6"):
    """Return (blocked, CLUSTERS, BINS_COLORS, START_POS, END_POS) utk L4/5/6."""
    blocked = np.zeros((GRID_W, GRID_H), dtype=bool)
    fig, ax = plt.subplots(figsize=(12,6)); draw_grid(ax)
    # outline & poros vertikal
    # rooms (4 kelas + 4 lift)
    for r in [
        (13,11,3,3,"Lift"),(13,14,3,3,"Lift"),
        (19,11,3,3,"Lift"),(19,14,3,3,"Lift"),
        (19,0,12,6,"Kelas"),(4,0,12,6,"Kelas"),
        (22,9,9,11,"Kelas"),(4,9,9,11,"Kelas")
    ]: room_wall(ax, blocked, *r[:4], r[4])
    # bins kiri & kanan
    bins=[(0,3),(0,4),(0,5),(GRID_W-1,9),(GRID_W-1,10),(GRID_W-1,11)]
    color={ (0,3):"#CC0000",(0,4):"#FFD000",(0,5):"#00AA00",
            (GRID_W-1,9):"#00AA00",(GRID_W-1,10):"#FFD000",(GRID_W-1,11):"#CC0000"}
    for (bx,by) in bins:
        ax.add_patch(patches.Rectangle((bx,by),1,1,facecolor=color[(bx,by)],edgecolor='black'))
        blocked[bx,by]=True
    # clusters (dua stack kiri/kanan)
    CLUSTERS=[
        {"name":"left_stack","bins":[(0,3),(0,4),(0,5)],"service":(1,4),"zone":"lain"},
        {"name":"right_stack","bins":[(GRID_W-1,9),(GRID_W-1,10),(GRID_W-1,11)],"service":(GRID_W-2,10),"zone":"lain"},
    ]
    for c in CLUSTERS:
        sx,sy=c["service"]; blocked[sx,sy]=False; ax.plot(sx+0.5,sy+0.5,marker="s",markersize=6)
    START_POS=TRANSFER_POS; END_POS=TRANSFER_POS  # start & end di transfer
    blocked[START_POS[0],START_POS[1]]=False
    ax.scatter(START_POS[0]+0.5,START_POS[1]+0.5,s=60,marker="o")
    ax.set_xlim(0,GRID_W); ax.set_ylim(GRID_H,0); ax.set_xticks([]); ax.set_yticks([])
    ax.set_title(title); plt.show()
    return blocked, CLUSTERS, color, START_POS, END_POS

# ---------------- PATHFINDING (A*) ----------------
def astar(blocked, start, goal):
    if start == goal: return [start]
    def h(p): return abs(p[0]-goal[0])+abs(p[1]-goal[1])
    openh=[]; heappush(openh,(h(start),0,start,None))
    came={}; gscore={start:0}; visited=set()
    while openh:
        f,g,cur,parent=heappop(openh)
        if cur in visited: continue
        visited.add(cur); came[cur]=parent
        if cur==goal:
            path=[]; p=cur
            while p is not None: path.append(p); p=came[p]
            return path[::-1]
        x,y=cur
        for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]:
            nx,ny=x+dx,y+dy
            if not (0<=nx<GRID_W and 0<=ny<GRID_H): continue
            if blocked[nx,ny]: continue
            ng=g+1
            if (nx,ny) not in gscore or ng<gscore[(nx,ny)]:
                gscore[(nx,ny)]=ng
                heappush(openh,(ng+h((nx,ny)),ng,(nx,ny),cur))
    return []

# ---------------- STRATEGI & BUILD PATH ----------------
def build_routes(CLUSTERS, threshold_pct, start_pos, end_pos, mode, blocked):
    """mode: 'nn' (hanya due) | 'patrol' (cek semua)"""
    service_points=[tuple(c["service"]) for c in CLUSTERS]
    sp2zone={tuple(c["service"]):c["zone"] for c in CLUSTERS}
    sp2name={tuple(c["service"]):c["name"] for c in CLUSTERS}

    # Persentase: ambil dari atribut c['pct'] yang sudah ditambahkan di luar
    due_pts=[tuple(c["service"]) for c in CLUSTERS if c["pct"]>=threshold_pct]

    if mode=="nn":
        remaining=due_pts.copy()
        cur=start_pos; route=[cur]
        while remaining:
            nxt=min(remaining,key=lambda p: abs(p[0]-cur[0])+abs(p[1]-cur[1]))
            route.append(nxt); remaining.remove(nxt); cur=nxt
        if end_pos is not None: route.append(end_pos)
    else:  # patrol real
        ordered=sorted(service_points,key=lambda p:(ZONE_RANK.get(sp2zone.get(p,"lain"),5),p[1],p[0]))
        route=[start_pos]+ordered
        if end_pos is not None: route.append(end_pos)
    return route, due_pts, sp2name

def build_frames(blocked, route, CLUSTERS, mode):
    frames=[]
    if len(route)<2: return frames
    due_set={tuple(c["service"]) for c in CLUSTERS if c["pct"]>=THRESHOLD_PCT}
    for a,b in zip(route[:-1], route[1:]):
        seg=astar(blocked,a,b)
        if len(seg)<=1: continue
        frames+=seg[1:]
        if b in due_set:
            frames+=[b]*max(1,int(SERVICE_PAUSE_SEC*FPS))
        elif mode=="patrol":
            frames+=[b]*max(1,int(QUICK_CHECK_SEC*FPS))
    return frames

# ---------------- STATIC DRAWER (show % & bins) ----------------
def draw_static(ax, blocked, CLUSTERS, bins_color, title):
    draw_grid(ax)
    # outline (garis blocked ditarik ulang ringan)
    for x in [0, GRID_W]: ax.plot([x,x],[0,GRID_H],lw=2,color="black")
    for y in [0, GRID_H]: ax.plot([0,GRID_W],[y,y],lw=2,color="black")
    # room outline kira2 (opsional: cukup tampil % & bins)
    for c in CLUSTERS:
        sx,sy=c["service"]
        mk="s" if c["pct"]>=THRESHOLD_PCT else "x"
        ms=9 if mk=="s" else 6
        ax.plot(sx+0.5,sy+0.5,marker=mk,markersize=ms)
        ax.text(sx+0.5,sy-0.35,f"{c['pct']:.0f}%",ha="center",va="center",
                fontsize=9,color=("red" if c["pct"]>=THRESHOLD_PCT else ("orange" if c["pct"]>=THRESHOLD_PCT*0.8 else "green")),
                fontweight="bold")
    # bins
    for (bx,by),col in bins_color.items():
        ax.add_patch(patches.Rectangle((bx,by),1,1,facecolor=col,edgecolor='black'))

    ax.plot(TRANSFER_POS[0]+0.5,TRANSFER_POS[1]+0.5,marker="^",markersize=8,color="tab:purple")
    ax.set_xlim(0,GRID_W); ax.set_ylim(GRID_H,0); ax.set_xticks([]); ax.set_yticks([])
    ax.set_title(title)
    ax.text(1, GRID_H-0.8, f"Threshold {int(THRESHOLD_PCT)}% | 's' due, 'x' non-due | cek singkat={QUICK_CHECK_SEC}s", fontsize=9)

def animate(frames, blocked, CLUSTERS, bins_color, start_pos, title, filename):
    if not frames:
        print(f"Skip GIF '{filename}' (tidak ada pergerakan).")
        return
    fig, ax = plt.subplots(figsize=(12,6))
    draw_static(ax, blocked, CLUSTERS, bins_color, title)
    agent, = ax.plot([], [], marker="o", markersize=8)
    def init(): agent.set_data([start_pos[0]+0.5],[start_pos[1]+0.5]); return (agent,)
    def update(i): x,y=frames[i]; agent.set_data([x+0.5],[y+0.5]); return (agent,)
    anim=animation.FuncAnimation(fig, update, init_func=init, frames=len(frames), interval=1000//FPS, blit=True)
    from matplotlib.animation import PillowWriter
    os.makedirs("outputs", exist_ok=True)
    anim.save(f"outputs/{filename}", writer=PillowWriter(fps=FPS))
    plt.close(fig)

# ---------------- INPUT PERSENTASE PER LANTAI ----------------
# Edit angka 0..100 sesuai kondisi snapshot
PCT_BY_CLUSTER_F1 = {
    "top_left_row":     83.0,
    "top_right_col":    55.0,
    "bottom_left_col":  92.0,
    "bottom_mid_row":   48.0,
    "bottom_right_col": 88.0,
}
PCT_BY_CLUSTER_F4 = {
    "left_stack":  70.0,
    "right_stack": 90.0,
}
PCT_BY_CLUSTER_F5 = {
    "left_stack":  40.0,
    "right_stack": 85.0,
}
PCT_BY_CLUSTER_F6 = {
    "left_stack":  95.0,
    "right_stack": 55.0,
}

# ---------------- RUN: LANTAI 1 ----------------
blk1, clusters1, bins1, start1, end1 = draw_layout_floor1()
# tanam % ke objek cluster
for c in clusters1: c["pct"] = float(PCT_BY_CLUSTER_F1.get(c["name"], 0.0))

route1_nn, due1, _ = build_routes(clusters1, THRESHOLD_PCT, start1, end1, mode="nn", blocked=blk1)
route1_pat, _, _   = build_routes(clusters1, THRESHOLD_PCT, start1, end1, mode="patrol", blocked=blk1)

frames1_nn  = build_frames(blk1, route1_nn, clusters1, mode="nn")
frames1_pat = build_frames(blk1, route1_pat, clusters1, mode="patrol")

animate(frames1_nn,  blk1, clusters1, bins1, start1, "Lantai 1 — Shortest (NN)",   "F1_shortest.gif")
animate(frames1_pat, blk1, clusters1, bins1, start1, "Lantai 1 — Keliling Real",   "F1_keliling.gif")

# ---------------- RUN: LANTAI 4 ----------------
blk4, clusters4, bins4, start4, end4 = draw_layout_floor456("Lantai 4")
for c in clusters4: c["pct"] = float(PCT_BY_CLUSTER_F4.get(c["name"], 0.0))
route4_nn, due4, _ = build_routes(clusters4, THRESHOLD_PCT, start4, end4, mode="nn", blocked=blk4)
route4_pat,_,_     = build_routes(clusters4, THRESHOLD_PCT, start4, end4, mode="patrol", blocked=blk4)
frames4_nn  = build_frames(blk4, route4_nn, clusters4, mode="nn")
frames4_pat = build_frames(blk4, route4_pat, clusters4, mode="patrol")
animate(frames4_nn,  blk4, clusters4, bins4, start4, "Lantai 4 — Shortest (NN)",   "F4_shortest.gif")
animate(frames4_pat, blk4, clusters4, bins4, start4, "Lantai 4 — Keliling Real",   "F4_keliling.gif")

# ---------------- RUN: LANTAI 5 ----------------
blk5, clusters5, bins5, start5, end5 = draw_layout_floor456("Lantai 5")
for c in clusters5: c["pct"] = float(PCT_BY_CLUSTER_F5.get(c["name"], 0.0))
route5_nn, due5, _ = build_routes(clusters5, THRESHOLD_PCT, start5, end5, mode="nn", blocked=blk5)
route5_pat,_,_     = build_routes(clusters5, THRESHOLD_PCT, start5, end5, mode="patrol", blocked=blk5)
frames5_nn  = build_frames(blk5, route5_nn, clusters5, mode="nn")
frames5_pat = build_frames(blk5, route5_pat, clusters5, mode="patrol")
animate(frames5_nn,  blk5, clusters5, bins5, start5, "Lantai 5 — Shortest (NN)",   "F5_shortest.gif")
animate(frames5_pat, blk5, clusters5, bins5, start5, "Lantai 5 — Keliling Real",   "F5_keliling.gif")

# ---------------- RUN: LANTAI 6 ----------------
blk6, clusters6, bins6, start6, end6 = draw_layout_floor456("Lantai 6")
for c in clusters6: c["pct"] = float(PCT_BY_CLUSTER_F6.get(c["name"], 0.0))
route6_nn, due6, _ = build_routes(clusters6, THRESHOLD_PCT, start6, end6, mode="nn", blocked=blk6)
route6_pat,_,_     = build_routes(clusters6, THRESHOLD_PCT, start6, end6, mode="patrol", blocked=blk6)
frames6_nn  = build_frames(blk6, route6_nn, clusters6, mode="nn")
frames6_pat = build_frames(blk6, route6_pat, clusters6, mode="patrol")
animate(frames6_nn,  blk6, clusters6, bins6, start6, "Lantai 6 — Shortest (NN)",   "F6_shortest.gif")
animate(frames6_pat, blk6, clusters6, bins6, start6, "Lantai 6 — Keliling Real",   "F6_keliling.gif")

print("GIF tersimpan di ./outputs/:")
print("- F1_shortest.gif, F1_keliling.gif")
print("- F4_shortest.gif, F4_keliling.gif")
print("- F5_shortest.gif, F5_keliling.gif")
print("- F6_shortest.gif, F6_keliling.gif")
