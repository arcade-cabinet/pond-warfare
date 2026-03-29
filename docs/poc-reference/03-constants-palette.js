/**
 * POC Reference: Constants & Palette (pond_craft.html lines 168-190)
 *
 * Ported to: src/constants.ts
 *
 * Game world dimensions, color palette, and day/night time stops.
 */

const TILE_SIZE = 32;
const MAP_WIDTH = 80; 
const MAP_HEIGHT = 80;
const WORLD_WIDTH = MAP_WIDTH * TILE_SIZE;
const WORLD_HEIGHT = MAP_HEIGHT * TILE_SIZE;

const PALETTE = {
    otterBase: '#78350f', otterBelly: '#b45309', otterNose: '#000000',
    gatorBase: '#166534', gatorLight: '#22c55e', gatorEye: '#fef08a',
    snakeBase: '#65a30d', snakeStripe: '#facc15',
    waterDeep: '#0f2b32', waterMid: '#11525c', waterShallow: '#1e3a5f',
    mudDark: '#451a03', mudLight: '#713f12', wood: '#92400e',
    clamShell: '#cbd5e1', clamMeat: '#f87171',
    reedGreen: '#4ade80', reedBrown: '#92400e',
    stone: '#4b5563', stoneL: '#9ca3af',
    shadow: 'rgba(0,0,0,0.3)', black: '#000000'
};

const TIME_STOPS = [
    { h: 0, c: [15, 20, 45] }, { h: 5, c: [15, 20, 45] }, { h: 6, c: [250, 140, 100] }, 
    { h: 8, c: [255, 255, 255] }, { h: 18, c: [255, 255, 255] }, { h: 19, c: [160, 90, 140] }, 
    { h: 20, c: [15, 20, 45] }, { h: 24, c: [15, 20, 45] }    
];
