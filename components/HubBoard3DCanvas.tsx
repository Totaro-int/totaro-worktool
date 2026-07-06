'use client'

/**
 * HubBoard3DCanvas — 실제 R3F 캔버스 (WebGL). HubBoard3D 가 ssr:false 로 동적 임포트한다.
 * 마우스 회전·줌(OrbitControls) · 칩 호버 발광 · Float 둥둥 · 클릭 이동 · 실데이터 라벨.
 */
import { useRef, useState, type JSX } from 'react'

import { Float, Html, Line, OrbitControls, RoundedBox } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import type { Hub3DNode } from './HubBoard3D'

const CYAN = '#35e0ff'
const MAG = '#ff3d9a'

function Label({
  x,
  y,
  z,
  value,
  name,
  color,
}: {
  x: number
  y: number
  z: number
  value: string
  name: string
  color: string
}): JSX.Element {
  return (
    <Html
      position={[x, y, z]}
      center
      distanceFactor={11}
      style={{ pointerEvents: 'none' }}
      zIndexRange={[10, 0]}
    >
      <div
        style={{
          textAlign: 'center',
          transform: 'translateY(-50%)',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-geist-mono, monospace)',
        }}
      >
        {value ? (
          <div style={{ color, fontWeight: 700, fontSize: 15, textShadow: `0 0 10px ${color}` }}>
            {value}
          </div>
        ) : null}
        <div style={{ color: '#9fb4d0', fontSize: 9, letterSpacing: 1 }}>{name}</div>
      </div>
    </Html>
  )
}

function Ring({
  r,
  color,
  tilt = false,
}: {
  r: number
  color: string
  tilt?: boolean
}): JSX.Element {
  return (
    <mesh rotation={tilt ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
      <torusGeometry args={[r, 0.045, 12, 40]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2.2}
        toneMapped={false}
      />
    </mesh>
  )
}

function Chip({
  node,
  onSelect,
}: {
  node: Hub3DNode
  onSelect: (href: string) => void
}): JSX.Element {
  const [hover, setHover] = useState(false)
  const dark = '#22344f'

  let body: JSX.Element
  let topY = 1
  if (node.kind === 'tower') {
    topY = 1.6
    body = (
      <>
        <mesh position={[0, 0.8, 0]}>
          <boxGeometry args={[0.62, 1.6, 0.62]} />
          <meshStandardMaterial
            color={dark}
            metalness={0.6}
            roughness={0.35}
            emissive={node.color}
            emissiveIntensity={hover ? 0.5 : 0.12}
          />
        </mesh>
        <group position={[0, 1.62, 0]}>
          <Ring r={0.4} color={node.color} tilt />
        </group>
      </>
    )
  } else if (node.kind === 'towers3') {
    topY = 1.9
    body = (
      <>
        {(
          [
            [-0.5, 1.0, -0.35],
            [0.1, 1.35, 0.1],
            [0.6, 1.7, 0.5],
          ] as const
        ).map(([ox, h, oz], i) => (
          <group key={i} position={[ox, 0, oz]}>
            <mesh position={[0, h / 2, 0]}>
              <boxGeometry args={[0.5, h, 0.5]} />
              <meshStandardMaterial
                color={dark}
                metalness={0.6}
                roughness={0.35}
                emissive={node.color}
                emissiveIntensity={hover ? 0.5 : 0.12}
              />
            </mesh>
            <group position={[0, h + 0.02, 0]}>
              <Ring r={0.32} color={node.color} tilt />
            </group>
          </group>
        ))}
      </>
    )
  } else if (node.kind === 'bars') {
    topY = 1.7
    body = (
      <>
        {[0.7, 1.15, 1.6, 1.05].map((h, i) => (
          <mesh key={i} position={[-0.55 + i * 0.38, h / 2, 0]}>
            <boxGeometry args={[0.3, h, 0.3]} />
            <meshStandardMaterial
              color={dark}
              metalness={0.5}
              roughness={0.4}
              emissive={node.color}
              emissiveIntensity={hover ? 0.6 : 0.18}
            />
          </mesh>
        ))}
      </>
    )
  } else if (node.kind === 'gauge') {
    topY = 0.5
    body = (
      <group position={[0, 0.25, 0]}>
        <Ring r={0.9} color={node.color} tilt />
        <Ring r={0.58} color={node.color} tilt />
      </group>
    )
  } else if (node.kind === 'slab') {
    topY = 0.5
    body = (
      <>
        <RoundedBox args={[1.4, 0.2, 2.2]} radius={0.06} position={[0, 0.1, 0]}>
          <meshStandardMaterial
            color="#16304f"
            metalness={0.6}
            roughness={0.3}
            emissive={node.color}
            emissiveIntensity={hover ? 0.4 : 0.1}
          />
        </RoundedBox>
        {[-0.6, -0.1, 0.4, 0.9].map((oz, i) => (
          <mesh key={i} position={[0, 0.21, oz]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.9, 0.05]} />
            <meshStandardMaterial
              color={i % 2 ? MAG : CYAN}
              emissive={i % 2 ? MAG : CYAN}
              emissiveIntensity={1.4}
              toneMapped={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </>
    )
  } else {
    topY = 0.6
    body = (
      <>
        <RoundedBox args={[1.0, 0.35, 1.0]} radius={0.12} position={[0, 0.17, 0]}>
          <meshStandardMaterial
            color="#1a3252"
            metalness={0.6}
            roughness={0.3}
            emissive={node.color}
            emissiveIntensity={hover ? 0.4 : 0.1}
          />
        </RoundedBox>
        <group position={[0, 0.37, 0]}>
          <Ring r={0.32} color={node.color} tilt />
        </group>
      </>
    )
  }

  return (
    <Float speed={2.2} rotationIntensity={0.15} floatIntensity={0.5}>
      <group
        position={[node.x, 0, node.z]}
        scale={hover ? 1.06 : 1}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHover(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHover(false)
          document.body.style.cursor = 'auto'
        }}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(node.href)
        }}
      >
        {body}
        {hover ? (
          <pointLight position={[0, topY, 0]} color={node.color} intensity={6} distance={4} />
        ) : null}
        <Label x={0} y={topY + 0.7} z={0} value={node.value} name={node.name} color={node.color} />
        {/* 넉넉한 히트박스 */}
        <mesh visible={false} position={[0, topY / 2, 0]}>
          <boxGeometry args={[1.7, topY + 0.7, 1.7]} />
          <meshBasicMaterial />
        </mesh>
      </group>
    </Float>
  )
}

function Cpu({
  node,
  onSelect,
}: {
  node: Hub3DNode
  onSelect: (href: string) => void
}): JSX.Element {
  const [hover, setHover] = useState(false)
  const ring = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.z += dt * 0.4
  })
  return (
    <group
      position={[node.x, 0, node.z]}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHover(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHover(false)
        document.body.style.cursor = 'auto'
      }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(node.href)
      }}
    >
      <RoundedBox args={[2.8, 0.9, 2.8]} radius={0.08} smoothness={4} position={[0, 0.45, 0]}>
        <meshStandardMaterial color="#c7d2e0" metalness={1} roughness={0.28} />
      </RoundedBox>
      <mesh ref={ring} position={[0, 0.92, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.95, 0.06, 14, 48, Math.PI * 1.35]} />
        <meshStandardMaterial
          color={CYAN}
          emissive={CYAN}
          emissiveIntensity={2.4}
          toneMapped={false}
        />
      </mesh>
      <Html position={[0, 0.95, 0]} center distanceFactor={11} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            color: '#0b1a33',
            fontWeight: 800,
            fontSize: 26,
            fontFamily: 'var(--font-geist-mono, monospace)',
          }}
        >
          {node.value}
        </div>
      </Html>
      <Label x={0} y={-0.15} z={1.9} value="" name={`${node.name} · 할 일`} color={CYAN} />
      {hover ? <pointLight position={[0, 1.6, 0]} color={CYAN} intensity={8} distance={6} /> : null}
    </group>
  )
}

