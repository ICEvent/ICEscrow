import React from 'react'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { Item } from '../../api/escrow/service.did'
import ShelfItem from './ShelfItem'

const CATEGORIES = [
  { key: 'nft',         label: 'NFT',         signColor: '#8b5cf6', floorColor: '#ede9fe' },
  { key: 'coin',        label: 'Coin',         signColor: '#f59e0b', floorColor: '#fef3c7' },
  { key: 'service',     label: 'Service',      signColor: '#3b82f6', floorColor: '#eff6ff' },
  { key: 'merchandise', label: 'Merchandise',  signColor: '#ec4899', floorColor: '#fdf2f8' },
  { key: 'other',       label: 'Other',        signColor: '#6b7280', floorColor: '#f1f5f9' },
  { key: 'free',        label: 'Free Items',   signColor: '#10b981', floorColor: '#ecfdf5' },
]

const AISLE_LEN    = 22   // world units per category section
const STORE_HEIGHT = 4.2
const CORRIDOR_W   = 8
const SHELF_X      = 3.6  // distance from center to shelf back wall
const SHELF_LEVELS = [1.05, 2.35] as const
const ITEM_SPACING = 1.55
const MAX_PER_SIDE_LEVEL = 8  // 8 slots per shelf level per side

interface StoreWorldProps {
  items: Item[]
}

