import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

function Tree({ position, scale = 1 }) {
  const trunkHeight = 1.5 * scale;
  const leavesSize = 2.5 * scale;
  return (
    <group position={position}>
      <mesh castShadow position={[0, trunkHeight / 2, 0]}>
        <cylinderGeometry args={[0.2 * scale, 0.3 * scale, trunkHeight, 8]} />
        <meshStandardMaterial color="#4d3319" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, trunkHeight + leavesSize / 2 - 0.5 * scale, 0]}>
        <dodecahedronGeometry args={[leavesSize / 2, 1]} />
        <meshStandardMaterial color="#2d5e1e" roughness={0.8} />
      </mesh>
    </group>
  );
}

function EnvironmentDetails() {
  const trees = useMemo(() => {
    const t = [];
    const minD = 15;
    const maxD = 40;
    for (let i = 0; i < 60; i++) {
        const x = (Math.random() > 0.5 ? 1 : -1) * (minD + Math.random() * (maxD - minD));
        const z = (Math.random() > 0.5 ? 1 : -1) * (minD + Math.random() * (maxD - minD));
        const scale = 0.5 + Math.random() * 0.8;
        t.push({ position: [x, 0, z], scale });
    }
    return t;
  }, []);

  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]}>
        <planeGeometry args={[150, 150]} />
        <meshStandardMaterial color="#3a5f2d" roughness={1} />
      </mesh>
      {trees.map((t, i) => <Tree key={i} position={t.position} scale={t.scale} />)}
    </group>
  );
}

function VehicleModel({ type, color }) {
  if (type === 'bus') {
    return (
      <group position={[0, 1.2, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.8, 2, 6]} />
          <meshStandardMaterial color={color} roughness={0.2} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[1.85, 0.8, 5.8]} />
          <meshStandardMaterial color="#111" roughness={0.1} metalness={0.9} />
        </mesh>
      </group>
    );
  }
  if (type === 'suv') {
    return (
      <group position={[0, 0.7, 0]}>
        <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
          <boxGeometry args={[1.6, 0.8, 3.8]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh castShadow position={[0, 0.5, -0.2]}>
          <boxGeometry args={[1.5, 0.8, 2.2]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.5, -0.2]}>
          <boxGeometry args={[1.55, 0.7, 2.1]} />
          <meshStandardMaterial color="#111" roughness={0.1} metalness={0.9} />
        </mesh>
      </group>
    );
  }
  return (
    <group position={[0, 0.5, 0]}>
      <mesh castShadow receiveShadow position={[0, -0.1, 0]}>
        <boxGeometry args={[1.5, 0.6, 3.2]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.6} />
      </mesh>
      <mesh castShadow position={[0, 0.4, -0.1]}>
        <boxGeometry args={[1.3, 0.6, 1.5]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.4, -0.1]}>
        <boxGeometry args={[1.35, 0.5, 1.4]} />
        <meshStandardMaterial color="#111" roughness={0.1} metalness={0.9} />
      </mesh>
    </group>
  );
}

