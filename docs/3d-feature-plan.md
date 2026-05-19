# 3D 블록 배치 시스템 설계

> **목표:** React Three Fiber를 사용한 3D 블록 배치 시스템 구현
> **작성일:** 2026-05-18

---

## 🎯 개요

totaro-worktool에 3D 블록 배치 기능을 추가하여 업무를 시각적으로 관리합니다.

### 핵심 아이디어

```
할 일(Task) = 3D 블록
드래그 앤 드롭으로 블록 배치
블록 색상 = 사업영역
블록 높이 = 우선순위
블록 위치 = 공간상 배치 (사용자 정의)
```

---

## 🏗️ 기술 스택

```json
{
  "@react-three/fiber": "^9.6.1", // Three.js React 래퍼
  "@react-three/drei": "^10.7.7", // R3F 헬퍼 (카메라, 조명 등)
  "three": "^0.184.0" // Three.js 코어
}
```

---

## 📐 화면 구조

### 1. 3D 에디터 페이지 (`/3d-editor`)

```
┌──────────────────────────────────────────┐
│  🏠 Home | 📊 Dashboard | 🎨 3D Editor  │ ← 네비게이션
├──────────────────────────────────────────┤
│                                          │
│   [3D Canvas - WebGL 렌더링 영역]        │
│                                          │
│   ┌────┐  ┌────┐  ┌────┐              │
│   │ AI │  │ B2B│  │에이│              │
│   │브랜│  │소싱│  │전트│              │
│   └────┘  └────┘  └────┘              │
│                                          │
│   드래그 앤 드롭으로 블록 배치             │
│                                          │
├──────────────────────────────────────────┤
│  🎮 컨트롤:                              │
│  [+ 블록 추가] [💾 저장] [🔄 초기화]     │
└──────────────────────────────────────────┘
```

### 2. 할 일 보드 3D 모드 (`/tasks?mode=3d`)

기존 칸반 보드에 3D 토글 버튼 추가

```
[📋 리스트 뷰] [🎨 3D 뷰] ← 토글
```

---

## 🎨 3D 블록 디자인

### 블록 속성

```typescript
interface Block3D {
  id: string // 할 일 ID
  title: string // 제목
  workArea: string // 사업영역 (색상 결정)
  priority: 'low' | 'medium' | 'high' // 높이 결정
  position: [x, y, z] // 3D 공간 위치
  rotation: [x, y, z] // 회전 (선택)
  scale: [x, y, z] // 크기
}
```

### 색상 매핑

```typescript
const WORK_AREA_COLORS = {
  ai_branding: '#6366f1', // 인디고
  b2b_sourcing: '#10b981', // 에메랄드
  ai_agent: '#f59e0b', // 앰버
}
```

### 크기 매핑

```typescript
const PRIORITY_HEIGHT = {
  low: 1, // 낮은 블록
  medium: 2, // 중간 블록
  high: 3, // 높은 블록
}
```

---

## 🛠️ 컴포넌트 구조

```
components/
├── 3d/
│   ├── Canvas3D.tsx          # R3F Canvas 래퍼
│   ├── Block.tsx             # 단일 블록 컴포넌트
│   ├── BlockGrid.tsx         # 블록 그리드 시스템
│   ├── CameraControls.tsx    # 카메라 컨트롤 (OrbitControls)
│   ├── Lights.tsx            # 조명 설정
│   ├── Ground.tsx            # 바닥 그리드
│   └── DragControls.tsx      # 드래그 앤 드롭
│
app/
├── (app)/
│   ├── 3d-editor/
│   │   ├── page.tsx          # 3D 에디터 메인 페이지
│   │   └── actions.ts        # 블록 저장/로드
│   └── tasks/
│       └── page.tsx          # 3D 모드 토글 추가
```

---

## 📝 컴포넌트 상세 설계

### 1. Canvas3D.tsx (메인 캔버스)

