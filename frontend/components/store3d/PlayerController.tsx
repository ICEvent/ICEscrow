import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'

const SPEED = 6
const STORE_Z_MIN = -135
const STORE_Z_MAX = 6
const CORRIDOR_HALF_WIDTH = 3.0

const PlayerController: React.FC = () => {
  const { camera } = useThree()
  const [, get] = useKeyboardControls()
  const velocity = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const { forward, backward, left, right } = get() as {
      forward: boolean; backward: boolean; left: boolean; right: boolean
    }

    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)
    dir.y = 0
    dir.normalize()

    const sideDir = new THREE.Vector3()
    sideDir.crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize()

    velocity.current.set(0, 0, 0)
    if (forward)  velocity.current.addScaledVector(dir, SPEED)
    if (backward) velocity.current.addScaledVector(dir, -SPEED)
    if (right)    velocity.current.addScaledVector(sideDir, SPEED)
    if (left)     velocity.current.addScaledVector(sideDir, -SPEED)

    camera.position.addScaledVector(velocity.current, delta)

    // Clamp within store bounds
    camera.position.x = Math.max(-CORRIDOR_HALF_WIDTH, Math.min(CORRIDOR_HALF_WIDTH, camera.position.x))
    camera.position.y = 1.7
    camera.position.z = Math.max(STORE_Z_MIN, Math.min(STORE_Z_MAX, camera.position.z))
  })

  return null
}

export default PlayerController
