export const COLORS = {
  bg: 0x03060d,
  fog: 0x040a18,
  accent: 0x2f8cff,
  cyan: 0x5ee0ff,
  alert: 0xff4d3a,
  green: 0x39ff14,
  amber: 0xffb000
};
export const CSS = {
  bg: '#03060d',
  accent: '#2f8cff',
  cyan: '#5ee0ff',
  alert: '#ff4d3a',
  green: '#39ff14',
  amber: '#ffb000',
  dim: '#6b7a90',
  text: '#c9ffc0'
};
export const FONT = "'JetBrains Mono', monospace";

const CAM_TRAVEL = 68;
export const camZ = (p) => -2 - p * CAM_TRAVEL;

// Zones of scroll progress. Side: -1 left wall, +1 right wall.
export const ZONES = [
  ['hero', 0],
  ['whoami', 0.14],
  ['experience', 0.34],
  ['stack', 0.52],
  ['services', 0.7],
  ['contact', 0.87]
];

const SECTION_DEFS = [
  { name: 'whoami', side: -1, c: 0.24 },
  { name: 'experience', side: 1, c: 0.43 },
  { name: 'stack', side: -1, c: 0.61 },
  { name: 'services', side: 1, c: 0.785 }
];

export const LAYOUT = {
  halfW: 3,
  height: 3.2,
  zFront: 2,
  zEnd: -74,
  doorZ: -3.5,
  rackStartZ: -4.9,
  rackEndZ: -73.2,
  camY: 1.6,
  camIntro: 2,
  camTravel: CAM_TRAVEL,
  sections: SECTION_DEFS.map((s) => ({ ...s, z: camZ(s.c) }))
};
