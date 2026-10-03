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

## Preparing graphics for navigation

The room viewer keeps one Canvas/WebGL renderer between rooms. The scene, camera,
picker and per-visit game/editor state reset for each room. Prepared models also
populate R3F's Suspense cache and preload their hotspot metadata; each visit still
revalidates published hotspots and respects local editor drafts.

`src/gpuRoomCache.js` prepares the intended next room's textures and materials
using that renderer. Work starts during browser idle time after 500 ms without
camera movement, pointer movement/presses or keyboard activity, and follows the
same visibility/data-saving policy as downloads. Desktop retains at most three
GPU rooms (allowing previous/current/next); mobile or at most 4 GB reported memory
retains two. Eviction releases GPU resources while retaining decoded models for
later visits. Home uses a separate renderer and is excluded from GPU preparation.

The transition cover copies the canvas into another canvas, preserving pixels
without synchronous PNG encoding. No extra texture reduction or geometry changes
are involved.

## Validation on 2026-10-02

Under a shared 2 MiB/s (16.8 Mbps) server limit for rooms and the old preview video,
with HTTP caching disabled, direct entry into AIKO changed from 27.8 seconds to
5.3 seconds until the loading cursor cleared and two animation frames elapsed.
The model transfer alone changed from 25.9 seconds / 20.3 MB to 4.2 seconds / 8.4 MB.
Navigation into a prepared MOENE took 0.89 seconds without a second model request.
These are local desktop measurements, not a guarantee for every device/network.

A subsequent instrumented local comparison of a prepared AIKO → MOENE navigation
measured 496 ms before graphics preparation and 56 ms afterwards (8.9× faster).
Repeat prepared navigation took 50 ms; the mobile viewport check took 47 ms. The original transition included a 217 ms
texture upload and 96.5 ms PNG encoding; the new transition reused the renderer,
performed no room texture upload, and copied the frame in 0.5 ms. Measurement ends
two animation frames after the transition cover and loading cursor disappear.
Rooms clicked before GPU preparation finishes still perform the remaining work
on entry. Rapid navigation, reactions, game resets and mobile framing were checked.

`node --test tests/*.test.js` covers scheduling, navigation cancellation,
in-flight reuse, stale completion, retries and adaptive policy. Every optimized
GLB was also compared with its original: all non-image buffer-view bytes and
normalized GLB metadata matched.

## Regenerating textures

Use `scripts/resize-room-textures.py` with Python and Pillow against the original
8K scans from Git. Without `--write`, it only reports estimated sizes. The script
rejects already resized scans to prevent repeated JPEG compression and verifies
that geometry is unchanged before writing each GLB.
