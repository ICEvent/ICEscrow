import React, { useState } from 'react'
import { Text } from '@react-three/drei'
import { useNavigate } from 'react-router-dom'
import { Item } from '../../api/escrow/service.did'

interface ShelfItemProps {
  item: Item
  position: [number, number, number]
  rotation?: [number, number, number]
}

const ShelfItem: React.FC<ShelfItemProps> = ({ item, position, rotation = [0, 0, 0] }) => {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)

  const currency = Object.keys(item.currency)[0]
  const price = currency === 'ICP' ? Number(item.price) / 1e8 : Number(item.price) / 1e6
  const isFree = price === 0
  const itemType = (Object.keys(item.itype)[0] || '').toUpperCase()
  const displayName = item.name ? item.name.slice(0, 24) : 'Item'
  const priceLabel = isFree ? 'FREE' : `${currency} ${price.toFixed(2)}`
  const cardColor = hovered ? '#fed7aa' : isFree ? '#d1fae5' : '#f8fafc'
  const priceColor = isFree ? '#059669' : '#d97706'

  return (
    <group position={position} rotation={rotation as any}>
      {/* Card body */}
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={(e)  => { e.stopPropagation(); setHovered(false) }}
        onClick={(e) => { e.stopPropagation(); navigate(`/item/${item.id}`) }}
      >
        <boxGeometry args={[1.0, 1.3, 0.06]} />
        <meshStandardMaterial color={cardColor} />
      </mesh>

      {/* Item name */}
      <Text
        position={[0, 0.3, 0.04]}
        fontSize={0.1}
        maxWidth={0.85}
        textAlign="center"
        color="#1e293b"
        anchorX="center"
        anchorY="middle"
      >
        {displayName}
      </Text>

      {/* Price */}
      <Text
        position={[0, -0.1, 0.04]}
        fontSize={0.11}
        color={priceColor}
        anchorX="center"
        anchorY="middle"
      >
        {priceLabel}
      </Text>

      {/* Type badge */}
      <Text
        position={[0, -0.42, 0.04]}
        fontSize={0.07}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        {itemType}
      </Text>

      {/* Glow outline when hovered */}
      {hovered && (
        <mesh>
          <boxGeometry args={[1.06, 1.36, 0.03]} />
          <meshStandardMaterial color="#d97706" transparent opacity={0.35} />
        </mesh>
      )}
    </group>
  )
}

export default ShelfItem
