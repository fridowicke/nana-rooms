# Room assets and preloading

The 11 room GLBs use 4096 × 4096 JPEG textures at quality 90. Together they are
95.1 MB, down from 204.9 MB. Geometry, UVs, triangle indices and hotspot files are
unchanged. `assets/home.glb` keeps its original texture.

`src/roomAssets.js` shares parsed models between background preparation and
`useLoader`. Room URLs include `?v=4k-1` so returning visitors fetch the new files;
bump this version whenever these assets are replaced.

`src/modelPreloading.js` waits until the current scene is ready, then downloads
one predicted room at a time during browser idle time. Door hover (180 ms dwell),
navigation-button hover/focus and pointer-down prioritize the likely destination.
Opening a room keeps its in-flight request, or cancels an unrelated speculative
download. Completed models remain cached for later visits. A cancelled download
can be retried; any late decoded result is disposed safely.

Desktop prepares four rooms after home and two after each room. Mobile or devices
with at most 4 GB reported memory prepare two after home and one after each room.
3G or at most 2 GB reported memory limits preparation to one. Save-Data and 2G
disable speculation. Hidden tabs and offline events pause speculative downloads.
Unsupported connection/memory APIs use the desktop or responsive-layout defaults.

The removed preview launcher no longer needs its old video preload, which used to
compete with model downloads even on direct room links.

## Validation on 2026-10-02

Under a shared 2 MiB/s (16.8 Mbps) server limit for rooms and the old preview video,
with HTTP caching disabled, direct entry into AIKO changed from 27.8 seconds to
5.3 seconds until the loading cursor cleared and two animation frames elapsed.
The model transfer alone changed from 25.9 seconds / 20.3 MB to 4.2 seconds / 8.4 MB.
Navigation into a prepared MOENE took 0.89 seconds without a second model request.
These are local desktop measurements, not a guarantee for every device/network.

`node --test tests/*.test.js` covers scheduling, navigation cancellation,
in-flight reuse, stale completion, retries and adaptive policy. Every optimized
GLB was also compared with its original: all non-image buffer-view bytes and
normalized GLB metadata matched.

## Regenerating textures

Use `scripts/resize-room-textures.py` with Python and Pillow against the original
8K scans from Git. Without `--write`, it only reports estimated sizes. The script
rejects already resized scans to prevent repeated JPEG compression and verifies
that geometry is unchanged before writing each GLB.