function Scene({
  nodes,
  onSelect,
}: {
  nodes: Hub3DNode[]
  onSelect: (href: string) => void
}): JSX.Element {
  const cpu = nodes.find((n) => n.kind === 'cpu')
  const mods = nodes.filter((n) => n.kind !== 'cpu')
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[6, 10, 4]} intensity={1.1} />
      <pointLight position={[0, 3, 0]} color={CYAN} intensity={3} distance={14} />
      <pointLight position={[-6, 2, 6]} color={MAG} intensity={2} distance={14} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial color="#0c1c36" metalness={0.4} roughness={0.7} />
      </mesh>

      {mods.map((n) => (
        <Line
          key={`t-${n.href}`}
          points={[
            [0, 0.06, 0],
            [n.x, 0.06, 0],
            [n.x, 0.06, n.z],
          ]}
          color={n.color}
          lineWidth={1.5}
          transparent
          opacity={0.55}
        />
      ))}

      {mods.map((n) => (
        <Chip key={n.href} node={n} onSelect={onSelect} />
      ))}
      {cpu ? <Cpu node={cpu} onSelect={onSelect} /> : null}

      <OrbitControls
        enablePan={false}
        minDistance={8}
        maxDistance={20}
        minPolarAngle={0.5}
        maxPolarAngle={Math.PI / 2.35}
        autoRotate
        autoRotateSpeed={0.4}
        target={[0, 0.4, 0]}
      />
    </>
  )
}

export default function HubBoard3DCanvas({
  nodes,
  onSelect,
}: {
  nodes: Hub3DNode[]
  onSelect: (href: string) => void
}): JSX.Element {
  return (
    <Canvas
      camera={{ position: [9, 8, 9], fov: 42 }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    >
      <Scene nodes={nodes} onSelect={onSelect} />
    </Canvas>
  )
}
