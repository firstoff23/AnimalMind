import React, { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { EmotionalState } from "../../../shared/types";

// Map emotional states to the required colors
// happy=verde (#22c55e), calm=azul (#6366f1), anxious=laranja (#f97316), aggressive=vermelho (#ef4444), neutral=cinzento (#94a3b8)
export function getEmotionColor(state: EmotionalState | string): string {
  switch (state) {
    case "excitement":
    case "happy":
      return "#22c55e";
    case "relaxed":
    case "calm":
      return "#6366f1";
    case "hunger":
    case "attention":
    case "anxious":
      return "#f97316";
    case "distress":
    case "aggressive":
      return "#ef4444";
    case "alert":
    case "neutral":
    default:
      return "#94a3b8";
  }
}

// React Error Boundary to catch GLTF loading errors and fallback to primitives
class GLTFErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn("GLTF model failed to load, falling back to primitive geometry:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// 1. Primitive Model for Dog/Cat if GLTF fails or is offline
function PrimitiveAnimal({
  species,
  emotion,
}: {
  species: "dog" | "cat";
  emotion: EmotionalState | string;
}) {
  const bodyRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftEarRef = useRef<THREE.Mesh>(null);
  const rightEarRef = useRef<THREE.Mesh>(null);

  const color = getEmotionColor(emotion);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Breathing animation (subtle scaling of the body)
    if (bodyRef.current) {
      bodyRef.current.scale.y = 1 + Math.sin(t * 2.5) * 0.03;
      bodyRef.current.scale.z = 1 + Math.sin(t * 2.5) * 0.015;
    }

    // Head tilt or shake based on emotion
    if (headRef.current) {
      if (emotion === "distress" || emotion === "aggressive") {
        // Shaking / anxious head tilt
        headRef.current.rotation.y = Math.sin(t * 8) * 0.05;
        headRef.current.rotation.x = Math.sin(t * 3) * 0.05;
      } else if (emotion === "hunger" || emotion === "attention") {
        // Tilted curious head
        headRef.current.rotation.z = 0.15 + Math.sin(t * 1.5) * 0.02;
        headRef.current.rotation.y = 0;
      } else {
        // Calm/happy breathing head movement
        headRef.current.rotation.x = Math.sin(t * 1.2) * 0.02;
        headRef.current.rotation.z = 0;
        headRef.current.rotation.y = 0;
      }
    }

    // Tail wagging animation
    if (tailRef.current) {
      if (emotion === "excitement") {
        // Fast excited wagging
        tailRef.current.rotation.y = Math.sin(t * 15) * 0.5;
        tailRef.current.rotation.x = 0.2;
      } else if (emotion === "relaxed") {
        // Slow calm sway
        tailRef.current.rotation.y = Math.sin(t * 2) * 0.15;
        tailRef.current.rotation.x = -0.2;
      } else if (emotion === "distress" || emotion === "aggressive") {
        // Tucked or stiff tail
        tailRef.current.rotation.y = Math.sin(t * 5) * 0.05;
        tailRef.current.rotation.x = -0.5;
      } else {
        // Normal state
        tailRef.current.rotation.y = Math.sin(t * 3) * 0.1;
        tailRef.current.rotation.x = 0;
      }
    }

    // Ear twitching
    if (leftEarRef.current && rightEarRef.current) {
      if (emotion === "attention" || emotion === "alert") {
        leftEarRef.current.rotation.z = Math.sin(t * 12) * 0.08;
        rightEarRef.current.rotation.z = -Math.sin(t * 12) * 0.08;
      }
    }
  });

  // Adjust posture (body rotation/position) based on emotion/state
  // Relaxed/Calm -> Sitting posture
  const isSitting = emotion === "relaxed";
  
  return (
    <group position={[0, -0.6, 0]}>
      {/* Body Group */}
      <group
        ref={bodyRef}
        position={[0, isSitting ? 0.2 : 0.5, 0]}
        rotation={[isSitting ? -Math.PI / 6 : 0, 0, 0]}
      >
        {/* Main Body */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.4, 0.9]} />
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
        </mesh>

        {/* Neck */}
        <mesh position={[0, 0.3, -0.35]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.25, 0.4, 0.25]} />
          <meshStandardMaterial color={color} roughness={0.4} />
        </mesh>

        {/* Head Group */}
        <group ref={headRef} position={[0, 0.55, -0.45]}>
          {/* Main Head */}
          <mesh castShadow>
            <boxGeometry args={[0.36, 0.34, 0.34]} />
            <meshStandardMaterial color={color} roughness={0.4} />
          </mesh>

          {/* Snout */}
          <mesh position={[0, -0.06, -0.22]}>
            <boxGeometry args={[0.18, 0.14, 0.18]} />
            <meshStandardMaterial color={color} roughness={0.4} />
          </mesh>

          {/* Nose */}
          <mesh position={[0, -0.01, -0.32]}>
            <boxGeometry args={[0.08, 0.06, 0.04]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>

          {/* Eyes */}
          <mesh position={[-0.09, 0.08, -0.18]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshStandardMaterial color={species === "cat" ? "#eab308" : "#0f172a"} roughness={0.1} />
          </mesh>
          <mesh position={[0.09, 0.08, -0.18]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshStandardMaterial color={species === "cat" ? "#eab308" : "#0f172a"} roughness={0.1} />
          </mesh>

          {/* Ears */}
          {species === "dog" ? (
            // Floppy ears
            <>
              <mesh ref={leftEarRef} position={[-0.19, 0.04, 0]} rotation={[0, 0, 0.2]}>
                <boxGeometry args={[0.08, 0.24, 0.12]} />
                <meshStandardMaterial color={color} roughness={0.4} />
              </mesh>
              <mesh ref={rightEarRef} position={[0.19, 0.04, 0]} rotation={[0, 0, -0.2]}>
                <boxGeometry args={[0.08, 0.24, 0.12]} />
                <meshStandardMaterial color={color} roughness={0.4} />
              </mesh>
            </>
          ) : (
            // Pointy ears
            <>
              <mesh ref={leftEarRef} position={[-0.12, 0.22, 0]} rotation={[0, 0, -0.2]}>
                <coneGeometry args={[0.08, 0.16, 4]} />
                <meshStandardMaterial color={color} roughness={0.4} />
              </mesh>
              <mesh ref={rightEarRef} position={[0.12, 0.22, 0]} rotation={[0, 0, 0.2]}>
                <coneGeometry args={[0.08, 0.16, 4]} />
                <meshStandardMaterial color={color} roughness={0.4} />
              </mesh>
            </>
          )}
        </group>

        {/* Tail Group */}
        <group ref={tailRef} position={[0, 0.15, 0.45]}>
          <mesh position={[0, 0.15, 0.15]} rotation={[0.4, 0, 0]}>
            <boxGeometry args={[0.08, 0.35, 0.08]} />
            <meshStandardMaterial color={color} roughness={0.4} />
          </mesh>
        </group>
      </group>

      {/* Legs (Standing vs Sitting positioning) */}
      <group>
        {/* Front Left */}
        <mesh position={[-0.18, isSitting ? 0.15 : 0.25, isSitting ? -0.25 : -0.3]}>
          <boxGeometry args={[0.12, isSitting ? 0.3 : 0.5, 0.12]} />
          <meshStandardMaterial color={color} roughness={0.4} />
        </mesh>
        {/* Front Right */}
        <mesh position={[0.18, isSitting ? 0.15 : 0.25, isSitting ? -0.25 : -0.3]}>
          <boxGeometry args={[0.12, isSitting ? 0.3 : 0.5, 0.12]} />
          <meshStandardMaterial color={color} roughness={0.4} />
        </mesh>
        {/* Back Left */}
        <mesh
          position={[-0.2, isSitting ? 0.1 : 0.25, isSitting ? 0.35 : 0.3]}
          rotation={[isSitting ? Math.PI / 3 : 0, 0, 0]}
        >
          <boxGeometry args={[0.12, isSitting ? 0.3 : 0.5, 0.12]} />
          <meshStandardMaterial color={color} roughness={0.4} />
        </mesh>
        {/* Back Right */}
        <mesh
          position={[0.2, isSitting ? 0.1 : 0.25, isSitting ? 0.35 : 0.3]}
          rotation={[isSitting ? Math.PI / 3 : 0, 0, 0]}
        >
          <boxGeometry args={[0.12, isSitting ? 0.3 : 0.5, 0.12]} />
          <meshStandardMaterial color={color} roughness={0.4} />
        </mesh>
      </group>

      {/* Base Floor shadow helper */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial color="#0f172a" opacity={0.4} transparent />
      </mesh>
    </group>
  );
}

// 2. GLTF Model Loader (Fox placeholder, behaves like Dog/Cat)
function GLTFPlaceholderModel({
  emotion,
}: {
  emotion: EmotionalState | string;
}) {
  // Fox model (representing animal model placeholder)
  const { scene } = useGLTF(
    "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Fox/glTF-Binary/Fox.glb"
  );
  
  const modelRef = useRef<THREE.Group>(null);
  const color = getEmotionColor(emotion);

  // Recolor the model material to reflect current emotion
  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          // Apply state color to materials
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m: any) => {
              if (m instanceof THREE.MeshStandardMaterial) {
                m.color.set(color);
                m.roughness = 0.4;
              }
            });
          } else if (mesh.material instanceof THREE.MeshStandardMaterial) {
            mesh.material.color.set(color);
            mesh.material.roughness = 0.4;
          }
        }
      });
    }
  }, [scene, color]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (modelRef.current) {
      // Breathing idle animation
      modelRef.current.scale.setScalar(0.012 + Math.sin(t * 2) * 0.0003);
      
      // Posture rotation adjustment based on emotion
      if (emotion === "relaxed") {
        modelRef.current.rotation.x = Math.PI / 12; // Sitting down tilt
      } else {
        modelRef.current.rotation.x = 0;
      }
    }
  });

  return (
    <primitive
      ref={modelRef}
      object={scene}
      position={[0, -0.6, 0]}
      rotation={[0, Math.PI / 4, 0]}
    />
  );
}

// Main 3D Canvas component
export default function Animal3DModel({
  species,
  emotion,
}: {
  species: "dog" | "cat";
  emotion: EmotionalState | string;
}) {
  return (
    <div className="w-full h-full min-h-[180px] relative">
      <Canvas
        shadows
        camera={{ position: [0, 1.2, 2.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.5} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={1.8}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[-5, 5, -5]} intensity={0.5} />

        <GLTFErrorBoundary
          fallback={<PrimitiveAnimal species={species} emotion={emotion} />}
        >
          <Suspense fallback={<PrimitiveAnimal species={species} emotion={emotion} />}>
            <GLTFPlaceholderModel emotion={emotion} />
          </Suspense>
        </GLTFErrorBoundary>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}
