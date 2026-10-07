import math
import subprocess
import os

width = 1920
height = 1080
fps = 30
duration = 8  # 8 seconds loop
total_frames = fps * duration

output_dir = "public/videos"
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, "sample-trio.mp4")

print(f"Generating {output_path} ({width}x{height}, {fps} fps, {duration}s)...")

# Launch ffmpeg process reading raw RGBA from pipe
ffmpeg_cmd = [
    "/opt/homebrew/bin/ffmpeg",
    "-y",
    "-f", "rawvideo",
    "-pix_fmt", "rgba",
    "-s", f"{width}x{height}",
    "-r", str(fps),
    "-i", "-",  # Video from stdin
    "-f", "lavfi",
    "-i", "anoisesrc=d=8:c=pink:r=44100:a=0.03,lowpass=f=200", # Soft spooky rumble
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-preset", "veryfast",
    "-c:a", "aac",
    "-shortest",
    output_path
]

proc = subprocess.Popen(ffmpeg_cmd, stdin=subprocess.PIPE)

# Precompute pumpkin face centers
left_cx, left_cy = 320, 540
center_cx, center_cy = 960, 540
right_cx, right_cy = 1600, 540

for frame_idx in range(total_frames):
    t = frame_idx / fps
    # Candle flicker
    flicker = 1.0 + 0.08 * math.sin(t * 15.0) + 0.05 * math.cos(t * 23.0)
    
    # Animated mouth openings
    # Center sings on 2 Hz
    mouth_center = 0.5 + 0.45 * math.sin(t * 2.0 * math.pi * 1.5)
    # Left sings in counter-rhythm
    mouth_left = 0.5 + 0.45 * math.cos(t * 2.0 * math.pi * 1.2)
    # Right laughs/chuckles
    mouth_right = 0.5 + 0.4 * math.sin(t * 2.0 * math.pi * 2.5)

    # Frame buffer (pure black RGBA)
    buf = bytearray(width * height * 4)

    def draw_circle(cx, cy, r, red, green, blue, alpha=1.0):
        r2 = r * r
        x0 = max(0, int(cx - r))
        x1 = min(width, int(cx + r + 1))
        y0 = max(0, int(cy - r))
        y1 = min(height, int(cy + r + 1))
        for y in range(y0, y1):
            dy2 = (y - cy) * (y - cy)
            row_offset = y * width * 4
            for x in range(x0, x1):
                d2 = (x - cx) * (x - cx) + dy2
                if d2 <= r2:
                    dist_norm = math.sqrt(d2) / r
                    falloff = max(0.0, 1.0 - dist_norm * 0.7) * alpha
                    idx = row_offset + x * 4
                    curr_r = buf[idx]
                    curr_g = buf[idx + 1]
                    curr_b = buf[idx + 2]
                    # Alpha blend / additive
                    buf[idx] = min(255, int(curr_r + red * falloff))
                    buf[idx + 1] = min(255, int(curr_g + green * falloff))
                    buf[idx + 2] = min(255, int(curr_b + blue * falloff))
                    buf[idx + 3] = 255

    def draw_triangle(p1, p2, p3, red, green, blue):
        # Bounding box
        min_x = max(0, int(min(p1[0], p2[0], p3[0])))
        max_x = min(width - 1, int(max(p1[0], p2[0], p3[0])))
        min_y = max(0, int(min(p1[1], p2[1], p3[1])))
        max_y = min(height - 1, int(max(p1[1], p2[1], p3[1])))

        def sign(p, a, b):
            return (p[0] - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (p[1] - b[1])

        for y in range(min_y, max_y + 1):
            row_offset = y * width * 4
            for x in range(min_x, max_x + 1):
                pt = (x, y)
                d1 = sign(pt, p1, p2)
                d2 = sign(pt, p2, p3)
                d3 = sign(pt, p3, p1)
                has_neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
                has_pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
                if not (has_neg and has_pos):
                    idx = row_offset + x * 4
                    buf[idx] = min(255, buf[idx] + red)
                    buf[idx + 1] = min(255, buf[idx + 1] + green)
                    buf[idx + 2] = min(255, buf[idx + 2] + blue)
                    buf[idx + 3] = 255

    # --- PUMPKIN 1 (LEFT: Dopey / Goofy) ---
    lr = int(min(255, 255 * flicker))
    lg = int(min(255, 140 * flicker))
    # Eyes (round dopey eyes)
    draw_circle(left_cx - 50, left_cy - 70, 38, lr, lg, 10)
    draw_circle(left_cx + 50, left_cy - 70, 44, lr, lg, 10)
    # Pupils
    pupil_x = 8 * math.sin(t * 3.0)
    draw_circle(left_cx - 50 + pupil_x, left_cy - 70, 12, 10, 10, 10, 0.9)
    draw_circle(left_cx + 50 + pupil_x, left_cy - 70, 12, 10, 10, 10, 0.9)
    # Wide dopey mouth
    mouth_drop_l = int(35 * mouth_left)
    draw_circle(left_cx, left_cy + 55 + mouth_drop_l, 60 + mouth_drop_l, lr, lg, 20)
    # Buck teeth (black carved notch)
    draw_circle(left_cx - 15, left_cy + 40, 12, 255, 250, 180)
    draw_circle(left_cx + 15, left_cy + 40, 12, 255, 250, 180)

    # --- PUMPKIN 2 (CENTER: Classic Jack) ---
    cr = int(min(255, 255 * flicker))
    cg = int(min(255, 165 * flicker))
    # Triangle Eyes
    draw_triangle((center_cx - 90, center_cy - 40), (center_cx - 30, center_cy - 40), (center_cx - 60, center_cy - 110), cr, cg, 15)
    draw_triangle((center_cx + 30, center_cy - 40), (center_cx + 90, center_cy - 40), (center_cx + 60, center_cy - 110), cr, cg, 15)
    # Triangle Nose
    draw_triangle((center_cx - 20, center_cy + 10), (center_cx + 20, center_cy + 10), (center_cx, center_cy - 25), cr, cg, 15)
    # Carved grinning mouth
    mouth_drop_c = int(45 * mouth_center)
    # Mouth base
    draw_circle(center_cx, center_cy + 85 + mouth_drop_c, 80 + mouth_drop_c, cr, cg, 15)
    # Teeth inside mouth
    draw_triangle((center_cx - 45, center_cy + 65), (center_cx - 15, center_cy + 65), (center_cx - 30, center_cy + 85), 255, 240, 150)
    draw_triangle((center_cx + 15, center_cy + 65), (center_cx + 45, center_cy + 65), (center_cx + 30, center_cy + 85), 255, 240, 150)

    # --- PUMPKIN 3 (RIGHT: Sinister / Scary) ---
    rr = int(min(255, 255 * flicker))
    rg = int(min(255, 110 * flicker))
    # Slanted evil eyes
    draw_triangle((right_cx - 85, right_cy - 85), (right_cx - 25, right_cy - 50), (right_cx - 75, right_cy - 45), rr, rg, 5)
    draw_triangle((right_cx + 85, right_cy - 85), (right_cx + 25, right_cy - 50), (right_cx + 75, right_cy - 45), rr, rg, 5)
    # Evil grinning mouth with fangs
    mouth_drop_r = int(40 * mouth_right)
    draw_circle(right_cx, right_cy + 75 + mouth_drop_r, 75 + mouth_drop_r, rr, rg, 5)
    # Sharp razor fangs
    for fx_offset in [-55, -25, 5, 35]:
        draw_triangle(
            (right_cx + fx_offset, right_cy + 55),
            (right_cx + fx_offset + 18, right_cy + 55),
            (right_cx + fx_offset + 9, right_cy + 85 + mouth_drop_r * 0.4),
            255, 255, 200
        )

    proc.stdin.write(buf)

proc.stdin.close()
proc.wait()
print("Sample trio video generated successfully!")
