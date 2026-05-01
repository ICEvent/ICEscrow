import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { PointerLockControls, KeyboardControls } from '@react-three/drei'
import { Item } from '../../api/escrow/service.did'
import StoreWorld from './StoreWorld'
import PlayerController from './PlayerController'

const CONTROLS_MAP = [
  { name: 'forward',  keys: ['ArrowUp',    'KeyW'] },
  { name: 'backward', keys: ['ArrowDown',  'KeyS'] },
  { name: 'left',     keys: ['ArrowLeft',  'KeyA'] },
  { name: 'right',    keys: ['ArrowRight', 'KeyD'] },
]

interface StoreScene3DProps {
  items: Item[]
}

const StoreScene3D: React.FC<StoreScene3DProps> = ({ items }) => {
  return (
    <KeyboardControls map={CONTROLS_MAP}>
      <Canvas
        camera={{ fov: 75, position: [0, 1.7, 5], near: 0.1, far: 400 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          {/* Scene lighting */}
          <ambientLight intensity={0.55} />
          <directionalLight position={[5, 10, 5]} intensity={0.7} castShadow />

          {/* Store geometry + items */}
          <StoreWorld items={items} />

          {/* Controls */}
          <PointerLockControls />
          <PlayerController />
        </Suspense>
      </Canvas>
    </KeyboardControls>
  )
}

export default StoreScene3D
