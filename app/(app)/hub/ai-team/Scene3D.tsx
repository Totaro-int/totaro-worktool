'use client'

import { Suspense, useMemo, useState } from 'react'
import type { JSX } from 'react'

import { useGLTF, OrbitControls, ContactShadows, Html } from '@react-three/drei'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { useRouter } from 'next/navigation'
import * as THREE from 'three'

import type { Desk } from './page'

const MODELS = ['/models/object_0.glb', '/models/object_1.glb', '/models/object_2.glb']
MODELS.forEach((m) => useGLTF.preload(m))

// 빈 방 배경(렌더)의 바닥에 맞춘 책상 자리 — 카메라/좌표는 스크린샷 보며 튜닝.
// 원본처럼 책상 3개를 전부 같은 방향(평행)으로, 계단식(echelon)으로 둔다 — 자연스러운 오픈오피스.
const FACE = 2.95
const SLOTS: { pos: [number, number, number]; rot: number }[] = [
  { pos: [-1.78, 0, -1.48], rot: FACE }, // 김사현 — 위 원(뒤-중앙)
  { pos: [3.7, 0, 0.4], rot: FACE }, // 최지안 — 오른쪽 원(캐비닛 앞 열린 바닥)
  { pos: [-0.41, 0, 5.75], rot: FACE }, // 심재학 — 왼쪽 원(앞-좌)
]

function Workstation({
  url,
  desk,
  slot,
  onPick,
  labelScale,
}: {
  url: string
  desk: Desk
  slot: { pos: [number, number, number]; rot: number }
  onPick: (slug: string) => void
  labelScale: number
}): JSX.Element {
  const { scene } = useGLTF(url)
  const [hover, setHover] = useState(false)

  const obj = useMemo(() => {
    const c = scene.clone(true)
    c.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = false
        // 재질을 복제해 원본(밝은 톤)에 가깝게 살짝 밝힌다
        const src = m.material as THREE.MeshStandardMaterial
        if (src?.clone) {
          const mat = src.clone()
          mat.color.multiplyScalar(1.2)
          if (mat.emissive && mat.map) {
            // 텍스처를 emissive 로도 깔아 배경의 밝은 톤과 맞추고 어떤 각도에서도 안 어둡게
            mat.emissive = new THREE.Color('#ffffff').multiplyScalar(0.44)
            mat.emissiveMap = mat.map
          }
          m.material = mat
        }
      }
    })
    c.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(c)
    const size = new THREE.Vector3()
    box.getSize(size)
    const s = 3.5 / (size.y || 1)
    c.scale.setScalar(s)
    c.updateMatrixWorld(true)
    const box2 = new THREE.Box3().setFromObject(c)
    c.position.set(-(box2.min.x + box2.max.x) / 2, -box2.min.y, -(box2.min.z + box2.max.z) / 2)
    return c
  }, [scene])

  const active = desk.workingNow

  return (
    <group
      position={slot.pos}
      rotation={[0, slot.rot, 0]}
      onClick={(e) => {
        e.stopPropagation()
        onPick(desk.slug)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHover(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHover(false)
        document.body.style.cursor = 'default'
      }}
    >
      <group scale={hover ? 1.035 : 1}>
        <primitive object={obj} />
      </group>

      {hover && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[2.5, 2.85, 56]} />
          <meshBasicMaterial color="#6366f1" transparent opacity={0.55} />
        </mesh>
      )}

      <Html position={[0, 3.8, 0]} center style={{ pointerEvents: 'none' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            whiteSpace: 'nowrap',
            background: '#fff',
            borderRadius: 999,
            padding: '5px 12px',
            boxShadow: '0 6px 18px rgba(60,50,30,0.22)',
            transform: `scale(${labelScale})`,
            transformOrigin: 'center',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: active ? '#6366f1' : '#cbd5e1',
            }}
          />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1f2937' }}>{desk.name}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: active ? '#6366f1' : '#94a3b8' }}>
            {active ? '근무' : '대기'}
          </span>
        </div>
      </Html>
    </group>
  )
}

// 직교 zoom 은 픽셀 단위라 캔버스 너비에 비례시켜야 배경 렌더와 어느 크기에서도 정렬된다.
// 매 프레임 강제로 맞춰 첫 프레임/리사이즈에서도 어긋나지 않게 한다.
function ResponsiveZoom(): null {
  // 카메라/사이즈는 프레임 state 에서 읽어 직접 갱신한다.
  // (useThree() 반환값을 mutate 하면 react-hooks/immutability 에 걸린다 — R3F 정상 패턴이지만 우회)
  useFrame((state) => {
    const cam = state.camera as THREE.OrthographicCamera
    const target = state.size.width * 0.047
    if (Math.abs(cam.zoom - target) > 0.05) {
      cam.zoom = target
      cam.updateProjectionMatrix()
    }
  })
  return null
}

function Scene({ desks }: { desks: Desk[] }): JSX.Element {
  const router = useRouter()
  const { size } = useThree()
  const labelScale = Math.min(1, Math.max(0.55, size.width / 1060))
  const ordered = useMemo(() => {
    const order = ['kim-sahyun', 'choi-jian', 'sim-jaehak']
    return [...desks].sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug)).slice(0, 3)
  }, [desks])

  return (
    <>
      {/* 카메라는 Canvas orthographic prop 으로 잡음. 배경이 정지 렌더라 회전 비활성. */}
      <ResponsiveZoom />
      <OrbitControls
        target={[0, 0.7, 0]}
        enableRotate={false}
        enableZoom={false}
        enablePan={false}
      />

      {/* 밝고 따뜻한 방 조명에 맞춤 (창=좌상단) */}
      <hemisphereLight args={['#ffffff', '#f3eee5', 1.75]} />
      <ambientLight intensity={1.75} />
      <directionalLight
        position={[-7, 13, 5]}
        intensity={0.5}
        color="#fff8ef"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0004}
      />

      {/* 정면 필 라이트 — 카메라 쪽에서 부드럽게 채워 뒷면이 어둡지 않게 (그림자 X) */}
      <directionalLight position={[9, 6, 11]} intensity={0.8} color="#ffffff" />
      <directionalLight position={[2, 4, -9]} intensity={0.35} color="#fff3e2" />

      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.11}
        scale={22}
        blur={4.6}
        far={6}
        color="#9a8a70"
      />

      <Suspense fallback={null}>
        {ordered.map((d, i) => (
          <Workstation
            key={d.slug}
            url={MODELS[i]}
            desk={d}
            slot={SLOTS[i]}
            labelScale={labelScale}
            onPick={(s) => router.push(`/hub/ai-team/${s}`)}
          />
        ))}
      </Suspense>
    </>
  )
}

export default function Scene3D({ desks }: { desks: Desk[] }): JSX.Element {
  return (
    <Canvas
      orthographic
      flat
      shadows
      dpr={[1, 2]}
      camera={{ position: [10, 7.6, 10], zoom: 52, near: -100, far: 300 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <Scene desks={desks} />
    </Canvas>
  )
}
