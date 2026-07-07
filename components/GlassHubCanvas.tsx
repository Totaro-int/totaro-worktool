'use client'

/**
 * GlassHubCanvas — Spline 유리박스를 R3F 로 복제한 허브 (박스=모듈, 9개 전부).
 *
 * 방향(사용자): 씬 통째 임베드 대신 글라스 박스를 코드로 재현해 모듈마다 하나씩.
 * idle 은 정적(전체 발광 애니 제거). 호버 = 살짝 들림 + 커서. 클릭 = 그 박스만
 * 발광하며 위로 떠오른 뒤 페이지 이동.
 */
import { useRef, useState, type JSX } from 'react'

import { Grid, Html, RoundedBox } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'

import type { GlassHubModule } from './GlassHub'
import type * as THREE from 'three'

const CYAN = '#35e0ff'

// ── 상판에 얹는 다크 임보싱 아이콘 (모듈별 단순 프리미티브) ──────
function Icon({ kind }: { kind: string }): JSX.Element {
  const dark = '#141c2b'
  const mat = <meshStandardMaterial color={dark} roughness={0.5} metalness={0.2} />
  switch (kind) {
    case 'tasks': // 리스트 바 3개
      return (
        <group>
          {[-0.18, 0, 0.18].map((z, i) => (
            <mesh key={i} position={[0, 0, z]}>
              <boxGeometry args={[0.52 - i * 0.1, 0.05, 0.09]} />
              {mat}
            </mesh>
          ))}
        </group>
      )
    case 'inbox': // 봉투: 판 + 플랩
      return (
        <group>
          <mesh>
            <boxGeometry args={[0.55, 0.05, 0.38]} />
            {mat}
          </mesh>
          <mesh position={[0, 0.03, -0.06]} rotation={[0.5, 0, 0]}>
            <boxGeometry args={[0.5, 0.04, 0.24]} />
            {mat}
          </mesh>
        </group>
      )
    case 'ai-team': // 미니 타워 3
      return (
        <group>
          {[
            [-0.16, 0.07, 0.1],
            [0, 0.11, -0.08],
            [0.17, 0.09, 0.06],
          ].map(([x, h, z], i) => (
            <mesh key={i} position={[x, h, z]}>
              <boxGeometry args={[0.13, h * 2, 0.13]} />
              {mat}
            </mesh>
          ))}
        </group>
      )
    case 'naver': // N 두 획
      return (
        <group>
          <mesh position={[-0.12, 0, 0]}>
            <boxGeometry args={[0.1, 0.05, 0.45]} />
            {mat}
          </mesh>
          <mesh position={[0.12, 0, 0]}>
            <boxGeometry args={[0.1, 0.05, 0.45]} />
            {mat}
          </mesh>
          <mesh rotation={[0, -0.65, 0]}>
            <boxGeometry args={[0.1, 0.05, 0.5]} />
            {mat}
          </mesh>
        </group>
      )
    case 'agent': // 링
      return (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.2, 0.06, 10, 28]} />
          {mat}
        </mesh>
      )
    case 'cash': // 코인 2
      return (
        <group>
          <mesh position={[-0.08, 0, 0.04]}>
            <cylinderGeometry args={[0.17, 0.17, 0.05, 24]} />
            {mat}
          </mesh>
          <mesh position={[0.12, 0.05, -0.06]}>
            <cylinderGeometry args={[0.17, 0.17, 0.05, 24]} />
            {mat}
          </mesh>
        </group>
      )
    case 'assistant': // 점 3 (챗)
      return (
        <group>
          {[-0.16, 0, 0.16].map((x, i) => (
            <mesh key={i} position={[x, 0, 0]}>
              <sphereGeometry args={[0.07, 14, 14]} />
              {mat}
            </mesh>
          ))}
        </group>
      )
    case 'github': // 꺾쇠 2
      return (
        <group>
          <mesh position={[-0.12, 0, 0]} rotation={[0, Math.PI / 4, 0]}>
            <boxGeometry args={[0.3, 0.05, 0.08]} />
            {mat}
          </mesh>
          <mesh position={[-0.12, 0, 0.16]} rotation={[0, -Math.PI / 4, 0]}>
            <boxGeometry args={[0.3, 0.05, 0.08]} />
            {mat}
          </mesh>
          <mesh position={[0.16, 0, 0.08]} rotation={[0, -Math.PI / 4, 0]}>
            <boxGeometry args={[0.3, 0.05, 0.08]} />
            {mat}
          </mesh>
        </group>
      )
    default: // contacts — 명함 판
      return (
        <group>
          <mesh>
            <boxGeometry args={[0.5, 0.05, 0.32]} />
            {mat}
          </mesh>
          <mesh position={[-0.12, 0.04, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.04, 16]} />
            {mat}
          </mesh>
        </group>
      )
  }
}