const StoreWorld: React.FC<StoreWorldProps> = ({ items }) => {
  const totalLen = CATEGORIES.length * AISLE_LEN + 12
  const midZ     = 5 - totalLen / 2  // world centre Z of the whole corridor

  // Group available (listed) items by category key
  const grouped = React.useMemo<Record<string, Item[]>>(() => {
    const available = items.filter(i => Object.keys(i.status)[0] === 'list')
    const map: Record<string, Item[]> = {}
    for (const cat of CATEGORIES) {
      if (cat.key === 'free') {
        map.free = available.filter(i => i.price === 0n)
      } else {
        map[cat.key] = available.filter(
          i => (Object.keys(i.itype)[0] || '').toLowerCase() === cat.key
        )
      }
    }
    return map
  }, [items])

  return (
    <group>
      {/* ── Structural surfaces ─────────────────────────────────────── */}

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, midZ]}>
        <planeGeometry args={[CORRIDOR_W, totalLen]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, STORE_HEIGHT, midZ]}>
        <planeGeometry args={[CORRIDOR_W, totalLen]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>

      {/* Left wall */}
      <mesh
        rotation={[0, Math.PI / 2, 0]}
        position={[-CORRIDOR_W / 2, STORE_HEIGHT / 2, midZ]}
      >
        <planeGeometry args={[totalLen, STORE_HEIGHT]} />
        <meshStandardMaterial color="#e2e8f0" side={THREE.DoubleSide} />
      </mesh>

      {/* Right wall */}
      <mesh
        rotation={[0, -Math.PI / 2, 0]}
        position={[CORRIDOR_W / 2, STORE_HEIGHT / 2, midZ]}
      >
        <planeGeometry args={[totalLen, STORE_HEIGHT]} />
        <meshStandardMaterial color="#e2e8f0" side={THREE.DoubleSide} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, STORE_HEIGHT / 2, midZ - totalLen / 2]}>
        <planeGeometry args={[CORRIDOR_W, STORE_HEIGHT]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>

      {/* Entrance welcome sign */}
      <group position={[0, STORE_HEIGHT - 0.5, 4.5]}>
        <mesh rotation={[0, Math.PI, 0]}>
          <boxGeometry args={[4.5, 0.8, 0.06]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <Text
          position={[0, 0, -0.05]}
          fontSize={0.28}
          color="#fed7aa"
          anchorX="center"
          anchorY="middle"
        >
          🛒 ICEscrow 3D Store
        </Text>
      </group>

      {/* Ceiling strip lights */}
      {Array.from({ length: Math.ceil(totalLen / 10) }).map((_, i) => (
        <pointLight
          key={i}
          position={[0, STORE_HEIGHT - 0.4, 5 - i * 10 - 5]}
          intensity={0.5}
          distance={14}
          color="#fff8ee"
        />
      ))}

      {/* ── Aisles ──────────────────────────────────────────────────── */}
      {CATEGORIES.map((cat, catIdx) => {
        const zSectionStart = 5 - catIdx * AISLE_LEN          // near end of section
        const zCenter       = zSectionStart - AISLE_LEN / 2   // centre of section

        const catItems = grouped[cat.key] ?? []
        const slotsPerSide = SHELF_LEVELS.length * MAX_PER_SIDE_LEVEL

        // Left shelf gets first half, right shelf gets second half
        const leftItems  = catItems.slice(0, slotsPerSide)
        const rightItems = catItems.slice(slotsPerSide, slotsPerSide * 2)

        return (
          <group key={cat.key}>
            {/* Coloured floor strip for this section */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, zCenter]}>
              <planeGeometry args={[CORRIDOR_W - 0.1, AISLE_LEN - 0.1]} />
              <meshStandardMaterial color={cat.floorColor} transparent opacity={0.55} />
            </mesh>

            {/* Hanging category sign */}
            <group position={[0, STORE_HEIGHT - 0.35, zCenter]}>
              <mesh>
                <boxGeometry args={[3.2, 0.65, 0.06]} />
                <meshStandardMaterial color={cat.signColor} />
              </mesh>
              <Text
                position={[0, 0, 0.05]}
                fontSize={0.26}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
              >
                {cat.label}
              </Text>
            </group>

            {/* ── Shelf structures (left & right) ───────────────────── */}
            {/* Left back upright */}
            <mesh position={[-SHELF_X, STORE_HEIGHT / 2, zCenter]}>
              <boxGeometry args={[0.06, STORE_HEIGHT, AISLE_LEN - 0.4]} />
              <meshStandardMaterial color="#92400e" />
            </mesh>

            {/* Right back upright */}
            <mesh position={[SHELF_X, STORE_HEIGHT / 2, zCenter]}>
              <boxGeometry args={[0.06, STORE_HEIGHT, AISLE_LEN - 0.4]} />
              <meshStandardMaterial color="#92400e" />
            </mesh>

            {/* Left shelf planks */}
            {SHELF_LEVELS.map((shelfY) => (
              <mesh
                key={`ls-${shelfY}`}
                position={[-(SHELF_X - 0.22), shelfY - 0.04, zCenter]}
              >
                <boxGeometry args={[0.48, 0.05, AISLE_LEN - 0.4]} />
                <meshStandardMaterial color="#d4a574" />
              </mesh>
            ))}

            {/* Right shelf planks */}
            {SHELF_LEVELS.map((shelfY) => (
              <mesh
                key={`rs-${shelfY}`}
                position={[SHELF_X - 0.22, shelfY - 0.04, zCenter]}
              >
                <boxGeometry args={[0.48, 0.05, AISLE_LEN - 0.4]} />
                <meshStandardMaterial color="#d4a574" />
              </mesh>
            ))}

            {/* ── Items on left shelf ───────────────────────────────── */}
            {leftItems.map((item, idx) => {
              const level  = Math.floor(idx / MAX_PER_SIDE_LEVEL)
              const slot   = idx % MAX_PER_SIDE_LEVEL
              if (level >= SHELF_LEVELS.length) return null
              const shelfY = SHELF_LEVELS[level]
              return (
                <ShelfItem
                  key={String(item.id)}
                  item={item}
                  // Card sits on shelf plank; item centre = shelf top + half card height
                  position={[-(SHELF_X - 0.72), shelfY + 0.68, zSectionStart - 1.5 - slot * ITEM_SPACING]}
                  // Face toward corridor centre (+X direction)
                  rotation={[0, Math.PI / 2, 0]}
                />
              )
            })}

            {/* ── Items on right shelf ──────────────────────────────── */}
            {rightItems.map((item, idx) => {
              const level  = Math.floor(idx / MAX_PER_SIDE_LEVEL)
              const slot   = idx % MAX_PER_SIDE_LEVEL
              if (level >= SHELF_LEVELS.length) return null
              const shelfY = SHELF_LEVELS[level]
              return (
                <ShelfItem
                  key={String(item.id)}
                  item={item}
                  // Face toward corridor centre (-X direction)
                  position={[SHELF_X - 0.72, shelfY + 0.68, zSectionStart - 1.5 - slot * ITEM_SPACING]}
                  rotation={[0, -Math.PI / 2, 0]}
                />
              )
            })}

            {/* Empty section placeholder */}
            {catItems.length === 0 && (
              <Text
                position={[0, 1.6, zCenter]}
                fontSize={0.18}
                color="#94a3b8"
                anchorX="center"
                anchorY="middle"
              >
                No items in this section yet
              </Text>
            )}
          </group>
        )
      })}
    </group>
  )
}

export default StoreWorld
