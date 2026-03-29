import { useState, useEffect, useRef, useCallback } from 'react';

// Doubly Circular Linked List Structure
class Node {
  constructor(laneId) {
    this.laneId = laneId; 
    this.green = 10;
    this.red = 0;
    this.prev = null;
    this.next = null;
  }
}

class DoublyCircularLinkedList {
  constructor() {
    this.head = null;
  }

  insertAtEnd(laneId) {
    const newNode = new Node(laneId);
    if (!this.head) {
      this.head = newNode;
      newNode.next = newNode;
      newNode.prev = newNode;
    } else {
      const lastNode = this.head.prev;
      newNode.next = this.head;
      newNode.prev = lastNode;
      lastNode.next = newNode;
      this.head.prev = newNode;
    }
  }
}

export function useTrafficLogic() {
  const [phase, setPhase] = useState('N_GREEN');
  const [timeRemaining, setTimeRemaining] = useState(15);
  const [isRunning, setIsRunning] = useState(false);
  const [queues, setQueues] = useState({
    N: { straight: [], turn: [] }, 
    E: { straight: [], turn: [] }, 
    S: { straight: [], turn: [] }, 
    W: { straight: [], turn: [] }  
  });

  // Mutable refs to prevent stale closures during the setInterval tick
  const stateRef = useRef({
      phase: 'N_GREEN',
      timeRemaining: 15,
      activeDir: 'N'
  });
  
  const queuesRef = useRef({
    N: { straight: [], turn: [] }, 
    E: { straight: [], turn: [] }, 
    S: { straight: [], turn: [] }, 
    W: { straight: [], turn: [] }  
  });

  const nextVehicleId = useRef(0);
  const tickRef = useRef(null);
  
  const dcll = useRef(new DoublyCircularLinkedList());
  const currentNode = useRef(null);

  // Initialize DCLL On Mount
  useEffect(() => {
    if (!dcll.current.head) {
      // Rotating N -> E -> S -> W
      ['N', 'E', 'S', 'W'].forEach(dir => dcll.current.insertAtEnd(dir));
      currentNode.current = dcll.current.head;
      
      const initialPhase = `${currentNode.current.laneId}_GREEN`;
      const initialTime = currentNode.current.green;
      
      stateRef.current.phase = initialPhase;
      stateRef.current.timeRemaining = initialTime;
      stateRef.current.activeDir = currentNode.current.laneId;
      
      setPhase(initialPhase);
      setTimeRemaining(initialTime);
      
      console.log(`[System Init] Doubly Circular Linked List created. Starts with Lane: ${currentNode.current.laneId}`);
    }
  }, []);

  const spawnVehicle = useCallback((direction, type, color, subLane) => {
    if (queuesRef.current[direction][subLane].length >= 15) return; // Prevent queue overflow

    const newVehicle = {
       id: nextVehicleId.current++,
       type, 
       color,
       spawnTime: Date.now(),
       subLane
    };

    queuesRef.current = {
       ...queuesRef.current,
       [direction]: {
          ...queuesRef.current[direction],
          [subLane]: [...queuesRef.current[direction][subLane], newVehicle]
       }
    };
    setQueues(queuesRef.current);
  }, []);

  const removeVehicleFromQueue = useCallback((direction, vehicleId) => {
    queuesRef.current = {
      ...queuesRef.current,
      [direction]: {
         straight: queuesRef.current[direction].straight.filter(v => v.id !== vehicleId),
         turn: queuesRef.current[direction].turn.filter(v => v.id !== vehicleId)
      }
    };
    setQueues(queuesRef.current);
  }, []);

  const tick = useCallback(() => {
    // 1. Random vehicle additions
    // Probability per tick: 60% chance to spawn a vehicle
    if (Math.random() > 0.4) {
      const directions = ['N', 'E', 'S', 'W'];
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const types = ['car', 'car', 'suv', 'bus'];
      const colors = ['#ffffff', '#ff2222', '#2222ff', '#aaaaaa', '#111111', '#eecc00'];
      const subLanes = ['straight', 'turn'];
      
      spawnVehicle(
         dir, 
         types[Math.floor(Math.random() * types.length)],
         colors[Math.floor(Math.random() * colors.length)],
         subLanes[Math.floor(Math.random() * subLanes.length)]
      );
    }

    if (!currentNode.current) return;

    let { phase: currentPhase, timeRemaining: currentRemaining, activeDir } = stateRef.current;
    
    // Evaluate traffic clearing logic
    const isGreenPhase = currentPhase.endsWith('_GREEN');
    
    // Vehicles will now be removed visually when they cross the boundary in World.jsx


    // Time evaluation for Phase Transition
    currentRemaining -= 1;

    if (currentRemaining < 0) {
        if (isGreenPhase) {
            // Transition GREEN -> YELLOW
            currentPhase = `${activeDir}_YELLOW`;
            currentRemaining = 3; // Fixed 3 seconds YELLOW phase
        } else {
            // Transition YELLOW -> Next Node GREEN
            currentNode.current = currentNode.current.next; // Advance Linked List
            activeDir = currentNode.current.laneId;
            currentPhase = `${activeDir}_GREEN`;
            
            // Smart Green Time Calculation (weighted by priority/length)
            const qs = queuesRef.current[activeDir];
            const qCount = qs.straight.length + qs.turn.length;
            
            // Priority logic: Base 5s. 1 car = +1.5s
            let calcGreen = Math.floor(qCount * 1.5 + 5); 
            calcGreen = Math.min(30, Math.max(5, calcGreen)); // Minimum 5s, Maximum 30s
            
            currentNode.current.green = calcGreen;
            currentNode.current.red += calcGreen; // updating list prop tracking
            currentRemaining = calcGreen;
        }
    }

    // Update state for next tick synchronously and for React asynchronously
    stateRef.current = { phase: currentPhase, timeRemaining: currentRemaining, activeDir };
    setPhase(currentPhase);
    setTimeRemaining(currentRemaining);
    
    // Visualization/Logging (Formatting cleanly per requirements)
    const qN = queuesRef.current.N.straight.length + queuesRef.current.N.turn.length;
    const qE = queuesRef.current.E.straight.length + queuesRef.current.E.turn.length;
    const qS = queuesRef.current.S.straight.length + queuesRef.current.S.turn.length;
    const qW = queuesRef.current.W.straight.length + queuesRef.current.W.turn.length;

    console.log(
      `[Traffic Log] Active Lane: %c${activeDir}%c | Signal: %c${currentPhase.split('_')[1]}%c | Time Left: ${currentRemaining}s | ` +
      `Vehicles (N:${qN}, E:${qE}, S:${qS}, W:${qW})`,
      'font-weight: bold;', '',
      `color: ${currentPhase.includes('GREEN') ? 'green' : (currentPhase.includes('YELLOW') ? 'orange' : 'red')}; font-weight: bold;`, ''
    );

  }, [spawnVehicle]);

  // Hook run loop
  useEffect(() => {
    if (isRunning) {
      tickRef.current = setInterval(tick, 1000);
    } else if (tickRef.current) {
      clearInterval(tickRef.current);
    }
    return () => clearInterval(tickRef.current);
  }, [isRunning, tick]);

  const toggleSimulation = () => setIsRunning(prev => !prev);
  
  useEffect(() => {
     spawnVehicle('N', 'car', '#ff0000', 'straight');
     spawnVehicle('E', 'suv', '#0000ff', 'turn');
     spawnVehicle('S', 'car', '#00ff00', 'straight');
     spawnVehicle('W', 'bus', '#ffffff', 'straight');
  }, [spawnVehicle]);

  // Combine inner queues to return a flat 1D array per direction, preserving visualization
  const getVisualQueue = (dir) => {
      const q = queues[dir];
      // Sorting by spawnTime ensures they maintain FIFO visuals perfectly in World.jsx
      return [...q.straight, ...q.turn].sort((a,b) => a.spawnTime - b.spawnTime);
  };
  
  return { 
    phase, 
    timeRemaining, 
    isRunning, 
    toggleSimulation,
    queues: {
       N: getVisualQueue('N'),
       E: getVisualQueue('E'),
       S: getVisualQueue('S'),
       W: getVisualQueue('W')
    },
    removeVehicleFromQueue
  };
}