```typescript
'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'

export function Canvas3D({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full">
      <Canvas
        camera={{ position: [10, 10, 10], fov: 50 }}
        shadows
      >
        {/* 조명 */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />

        {/* 카메라 컨트롤 */}
        <OrbitControls />

        {/* 그리드 바닥 */}
        <Grid args={[20, 20]} />

        {/* 실제 3D 콘텐츠 */}
        {children}
      </Canvas>
    </div>
  )
}
```

### 2. Block.tsx (3D 블록)

```typescript
'use client'

import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import type { Mesh } from 'three'

interface BlockProps {
  id: string
  title: string
  color: string
  position: [number, number, number]
  height: number
  onDrag?: (position: [number, number, number]) => void
  onClick?: () => void
}

export function Block({
  title,
  color,
  position,
  height,
  onDrag,
  onClick
}: BlockProps) {
  const meshRef = useRef<Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const [active, setActive] = useState(false)

  // 호버 시 애니메이션
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.y = hovered ? height * 1.1 : height
    }
  })

  return (
    <group position={position}>
      {/* 블록 메시 */}
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[1, height, 1]} />
        <meshStandardMaterial
          color={hovered ? '#ffffff' : color}
          emissive={hovered ? color : '#000000'}
          emissiveIntensity={hovered ? 0.3 : 0}
        />
      </mesh>

      {/* 텍스트 라벨 */}
      <Text
        position={[0, height + 0.5, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {title}
      </Text>
    </group>
  )
}
```

### 3. BlockGrid.tsx (블록 그리드)

```typescript
'use client'

import { Block } from './Block'
import type { Task } from '@/lib/types'

interface BlockGridProps {
  tasks: Task[]
  onBlockClick?: (taskId: string) => void
  onBlockMove?: (taskId: string, position: [number, number, number]) => void
}

const WORK_AREA_COLORS = {
  'ai_branding': '#6366f1',
  'b2b_sourcing': '#10b981',
  'ai_agent': '#f59e0b',
}

const PRIORITY_HEIGHT = {
  'low': 1,
  'medium': 2,
  'high': 3,
}

export function BlockGrid({ tasks, onBlockClick, onBlockMove }: BlockGridProps) {
  return (
    <>
      {tasks.map((task, index) => (
        <Block
          key={task.id}
          id={task.id}
          title={task.title}
          color={WORK_AREA_COLORS[task.work_area_id as keyof typeof WORK_AREA_COLORS]}
          position={task.position_3d || [index * 2, 0, 0]} // 기본 위치
          height={PRIORITY_HEIGHT[task.priority as keyof typeof PRIORITY_HEIGHT]}
          onClick={() => onBlockClick?.(task.id)}
          onDrag={(pos) => onBlockMove?.(task.id, pos)}
        />
      ))}
    </>
  )
}
```

---

## 💾 데이터베이스 스키마 확장

### tasks 테이블에 3D 위치 추가

```sql
ALTER TABLE tasks
ADD COLUMN position_3d JSONB DEFAULT '[0, 0, 0]';

-- 예시 데이터
UPDATE tasks
SET position_3d = '[2.0, 0.0, 1.5]'
WHERE id = 'some-task-id';
```

---

## 🎮 인터랙션 설계

### 1. 블록 드래그 앤 드롭

```typescript
// DragControls.tsx
import { DragControls as DreiDragControls } from '@react-three/drei'

export function DragControls({ children, onDrag }) {
  return (
    <DreiDragControls onDrag={(e) => onDrag(e.object.position)}>
      {children}
    </DreiDragControls>
  )
}
```

### 2. 블록 클릭 → 할 일 상세

클릭 시 우측 사이드바에 할 일 상세 표시

```
┌─────────────┬─────────────┐
│             │  📝 할 일    │
│   3D Canvas │  제목: ...  │
│             │  설명: ...  │
│             │  [완료]     │
└─────────────┴─────────────┘
```

