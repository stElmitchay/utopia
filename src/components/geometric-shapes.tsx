"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { MeshDistortMaterial } from "@react-three/drei"
import type * as THREE from "three"

export function GeometricShapes() {
  const groupRef = useRef<THREE.Group>(null)
  const torusRef = useRef<THREE.Mesh>(null)
  const boxRef = useRef<THREE.Mesh>(null)
  const sphereRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const time = state.clock.getElapsedTime()

    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.1
    }

    if (torusRef.current) {
      torusRef.current.rotation.x = time * 0.3
      torusRef.current.rotation.z = time * 0.2
    }

    if (boxRef.current) {
      boxRef.current.rotation.x = time * 0.2
      boxRef.current.rotation.y = time * 0.3
    }

    if (sphereRef.current) {
      sphereRef.current.position.y = Math.sin(time * 0.5) * 0.5
    }
  })

  return (
    <group ref={groupRef}>
      {/* Main Torus */}
      <mesh ref={torusRef} position={[2, 0.5, 0]}>
        <torusGeometry args={[1.5, 0.5, 32, 64]} />
        <meshStandardMaterial color="#4ade80" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Floating Box */}
      <mesh ref={boxRef} position={[-2, -1, 1]}>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color="#ffffff" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Distorted Sphere */}
      <mesh ref={sphereRef} position={[0, 2, -1]}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial color="#4ade80" speed={2} distort={0.3} radius={1} />
      </mesh>

      {/* Small decorative elements */}
      <mesh position={[-3, 2, -2]}>
        <octahedronGeometry args={[0.5]} />
        <meshStandardMaterial color="#ffffff" wireframe />
      </mesh>

      <mesh position={[3, -2, -1]}>
        <icosahedronGeometry args={[0.6]} />
        <meshStandardMaterial color="#4ade80" wireframe />
      </mesh>

      {/* Large background plane */}
      <mesh position={[0, 0, -5]} rotation={[0, 0, Math.PI / 4]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#0a0a0a" transparent opacity={0.5} />
      </mesh>
    </group>
  )
}
