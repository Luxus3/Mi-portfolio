export const COLORS = { bg: 0x050505, fog: 0x080303, red: 0xff2a1f, green: 0x39ff14, amber: 0xffb000 };
export const CSS = { bg: '#050505', red: '#ff2a1f', green: '#39ff14', amber: '#ffb000', dim: '#6b6b6b', text: '#c9ffc0' };
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