// ── 유리 모듈 박스 ───────────────────────────────────────────────
function GlassModule({
  m,
  onSelect,
}: {
  m: GlassHubModule
  onSelect: (href: string) => void
}): JSX.Element {
  const grp = useRef<THREE.Group>(null)
  const glowMat = useRef<THREE.MeshStandardMaterial>(null)
  const [hover, setHover] = useState(false)
  const [clicked, setClicked] = useState(false)

  // 목표 상태: idle 0 / hover 0.12 / clicked 0.8 (발광은 clicked 에서 최대)
  useFrame((_, dt) => {
    const g = grp.current
    if (!g) return
    const targetY = clicked ? 0.8 : hover ? 0.12 : 0
    g.position.y += (targetY - g.position.y) * Math.min(1, dt * (clicked ? 10 : 8))
    if (glowMat.current) {
      const target = clicked ? 2.6 : hover ? 0.35 : 0
      glowMat.current.emissiveIntensity +=
        (target - glowMat.current.emissiveIntensity) * Math.min(1, dt * 10)
    }
  })

  const handleClick = (): void => {
    if (clicked) return
    setClicked(true)
    window.setTimeout(() => onSelect(m.href), 340)
  }

  return (
    <group position={[m.x, 0, m.z]}>
      <group
        ref={grp}
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
          handleClick()
        }}
      >
        {/* 메탈 받침 */}
        <RoundedBox args={[1.72, 0.14, 1.72]} radius={0.06} position={[0, 0.07, 0]}>
          <meshStandardMaterial color="#2a3547" metalness={0.85} roughness={0.3} />
        </RoundedBox>
        {/* LED 점 */}
        <mesh position={[0.62, 0.15, 0.88]}>
          <sphereGeometry args={[0.028, 10, 10]} />
          <meshStandardMaterial
            color="#ff7a3d"
            emissive="#ff7a3d"
            emissiveIntensity={1.6}
            toneMapped={false}
          />
        </mesh>
        {/* 발광판 (클릭 시 시안 글로우) — 유리 아래에서 비침 */}
        <RoundedBox args={[1.3, 0.05, 1.3]} radius={0.08} position={[0, 0.17, 0]}>
          <meshStandardMaterial
            ref={glowMat}
            color="#182234"
            emissive={CYAN}
            emissiveIntensity={0}
            toneMapped={false}
          />
        </RoundedBox>
        {/* 유리 슬랩 — physical transmission (MTM 렌더버그 격리용 임시) */}
        <RoundedBox args={[1.5, 0.34, 1.5]} radius={0.12} position={[0, 0.38, 0]}>
          <meshPhysicalMaterial
            color="#dde6f2"
            metalness={0}
            roughness={0.25}
            transmission={0.9}
            thickness={0.6}
            ior={1.4}
            transparent
            opacity={0.92}
            clearcoat={0.6}
          />
        </RoundedBox>
        {/* 상판 임보싱 아이콘 */}
        <group position={[0, 0.58, 0]}>
          <Icon kind={m.icon} />
        </group>
      </group>

      {/* 라벨 (박스 앞 바닥) — 항상 표시, 실용 */}
      <Html position={[0, 0, 1.28]} center style={{ pointerEvents: 'none' }}>
        <div
          style={{
            textAlign: 'center',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-geist-mono, monospace)',
          }}
        >
          <div style={{ color: '#93a5bd', fontSize: 10, letterSpacing: 1 }}>{m.name}</div>
          <div style={{ color: '#e7eef8', fontSize: 15, fontWeight: 800 }}>{m.value}</div>
        </div>
      </Html>
    </group>
  )
}

function Scene({
  modules,
  onSelect,
}: {
  modules: GlassHubModule[]
  onSelect: (href: string) => void
}): JSX.Element {
  return (
    <>
      <ambientLight intensity={1.35} />
      <directionalLight position={[6, 12, 6]} intensity={2.4} />
      <directionalLight position={[-8, 6, -4]} intensity={0.9} color="#9db8ff" />

      {/* 은은한 바닥 그리드 (Spline 무드) */}
      <Grid
        position={[0, -0.01, 0]}
        args={[60, 60]}
        cellSize={1.3}
        cellThickness={0.5}
        cellColor="#2a3b55"
        sectionSize={6.5}
        sectionThickness={0.9}
        sectionColor="#37507a"
        fadeDistance={38}
        fadeStrength={2}
        infiniteGrid
      />

      {modules.map((m) => (
        <GlassModule key={m.href} m={m} onSelect={onSelect} />
      ))}
    </>
  )
}

export default function GlassHubCanvas({
  modules,
  onSelect,
}: {
  modules: GlassHubModule[]
  onSelect: (href: string) => void
}): JSX.Element {
  return (
    <Canvas
      orthographic
      camera={{ position: [10, 10, 10], zoom: 102, near: 0.1, far: 100 }}
      onCreated={({ camera }) => camera.lookAt(0, 0.3, 0)}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      style={{ position: 'absolute', inset: 0, background: 'transparent' }}
      resize={{ scroll: false, debounce: 0 }}
    >
      <Scene modules={modules} onSelect={onSelect} />
    </Canvas>
  )
}
