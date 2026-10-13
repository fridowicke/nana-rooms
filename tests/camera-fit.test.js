import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { perspectiveFitDistance } from '../src/cameraFit.js'

test('the entire angled house fits inside small phones and landscape screens', () => {
  const box = new THREE.Box3(new THREE.Vector3(-0.25, -0.25, -0.3), new THREE.Vector3(0.25, 0.4, 0.3))
  const target = box.getCenter(new THREE.Vector3()).add(new THREE.Vector3(0, -0.026, 0))
  const direction = new THREE.Vector3(-0.55, 0.24, 0.48).normalize()
  for (const [width, height] of [[320, 386], [390, 662], [844, 258]]) {
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.001, 100)
    const distance = perspectiveFitDistance(box, target, direction, camera.fov, camera.aspect)
    camera.position.copy(target).addScaledVector(direction, distance)
    camera.lookAt(target)
    camera.updateMatrixWorld()
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const projected = new THREE.Vector3(x, y, z).project(camera)
      assert.ok(Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1, `${width}×${height}: cropped corner`)
      assert.ok(projected.z > -1 && projected.z < 1, 'corner outside camera depth range')
    }
  }
})

test('invisible tap targets do not shrink the house, and real vertices remain inside the screen', () => {
  const scene = new THREE.Group()
  const house = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), new THREE.MeshBasicMaterial())
  scene.add(house)
  scene.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(house)
  const target = box.getCenter(new THREE.Vector3())
  const direction = new THREE.Vector3(-0.55, 0.24, 0.48).normalize()
  const distance = perspectiveFitDistance(box, target, direction, 42, 390 / 662, 1.1, scene)
  const hitArea = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial())
  hitArea.userData.isDoorHitArea = true
  scene.add(hitArea)
  scene.updateMatrixWorld(true)
  assert.equal(perspectiveFitDistance(box, target, direction, 42, 390 / 662, 1.1, scene), distance)
  const camera = new THREE.PerspectiveCamera(42, 390 / 662, 0.001, 100)
  camera.position.copy(target).addScaledVector(direction, distance)
  camera.lookAt(target)
  camera.updateMatrixWorld()
  const points = house.geometry.attributes.position
  for (let i = 0; i < points.count; i++) {
    const projected = new THREE.Vector3().fromBufferAttribute(points, i).project(camera)
    assert.ok(Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1)
  }
  house.geometry.dispose(); house.material.dispose()
  hitArea.geometry.dispose(); hitArea.material.dispose()
})
