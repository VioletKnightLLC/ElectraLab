// Interactive Chip Design Lab content — floorplan geometry, descriptions,
// datapath stages, zoom ladder captions, and sandbox physics constants.
// All offline; no network required.

export const DIE_BLOCKS = [
  {
    id: 'control',
    name: 'Control Unit',
    short: 'Decodes instructions and orchestrates every other block.',
    rect: { x: 140, y: 110, w: 140, h: 80 },
    transistors: '~50 M',
    physics: 'Built from combinational logic gates — each gate is a handful of CMOS transistors (the MOSFETs of Unit 14) steering signals through the die.',
  },
  {
    id: 'regfile',
    name: 'Register File',
    short: 'The fastest memory on the chip — a few dozen words.',
    rect: { x: 300, y: 110, w: 120, h: 80 },
    transistors: '~2 M',
    physics: 'Each register bit lives in a D flip-flop (~20 transistors). Proximity to the ALU keeps RC interconnect delay — and therefore access time — minimal.',
  },
  {
    id: 'clock',
    name: 'Clock & PLL',
    short: 'Generates and distributes the timing heartbeat.',
    rect: { x: 440, y: 110, w: 140, h: 80 },
    transistors: '~10 M',
    physics: 'A phase-locked loop multiplies a slow external reference up to GHz. The clock tree must arrive everywhere within picoseconds — RC delays in the wires are the enemy.',
  },
  {
    id: 'alu',
    name: 'ALU',
    short: 'Arithmetic & logic unit — where computation happens.',
    rect: { x: 140, y: 205, w: 140, h: 105 },
    transistors: '~80 M',
    physics: 'Adders, shifters and logic built from NAND/NOR gates. Each gate is 2–4 transistors switching billions of times per second, dissipating P ≈ α·C·V²·f each toggle.',
  },
  {
    id: 'l1cache',
    name: 'L1 Cache',
    short: 'Small, fast SRAM buffer beside the core.',
    rect: { x: 300, y: 205, w: 120, h: 105 },
    transistors: '~3 M',
    physics: 'Six transistors per bit of SRAM. No refresh needed — leakage current through the p-n junctions is the standing cost.',
  },
  {
    id: 'bus',
    name: 'Bus Interface',
    short: 'Talks to memory, caches, and the outside world.',
    rect: { x: 440, y: 205, w: 140, h: 105 },
    transistors: '~40 M',
    physics: 'Drivers push current down long interconnects. Wider bus = more parallel wires = more current per cycle — Ohm\'s law at gigahertz.',
  },
  {
    id: 'l2cache',
    name: 'L2 Cache',
    short: 'A bigger SRAM pool shared across the die.',
    rect: { x: 140, y: 320, w: 440, h: 42 },
    transistors: '~50 M',
    physics: 'Same 6T SRAM cells as L1, repeated millions of times. SRAM dominates modern die area — that is why chips keep shrinking the cell.',
  },
]

export const ZOOM_LEVELS = [
  {
    id: 'package',
    label: 'Package',
    caption: 'The black epoxy square you can hold. Pins underneath carry power and signals between the board and the silicon inside.',
  },
  {
    id: 'die',
    label: 'Die',
    caption: 'A fingernail-sized silicon chip, etched in a fab. Billions of transistors patterned by ultraviolet lithography.',
  },
  {
    id: 'block',
    label: 'Block',
    caption: 'Zoom into the ALU: millions of logic gates tiled in neat rows, wired together by copper interconnect layers above the silicon.',
  },
  {
    id: 'gate',
    label: 'Gate',
    caption: 'A CMOS NAND gate — four transistors total. Two p-type pull the output high, two n-type pull it low. This is where Unit 14 meets computing.',
  },
  {
    id: 'transistor',
    label: 'Transistor',
    caption: 'A single MOSFET: source and drain doped regions in silicon, a gate electrode on an oxide insulator. Gate voltage opens or closes the channel — the world\'s most manufactured switch.',
  },
  {
    id: 'junction',
    label: 'P–N Junction',
    caption: 'Inside the silicon: p-type and n-type doped regions meet. The depletion region and built-in field you studied in Unit 14 — the physics that makes every gate above work.',
  },
]

export const DATAPATH_STAGES = [
  {
    id: 'fetch',
    label: 'Fetch',
    block: 'bus',
    waypoint: { x: 510, y: 258 },
    text: 'The program counter points at the next instruction in memory. The bus interface drives address lines, reads the word back, and drops it into the instruction register.',
    physics: 'Signals race down copper interconnects — propagation delay rises with R·C of the wire, which is why on-chip buses beat off-chip memory by ~100×.',
  },
  {
    id: 'decode',
    label: 'Decode',
    block: 'control',
    waypoint: { x: 210, y: 150 },
    text: 'The control unit reads the opcode and raises the right control lines: register enables, mux selects, and the ALU operation code.',
    physics: 'Decoding is pure combinational logic — a few gate delays, ~100 picoseconds on a modern process.',
  },
  {
    id: 'execute',
    label: 'Execute',
    block: 'alu',
    waypoint: { x: 210, y: 258 },
    text: 'The ALU performs the operation — here, an ADD. Carry bits ripple (or look ahead) through the adder chain; result and flags appear at the output.',
    physics: 'Every gate toggle charges or discharges a node capacitance. Millions toggling at once is why the ALU draws the most dynamic power.',
  },
  {
    id: 'writeback',
    label: 'Write-back',
    block: 'regfile',
    waypoint: { x: 360, y: 150 },
    text: 'The result travels back and is written into the destination register on the next clock edge. One instruction complete — billions per second.',
    physics: 'Flip-flops capture the value at the clock edge — the synchronizing heartbeat that keeps a billion-switch-per-second machine orderly.',
  },
]

export const GPU_TILES = { cols: 16, rows: 8 }

// Sandbox physics — approximate, labelled as such in the UI.
export const NODE_OPTIONS = [180, 130, 90, 65, 45, 28, 14, 10, 7, 5, 3]

// MTr/mm² — anchored near industry figures (180nm≈0.6, 90nm≈1.8, 14nm≈33, 7nm≈95, 3nm≈290)
export function transistorDensity(nodeNm) {
  return 0.6 * Math.pow(180 / nodeNm, 1.6)
}

// Dynamic power P = activity·C·V²·f, collapsed to a toy coefficient
// anchored so ~10B transistors at 1 V / 3 GHz ≈ 65 W.
export function dynamicPowerWatts(transistorsB, volts, ghz, activity = 0.3) {
  return transistorsB * volts * volts * ghz * 7.2 * activity
}

// Leakage grows as the node shrinks (thinner oxides, lower thresholds).
export function leakagePowerWatts(transistorsB, nodeNm) {
  return transistorsB * 0.12 * Math.pow(14 / nodeNm, 0.7)
}

export const SANDBOX_DEFAULTS = {
  cores: 8,
  cacheMb: 16,
  clockGhz: 3.0,
  transistorsB: 10,
  nodeNm: 7,
  volts: 1.0,
}

export const SANDBOX_RANGES = {
  cores: { min: 1, max: 128, step: 1, label: 'Compute cores' },
  cacheMb: { min: 1, max: 64, step: 1, label: 'On-chip cache (MB)' },
  clockGhz: { min: 0.5, max: 5.5, step: 0.1, label: 'Clock speed (GHz)' },
  transistorsB: { min: 0.5, max: 200, step: 0.5, label: 'Transistor budget (billions)' },
  volts: { min: 0.6, max: 1.4, step: 0.05, label: 'Core voltage (V)' },
}
