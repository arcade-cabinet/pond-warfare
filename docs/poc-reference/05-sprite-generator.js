/**
 * POC Reference: Sprite Generator (pond_craft.html lines 234-311)
 *
 * Ported to: src/rendering/sprites.ts
 *
 * Procedural pixel art generation for all 14 entity types.
 * 16px sprites (units, resources, effects) scaled 2.5x.
 * 32px sprites (buildings) scaled 3x.
 * All imageSmoothingEnabled = false for crisp pixelated look.
 */

const SpriteGen = {
    generate(type) {
        let size = ['lodge', 'burrow', 'armory', 'tower', 'predator_nest', 'rubble'].includes(type) ? 32 : 16;
        let c = document.createElement('canvas'); c.width = size; c.height = size; let ctx = c.getContext('2d');
        const p = (x, y, color) => { ctx.fillStyle = color; ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1); };
        const rect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
        const circle = (cx, cy, r, color) => { for(let y=-r; y<=r; y++) for(let x=-r; x<=r; x++) if(x*x+y*y <= r*r) p(cx+x, cy+y, color); };

        if (['gatherer', 'brawler', 'sniper'].includes(type)) {
            rect(5, 4, 6, 8, PALETTE.otterBase); rect(6, 5, 4, 6, PALETTE.otterBelly); rect(5, 2, 6, 4, PALETTE.otterBase); 
            p(6, 3, PALETTE.black); p(9, 3, PALETTE.black); p(7, 4, PALETTE.otterNose); p(8, 4, PALETTE.otterNose); 
            rect(4, 5, 1, 4, PALETTE.otterBase); rect(11, 5, 1, 4, PALETTE.otterBase); 
            rect(5, 12, 2, 2, PALETTE.otterBase); rect(9, 12, 2, 2, PALETTE.otterBase); rect(11, 10, 3, 2, PALETTE.otterBase); 
            if (type === 'gatherer') { rect(3, 5, 2, 2, PALETTE.clamShell); } 
            if (type === 'brawler') { rect(12, 4, 2, 7, PALETTE.reedBrown); rect(6, 1, 4, 2, PALETTE.clamShell); } 
            if (type === 'sniper') { rect(13, 4, 1, 8, PALETTE.reedBrown); rect(12, 4, 1, 1, PALETTE.stoneL); rect(12, 11, 1, 1, PALETTE.stoneL); } 
        }
        else if (type === 'gator') {
            rect(3, 10, 10, 4, PALETTE.gatorBase); for(let i=3; i<12; i+=2) p(i, 9, PALETTE.gatorLight); 
            rect(13, 11, 3, 2, PALETTE.gatorBase); rect(0, 11, 4, 3, PALETTE.gatorLight); 
            p(3, 10, PALETTE.gatorEye); rect(3, 14, 2, 1, PALETTE.gatorLight); rect(9, 14, 2, 1, PALETTE.gatorLight); 
        }
        else if (type === 'snake') {
            rect(4, 12, 8, 2, PALETTE.snakeBase); rect(2, 10, 4, 2, PALETTE.snakeBase); rect(10, 10, 4, 2, PALETTE.snakeBase); 
            rect(12, 8, 2, 2, PALETTE.snakeBase); p(13, 8, PALETTE.black); p(14, 9, PALETTE.clamMeat); 
            p(5,12, PALETTE.snakeStripe); p(7,12, PALETTE.snakeStripe); p(9,12, PALETTE.snakeStripe);
        }
        else if (type === 'cattail') {
            rect(7, 4, 2, 10, PALETTE.reedGreen); rect(6, 2, 4, 6, PALETTE.reedBrown); 
            p(7, 1, PALETTE.otterBase); p(8, 1, PALETTE.otterBase); p(8, 12, PALETTE.reedGreen); p(9, 11, PALETTE.reedGreen); 
        }
        else if (type === 'clambed') {
            circle(8, 10, 6, PALETTE.waterShallow); 
            rect(5, 9, 2, 2, PALETTE.clamShell); p(6,9, PALETTE.stone);
            rect(9, 11, 3, 2, PALETTE.clamShell); p(10,11, PALETTE.stone); rect(7, 13, 2, 2, PALETTE.clamShell); 
        }
        else if (type === 'bones') {
            rect(6, 6, 4, 4, '#cbd5e1'); p(7, 7, '#000'); p(8, 7, '#000');
            rect(7, 10, 2, 4, '#cbd5e1');
            rect(5, 11, 6, 1, '#cbd5e1'); rect(6, 13, 4, 1, '#cbd5e1');
        }
        else if (type === 'rubble') {
            for(let i=0; i<40; i++) {
                let rx = 4 + Math.random() * 24, ry = 16 + Math.random() * 12;
                rect(rx, ry, Math.random()*4+1, Math.random()*2+1, Math.random()>0.5 ? PALETTE.mudDark : PALETTE.wood);
            }
        }
        else if (['lodge', 'burrow', 'armory', 'tower', 'predator_nest'].includes(type)) {
            if (type === 'tower') {
                rect(8, 16, 16, 14, PALETTE.mudLight); for(let i=0;i<30;i++) p(8+Math.random()*16,16+Math.random()*14, PALETTE.mudDark);
                rect(6, 8, 20, 8, PALETTE.mudDark); rect(10, 4, 12, 4, PALETTE.reedGreen); 
                rect(14, 22, 4, 8, PALETTE.black); rect(14, 12, 4, 2, PALETTE.black); 
            } else if (type === 'predator_nest') {
                circle(16, 16, 12, PALETTE.mudDark); circle(16, 18, 8, PALETTE.black); 
                rect(6, 10, 2, 16, PALETTE.gatorBase); rect(24, 12, 2, 14, PALETTE.gatorBase); rect(10, 6, 2, 12, PALETTE.gatorBase);
                p(14,16, PALETTE.gatorEye); p(18,16, PALETTE.gatorEye); 
            } else if (type === 'lodge') {
                circle(16, 20, 14, PALETTE.mudDark); for(let i=0; i<80; i++) p(4+Math.random()*24, 8+Math.random()*24, PALETTE.mudLight);
                for(let i=0; i<40; i++) rect(4+Math.random()*22, 10+Math.random()*18, 6, 2, PALETTE.otterBase); 
                rect(12, 22, 8, 8, PALETTE.black); 
            } else if (type === 'burrow') {
                circle(16, 24, 8, PALETTE.mudDark); for(let i=0; i<20; i++) p(8+Math.random()*16, 16+Math.random()*8, PALETTE.mudLight);
                rect(14, 24, 4, 6, PALETTE.black); 
            } else if (type === 'armory') {
                rect(4, 12, 24, 16, PALETTE.waterMid);
                rect(2, 10, 28, 4, PALETTE.mudDark); rect(2, 10, 4, 20, PALETTE.mudDark); 
                rect(26, 10, 4, 20, PALETTE.mudDark); rect(2, 26, 28, 4, PALETTE.mudDark); 
                for(let i=0; i<30; i++) { p(2+Math.random()*28, 10+Math.random()*4, PALETTE.otterBase); p(2+Math.random()*28, 26+Math.random()*4, PALETTE.otterBase); }
                rect(12, 24, 8, 8, PALETTE.waterShallow); 
                rect(22, 4, 4, 8, PALETTE.stoneL); p(23,4,PALETTE.black); p(24,4,PALETTE.black);
            }
        }
        let scale = ['lodge', 'burrow', 'armory', 'tower', 'predator_nest', 'rubble'].includes(type) ? 3 : 2.5; 
        let sCanvas = document.createElement('canvas'); sCanvas.width = size * scale; sCanvas.height = size * scale;
        let sCtx = sCanvas.getContext('2d'); sCtx.imageSmoothingEnabled = false;
        sCtx.drawImage(c, 0, 0, size * scale, size * scale); return sCanvas;
    }
};