function LaneVehicles({ queue, signalState, layout, directionId, removeVehicle }) {
  const meshRefs = useRef({});
  const posData = useRef({});

  React.useEffect(() => {
    const currentIds = new Set(queue.map(v => v.id));
    Object.keys(posData.current).forEach(id => {
      if (!currentIds.has(Number(id))) {
        delete posData.current[id];
        delete meshRefs.current[id];
      }
    });
  }, [queue]);

  const getBumperOffset = (type) => {
    if (type === 'bus') return 3.0;
    if (type === 'suv') return 1.9;
    return 1.6;
  };

  useFrame((state, delta) => {
    const speed = 15; 
    const stopLineWorldZ = -6.0; 
    
    queue.forEach((v, index) => {
      let pData = posData.current[v.id];
      if (!pData) {
         pData = { z: -50 }; 
         posData.current[v.id] = pData;
      }
      
      let bounds = Infinity;
      const bumperOffset = getBumperOffset(v.type);
      const stopTarget = stopLineWorldZ - bumperOffset - 0.2; 
      
      if (signalState !== 'GREEN' && pData.z <= stopTarget) {
          bounds = stopTarget;
      }
      
      if (index > 0) {
         const frontVehicle = queue[index - 1];
         const frontPData = posData.current[frontVehicle.id];
         if (frontPData) {
             const spacing = frontVehicle.type === 'bus' ? 6.5 : 5.0;
             bounds = Math.min(bounds, frontPData.z - spacing);
         }
      }
      
      if (pData.z < bounds) {
          pData.z += speed * delta;
          if (pData.z > bounds) pData.z = bounds;
      }
      
      if (pData.z > 50 && !pData.removed) {
          removeVehicle(directionId, v.id);
          pData.removed = true;
      }
      
      const mesh = meshRefs.current[v.id];
      if (mesh) {
          mesh.position.z = pData.z;
          mesh.position.y = (pData.z < bounds) ? Math.sin(pData.z * 3) * 0.04 : 0;
      }
    });
  });

  return (
    <group position={layout.startPos} rotation={layout.rotation}>
      {queue.map((v) => (
        <group key={v.id} ref={(r) => (meshRefs.current[v.id] = r)} position={[0, 0, -50]}>
          <VehicleModel type={v.type} color={v.color} />
          {[-0.8, 0.8].map((x, i) =>
            [-1.2, 1.2].map((z, j) => (
              <mesh key={`${i}-${j}`} position={[x, 0.3, z]} castShadow>
                <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} rotation={[0, 0, Math.PI/2]} />
                <meshStandardMaterial color="#222" />
              </mesh>
            ))
          )}
        </group>
      ))}
    </group>
  );
}

function TrafficLight({ position, rotation, signalState }) {
  const isRed = signalState === 'RED';
  const isYellow = signalState === 'YELLOW';
  const isGreen = signalState === 'GREEN';

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 3, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 8]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0.5, 6, 0]} castShadow>
        <boxGeometry args={[0.8, 2.5, 0.8]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0.9, 6.8, 0]}>
         <sphereGeometry args={[0.25, 16, 16]} />
         <meshStandardMaterial color={isRed ? "#ff2222" : "#330000"} emissive={isRed ? "#ff2222" : "#000000"} emissiveIntensity={isRed ? 2: 0} />
      </mesh>
      <mesh position={[0.9, 6.0, 0]}>
         <sphereGeometry args={[0.25, 16, 16]} />
         <meshStandardMaterial color={isYellow ? "#ffcc00" : "#333300"} emissive={isYellow ? "#ffcc00" : "#000000"} emissiveIntensity={isYellow ? 2: 0} />
      </mesh>
      <mesh position={[0.9, 5.2, 0]}>
         <sphereGeometry args={[0.25, 16, 16]} />
         <meshStandardMaterial color={isGreen ? "#22ff22" : "#003300"} emissive={isGreen ? "#22ff22" : "#000000"} emissiveIntensity={isGreen ? 2: 0} />
      </mesh>
    </group>
  );
}

