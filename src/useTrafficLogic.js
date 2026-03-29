import { useState, useEffect, useRef, useCallback } from "react";

// ✅ Only ONE direction active at a time
const PHASES = ["N_GREEN", "N_YELLOW", "S_GREEN", "S_YELLOW", "E_GREEN", "E_YELLOW", "W_GREEN", "W_YELLOW"];

export function useTrafficLogic() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(10);
  const [isRunning, setIsRunning] = useState(false);

  const [queues, setQueues] = useState({
    N: { left: [], straight: [], right: [] },
    S: { left: [], straight: [], right: [] },
    E: { left: [], straight: [], right: [] },
    W: { left: [], straight: [], right: [] }
  });

  const nextVehicleId = useRef(0);
  const tickRef = useRef(null);

  // 🚗 Spawn vehicle in random lane
  const spawnVehicle = useCallback((direction, type, color) => {
    const laneTypes = ["left", "straight", "right"];
    const lane = laneTypes[Math.floor(Math.random() * 3)];

    setQueues(prev => ({
      ...prev,
      [direction]: {
        ...prev[direction],
        [lane]: [
          ...prev[direction][lane],
          {
            id: nextVehicleId.current++,
            type,
            color,
            spawnTime: Date.now()
          }
        ]
      }
    }));
  }, []);

  // ❌ Remove vehicle
  const removeVehicleFromQueue = useCallback((direction, laneType, vehicleId) => {
    setQueues(prev => ({
      ...prev,
      [direction]: {
        ...prev[direction],
        [laneType]: prev[direction][laneType].filter(v => v.id !== vehicleId)
      }
    }));
  }, []);

  const getLaneCount = (dir) =>
    queues[dir].left.length +
    queues[dir].straight.length +
    queues[dir].right.length;

  const tick = useCallback(() => {
    const currentPhase = PHASES[phaseIndex];

    // 🚗 Random spawning
    if (Math.random() > 0.6) {
      const directions = ["N", "S", "E", "W"];
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const types = ["car", "car", "suv", "bus"];
      const colors = ["#fff", "#f00", "#00f", "#aaa", "#111", "#eecc00"];

      spawnVehicle(
        dir,
        types[Math.floor(Math.random() * types.length)],
        colors[Math.floor(Math.random() * colors.length)]
      );
    }

    if (timeRemaining <= 1) {
      const nextIndex = (phaseIndex + 1) % PHASES.length;
      const nextPhase = PHASES[nextIndex];
      setPhaseIndex(nextIndex);

      // 🟡 Yellow phase
      if (nextPhase.includes("YELLOW")) {
        setTimeRemaining(3);
      } 
      // 🟢 Green phase → dynamic timing per direction
      else {
        const dir = nextPhase[0]; // N / S / E / W
        const cars = getLaneCount(dir);

        setTimeRemaining(Math.min(25, Math.max(6, cars * 2 + 3)));
      }
    } else {
      setTimeRemaining(prev => prev - 1);
    }
  }, [phaseIndex, timeRemaining, spawnVehicle, queues]);

  useEffect(() => {
    if (isRunning) {
      tickRef.current = setInterval(tick, 1000);
    } else {
      clearInterval(tickRef.current);
    }
    return () => clearInterval(tickRef.current);
  }, [isRunning, tick]);

  const toggleSimulation = () => setIsRunning(prev => !prev);

  useEffect(() => {
    spawnVehicle("N", "car", "#ff0000");
    spawnVehicle("S", "suv", "#0000ff");
    spawnVehicle("E", "bus", "#ffffff");
  }, [spawnVehicle]);

  return {
    phase: PHASES[phaseIndex],
    timeRemaining,
    isRunning,
    toggleSimulation,
    queues,
    removeVehicleFromQueue
  };
}