### 3. 카메라 컨트롤

- **마우스 휠**: 줌 인/아웃
- **좌클릭 + 드래그**: 카메라 회전
- **우클릭 + 드래그**: 카메라 이동

---

## 🚀 개발 단계

### Phase 4.1: 기본 3D 환경 (1시간)

```
✅ Canvas3D 컴포넌트
✅ 조명 및 카메라 설정
✅ 그리드 바닥
✅ 단일 블록 테스트
```

### Phase 4.2: 블록 시스템 (1시간)

```
✅ Block 컴포넌트 (색상, 높이)
✅ BlockGrid 컴포넌트 (여러 블록)
✅ 호버 효과
✅ 클릭 이벤트
```

### Phase 4.3: 드래그 앤 드롭 (1시간)

```
✅ 블록 드래그 구현
✅ 위치 저장 (DB)
✅ 충돌 감지 (선택)
```

### Phase 4.4: UI 통합 (30분)

```
✅ /3d-editor 페이지 생성
✅ 네비게이션 추가
✅ 저장/로드 기능
```

---

## 🎨 예시 화면 (와이어프레임)

### 3D 에디터

```
     Y (위)
     |
     |   ┌─────┐
     |   │ 높음 │ (빨강, 높이 3)
     |   └─────┘
     |  ┌─────┐
     | │ 중간 │ (파랑, 높이 2)
     | └─────┘
     |┌─────┐
     ││ 낮음 │ (초록, 높이 1)
     |└─────┘
     └──────────────── X (앞)
    /
   / Z (옆)
```

---

## 📊 성능 최적화

### 1. 블록 수 제한

- 최대 100개 블록까지 렌더링
- 초과 시 페이지네이션

### 2. LOD (Level of Detail)

```typescript
import { Lod } from '@react-three/drei'

// 카메라 거리에 따라 디테일 조정
<Lod distances={[0, 10, 20]}>
  <DetailedBlock />  // 가까이
  <SimpleBlock />    // 중간
  <Placeholder />    // 멀리
</Lod>
```

### 3. Instanced Mesh

동일한 블록이 많을 경우 Instancing 사용

---

## 🔗 통합 포인트

### 1. 할 일 보드 연동

```typescript
// app/(app)/tasks/page.tsx
const [viewMode, setViewMode] = useState<'kanban' | '3d'>('kanban')

return (
  <div>
    <button onClick={() => setViewMode('3d')}>3D 보기</button>

    {viewMode === 'kanban' ? (
      <KanbanBoard tasks={tasks} />
    ) : (
      <Canvas3D>
        <BlockGrid tasks={tasks} />
      </Canvas3D>
    )}
  </div>
)
```

### 2. 활동 피드 연동

새 할 일 완료 시 블록 애니메이션 (선택)

---

## ✅ 최소 기능 (MVP)

- ✅ 3D 캔버스 렌더링
- ✅ 블록 표시 (색상, 높이)
- ✅ 카메라 컨트롤
- ✅ 블록 클릭 → 상세 보기
- ⏸️ 드래그 앤 드롭 (시간 있으면)
- ⏸️ 위치 저장 (시간 있으면)

---

## ⏰ 예상 소요 시간

| 작업           | 예상 시간   |
| -------------- | ----------- |
| 기본 3D 환경   | 1시간       |
| 블록 시스템    | 1시간       |
| 드래그 앤 드롭 | 1시간       |
| UI 통합        | 30분        |
| **총합**       | **3.5시간** |

---

## 🎯 우선순위

1. **Phase 1~3 먼저 완성** (업무 관리 기능)
2. **Phase 4 추가** (3D 기능)

시간이 부족하면 Phase 4는 내일로 연기 가능!

---

**React Three Fiber는 Next.js와 완벽하게 호환되며, Vercel에 바로 배포 가능합니다!** 🚀