function TexturedRoad() {
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#2a2e33" roughness={0.9} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[12, 100]} />
        <meshStandardMaterial color="#1d2024" roughness={0.8} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[100, 12]} />
        <meshStandardMaterial color="#1d2024" roughness={0.8} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#181a1d" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.1, 0.01, 24]}>
        <planeGeometry args={[0.1, 36]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.1, 0.01, 24]}>
        <planeGeometry args={[0.1, 36]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.1, 0.01, -24]}>
        <planeGeometry args={[0.1, 36]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.1, 0.01, -24]}>
        <planeGeometry args={[0.1, 36]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[24, 0.01, 0.1]}>
        <planeGeometry args={[36, 0.1]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[24, 0.01, -0.1]}>
        <planeGeometry args={[36, 0.1]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-24, 0.01, 0.1]}>
        <planeGeometry args={[36, 0.1]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-24, 0.01, -0.1]}>
        <planeGeometry args={[36, 0.1]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -6]}>
         <planeGeometry args={[12, 0.2]} />
         <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 6]}>
         <planeGeometry args={[12, 0.2]} />
         <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6, 0.02, 0]}>
         <planeGeometry args={[0.2, 12]} />
         <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-6, 0.02, 0]}>
         <planeGeometry args={[0.2, 12]} />
         <meshStandardMaterial color="#ffffff" />
      </mesh>
      {[-5, -3, -1, 1, 3, 5].map((x, i) => (
         <mesh key={`n_z_${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, -7.5]}>
            <planeGeometry args={[0.8, 2]} />
            <meshStandardMaterial color="#ffffff" />
         </mesh>
      ))}
      {[-5, -3, -1, 1, 3, 5].map((x, i) => (
         <mesh key={`s_z_${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, 7.5]}>
            <planeGeometry args={[0.8, 2]} />
            <meshStandardMaterial color="#ffffff" />
         </mesh>
      ))}
      {[-5, -3, -1, 1, 3, 5].map((z, i) => (
         <mesh key={`e_z_${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[7.5, 0.02, z]}>
            <planeGeometry args={[2, 0.8]} />
            <meshStandardMaterial color="#ffffff" />
         </mesh>
      ))}
      {[-5, -3, -1, 1, 3, 5].map((z, i) => (
         <mesh key={`w_z_${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-7.5, 0.02, z]}>
            <planeGeometry args={[2, 0.8]} />
            <meshStandardMaterial color="#ffffff" />
         </mesh>
      ))}
      <EnvironmentDetails />
    </group>
  );
}

export default function World({ logic }) {
  const { phase, queues, removeVehicleFromQueue } = logic;

  const getSignalState = (dir) => {
     if (phase === `${dir}_GREEN`) return 'GREEN';
     if (phase === `${dir}_YELLOW`) return 'YELLOW';
     return 'RED';
  };

  const lanesLayout = {
    N: {
      color: "#06b6d4",
      startPos: [-3, 0, 0],
      rotation: [0, 0, 0],
      lightPos: [-8, 0, -8],
      lightRot: [0, Math.PI / 2, 0]
    },
    S: {
      color: "#10b981",
      startPos: [3, 0, 0],
      rotation: [0, Math.PI, 0],
      lightPos: [8, 0, 8],
      lightRot: [0, -Math.PI / 2, 0]
    },
    E: {
      color: "#f59e0b",
      startPos: [0, 0, -3],
      rotation: [0, -Math.PI / 2, 0],
      lightPos: [8, 0, -8],
      lightRot: [0, Math.PI, 0]
    },
    W: {
      color: "#ef4444",
      startPos: [0, 0, 3],
      rotation: [0, Math.PI / 2, 0],
      lightPos: [-8, 0, 8],
      lightRot: [0, 0, 0]
    }
  };

  return (
    <div className="canvas-container">
      <Canvas shadows camera={{ position: [30, 25, 30], fov: 45 }}>
        <color attach="background" args={['#8fb3ce']} />
        <ambientLight intensity={0.6} color="#e0f0ff" />
        <directionalLight castShadow position={[40, 50, 20]} intensity={1.2} color="#fffaed" />
        <pointLight position={[0, 15, 0]} intensity={1.5} color="#fff" distance={40} />
        <TexturedRoad />
        {Object.keys(lanesLayout).map((dirId) => {
          const layout = lanesLayout[dirId];
          const signalState = getSignalState(dirId);
          const queue = queues[dirId] || [];
          return (
            <group key={dirId}>
              <TrafficLight position={layout.lightPos} rotation={layout.lightRot} signalState={signalState} />
              <LaneVehicles queue={queue} signalState={signalState} layout={layout} directionId={dirId} removeVehicle={removeVehicleFromQueue} />
            </group>
          );
        })}
        <ContactShadows position={[0, -0.09, 0]} opacity={0.5} scale={80} blur={2.5} far={4.5} />
        <OrbitControls makeDefault autoRotate autoRotateSpeed={0.3} maxPolarAngle={Math.PI / 2.2} />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
