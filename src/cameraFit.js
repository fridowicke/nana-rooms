import * as THREE from 'three'

// Fit the actual projected bounds, including the house's depth and angled roof.
export function perspectiveFitDistance(box, target, direction, fov, aspect, margin = 1.2, scene = null) {
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize()
  const up = new THREE.Vector3().crossVectors(direction, right).normalize()
  const tanVertical = Math.tan(THREE.MathUtils.degToRad(fov) / 2)
  const tanHorizontal = tanVertical * Math.max(aspect, 0.01)
  let distance = 0
  const offset = new THREE.Vector3()
  const include = point => {
    offset.copy(point).sub(target)
    const depth = offset.dot(direction)
    distance = Math.max(distance, Math.abs(offset.dot(right)) / tanHorizontal + depth, Math.abs(offset.dot(up)) / tanVertical + depth)
  }
  // Empty bounding-box corners can make an irregular house unnecessarily small.
  // On the home scene, fit its vertices and exclude invisible door hit targets.
  if (scene) {
    const point = new THREE.Vector3()
    scene.traverse(object => {
      if (!object.isMesh || object.userData.isDoorHitArea) return
      const positions = object.geometry?.attributes.position
      if (!positions) return
      for (let i = 0; i < positions.count; i++) include(point.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld))
    })
    if (distance > 0) return distance * margin
  }
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        include(new THREE.Vector3(x, y, z))
      }
    }
  }
  return distance * margin
}
