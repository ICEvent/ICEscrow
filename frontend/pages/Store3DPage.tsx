import React, { Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEscrow, useLoading } from '../components/Store'
import { Item } from '../api/escrow/service.did'
import StoreScene3D from '../components/store3d/StoreScene3D'

const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0)

const Store3DPage: React.FC = () => {
  const escrow = useEscrow()
  const { setLoading } = useLoading()
  const navigate = useNavigate()
  const [items, setItems] = React.useState<Item[]>([])
  const [loaded, setLoaded] = React.useState(false)
  const isTouch = isTouchDevice()

  React.useEffect(() => {
    setLoading(true)
    escrow.getItems(BigInt(1)).then((res) => {
      setItems(res)
      setLoaded(true)
      setLoading(false)
    })
  }, [])

  return (
    // Fills the viewport below the fixed header (top: 4rem = 64px)
    <div
      style={{ position: 'fixed', inset: 0, top: '4rem', zIndex: 10, background: '#0f172a' }}
    >
      {/* HUD — top instruction bar */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          borderRadius: 12,
          padding: '6px 16px',
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        {isTouch
          ? '📱 3D Store requires a desktop browser with a mouse'
          : '🖱️ Click canvas to lock pointer · WASD / Arrow keys to walk · Aim at item & click to view · Esc to unlock'}
      </div>

      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        style={{
          position: 'absolute',
          top: 8,
          left: 12,
          zIndex: 20,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          padding: '6px 14px',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        ← Back
      </button>

      {/* Crosshair */}
      {!isTouch && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <line x1="12" y1="4" x2="12" y2="20" stroke="white" strokeWidth="1.5" strokeOpacity="0.8" />
            <line x1="4" y1="12" x2="20" y2="12" stroke="white" strokeWidth="1.5" strokeOpacity="0.8" />
            <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="1.5" strokeOpacity="0.8" />
          </svg>
        </div>
      )}

      {/* Aisle map legend */}
      {!isTouch && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            zIndex: 20,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            borderRadius: 12,
            padding: '10px 14px',
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <div style={{ marginBottom: 6, color: '#fed7aa', fontSize: 12 }}>Aisle Map</div>
          {[
            { label: 'NFT',          color: '#8b5cf6' },
            { label: 'Coin',         color: '#f59e0b' },
            { label: 'Service',      color: '#3b82f6' },
            { label: 'Merchandise',  color: '#ec4899' },
            { label: 'Other',        color: '#6b7280' },
            { label: 'Free Items',   color: '#10b981' },
          ].map((a) => (
            <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: a.color, flexShrink: 0 }} />
              <span>{a.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Touch fallback */}
      {isTouch ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#94a3b8',
            gap: 16,
            padding: 32,
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 48 }}>🖥️</span>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>Desktop Required</p>
          <p style={{ fontSize: 13 }}>
            The 3D store uses first-person controls that require a mouse and keyboard.
            Please visit on a desktop browser.
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: 8,
              background: '#d97706',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '10px 24px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Go to Regular Shop
          </button>
        </div>
      ) : loaded ? (
        <Suspense fallback={null}>
          <StoreScene3D items={items} />
        </Suspense>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#94a3b8',
            fontSize: 14,
            gap: 12,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              border: '3px solid rgba(255,255,255,0.2)',
              borderTop: '3px solid #d97706',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          Loading store…
        </div>
      )}
    </div>
  )
}

export default Store3DPage
