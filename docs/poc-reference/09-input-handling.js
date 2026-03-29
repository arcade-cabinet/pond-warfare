/**
 * POC Reference: Input Handling (pond_craft.html lines 550-787)
 *
 * Ported to: src/input/keyboard.ts, src/input/pointer.ts
 *
 * setupInput: resize, pointer events (down/move/up), keyboard (down/up),
 * minimap click/drag. Two-finger pan for touch. Attack-move cursor.
 * Double-click to select all of type. Shift-click add/remove.
 * Box drag selection. Right-click context commands.
 */

    setupInput() {
        window.addEventListener('resize', () => this.resize()); this.resize();
        this.container.addEventListener('mouseenter', () => this.mouse.in = true); this.container.addEventListener('mouseleave', () => this.mouse.in = false);
        this.container.addEventListener('contextmenu', e => e.preventDefault());

        this.container.addEventListener('pointerdown', e => {
            if(e.button === 0 || e.pointerType === 'touch') { AudioSys.init(); } 
            if(this.state !== 'playing') return;
            this.activePointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
            if (this.activePointers.size === 1) {
                let rect = this.canvas.getBoundingClientRect();
                this.mouse.x = e.clientX - rect.left; this.mouse.y = e.clientY - rect.top;
                this.mouse.worldX = this.mouse.x + this.camX; this.mouse.worldY = this.mouse.y + this.camY;
                if (this.placingBuilding) { this.placeBuilding(); return; }
                this.mouse.isDown = true; this.mouse.startX = this.mouse.worldX; this.mouse.startY = this.mouse.worldY; this.mouse.btn = e.button;
            }
        });
        
        this.container.addEventListener('pointermove', e => {
            if(this.activePointers.has(e.pointerId)) this.activePointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
            if (this.activePointers.size === 2) {
                this.isTracking = false; 
                let pts = Array.from(this.activePointers.values());
                let cx = (pts[0].x + pts[1].x) / 2, cy = (pts[0].y + pts[1].y) / 2;
                if (this.lastPanCenter) { this.camX += (this.lastPanCenter.x - cx) * 1.5; this.camY += (this.lastPanCenter.y - cy) * 1.5; }
                this.lastPanCenter = {x: cx, y: cy}; return;
            } else { this.lastPanCenter = null; }
            let rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left; this.mouse.y = e.clientY - rect.top;
            this.mouse.worldX = this.mouse.x + this.camX; this.mouse.worldY = this.mouse.y + this.camY;
        });
        
        this.container.addEventListener('pointerup', e => {
            this.activePointers.delete(e.pointerId); if (this.activePointers.size > 0) return; 
            this.lastPanCenter = null;
            if (this.mouse.isDown) { 
                this.mouse.isDown = false; 
                let dx = this.mouse.worldX - this.mouse.startX, dy = this.mouse.worldY - this.mouse.startY, dist = Math.sqrt(dx*dx + dy*dy);
                if (e.pointerType === 'touch' || e.button === 0) {
                    if (dist < 10) {
                        // NEW: Attack-move mode
                        if (this.attackMoveMode) {
                            this.attackMoveMode = false;
                            this.container.style.cursor = 'crosshair';
                            let clickedEnt = this.getEntityAt(this.mouse.worldX, this.mouse.worldY);
                            if (clickedEnt && clickedEnt.faction === 'enemy') {
                                this.selection.forEach(u => { if (u.faction === 'player' && !u.isBuilding) u.cmdAtk(clickedEnt); });
                            } else {
                                // Attack-move to ground: move, but auto-attack on the way
                                this.selection.forEach((u, idx) => {
                                    if (u.faction === 'player' && !u.isBuilding) {
                                        let row = Math.floor(idx / 4), col = idx % 4;
                                        u.cmdAttackMove(this.mouse.worldX + (col-1.5)*30, this.mouse.worldY + (row-1.5)*30);
                                    }
                                });
                            }
                            this.groundPings.push({x: this.mouse.worldX, y: this.mouse.worldY, life: 20, maxLife: 20, c: '239, 68, 68'});
                            return;
                        }
                        
                        let clickedEnt = this.getEntityAt(this.mouse.worldX, this.mouse.worldY);
                        let now = performance.now();
                        
                        if (clickedEnt) {
                            if (clickedEnt.isBuilding) AudioSys.sfx.selectBuild(); else AudioSys.sfx.selectUnit();
                            
                            // NEW: Double-click to select all of same type on screen
                            if (now - this.lastClickTime < 350 && this.lastClickEntity && 
                                this.lastClickEntity.type === clickedEnt.type && clickedEnt.faction === 'player' && !clickedEnt.isBuilding) {
                                this.selection.forEach(e => e.selected = false);
                                this.selection = [];
                                this.entities.forEach(ent => {
                                    if (ent.type === clickedEnt.type && ent.faction === 'player' && 
                                        ent.x > this.camX - 50 && ent.x < this.camX + this.width + 50 &&
                                        ent.y > this.camY - 50 && ent.y < this.camY + this.height + 50) {
                                        ent.selected = true; this.selection.push(ent);
                                    }
                                });
                                this.isTracking = true;
                            } else if (clickedEnt.faction === 'player' && !clickedEnt.isBuilding) {
                                // NEW: Shift-click to add/remove from selection
                                if (this.keys['shift']) {
                                    let idx = this.selection.indexOf(clickedEnt);
                                    if (idx > -1) { clickedEnt.selected = false; this.selection.splice(idx, 1); }
                                    else { clickedEnt.selected = true; this.selection.push(clickedEnt); }
                                } else {
                                    this.selection.forEach(e => e.selected = false); 
                                    this.selection = [clickedEnt]; clickedEnt.selected = true;
                                    this.isTracking = true;
                                }
                            } else {
                                if (this.hasPlayerUnitsSelected()) this.issueContextCommand(clickedEnt);
                                else { 
                                    this.selection.forEach(e => e.selected = false); this.selection = [clickedEnt]; clickedEnt.selected = true;
                                    this.isTracking = true; 
                                }
                            }
                        } else {
                            if (this.hasPlayerUnitsSelected()) this.issueContextCommand(null);
                            else { this.selection.forEach(e => e.selected = false); this.selection = []; this.isTracking = false; }
                        }
                        this.lastClickTime = now;
                        this.lastClickEntity = clickedEnt;
                        this.updateUI();
                    } else {
                        // Drag selection
                        if (!this.keys['shift']) { this.selection.forEach(e => e.selected = false); this.selection = []; }
                        let minX = Math.min(this.mouse.startX, this.mouse.worldX), maxX = Math.max(this.mouse.startX, this.mouse.worldX);
                        let minY = Math.min(this.mouse.startY, this.mouse.worldY), maxY = Math.max(this.mouse.startY, this.mouse.worldY);
                        this.entities.forEach(e => { 
                            if (e.faction === 'player' && !e.isBuilding && e.x >= minX && e.x <= maxX && e.y >= minY && e.y <= maxY) { 
                                if (!e.selected) { e.selected = true; this.selection.push(e); }
                            } 
                        });
                        if(this.selection.length > 0) { AudioSys.sfx.selectUnit(); this.isTracking = true; }
                        this.updateUI();
                    }
                } else if (e.button === 2) { this.issueContextCommand(this.getEntityAt(this.mouse.worldX, this.mouse.worldY)); }
            }
        });
        
        window.addEventListener('keydown', e => {
            let k = e.key.toLowerCase();
            this.keys[k] = true;
            if (k === 'shift') this.keys['shift'] = true;
            
            // Escape: cancel placement / deselect / cancel attack-move
            if (k === 'escape') {
                if (this.attackMoveMode) { this.attackMoveMode = false; this.container.style.cursor = 'crosshair'; }
                else if (this.placingBuilding) { this.placingBuilding = null; }
                else { this.selection.forEach(ent => ent.selected = false); this.selection = []; this.isTracking = false; this.updateUI(); }
            }
            
            // NEW: Hotkeys for actions
            if (this.state === 'playing') {
                // Attack-move (A key)
                if (k === 'a' && !e.ctrlKey && this.hasPlayerUnitsSelected()) {
                    this.attackMoveMode = true;
                    this.container.style.cursor = 'url("data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'><text y=\'20\' font-size=\'20\'>⚔️</text></svg>") 12 12, crosshair';
                }
                
                // Stop (S key when not moving camera)
                if (k === 'h' && this.hasPlayerUnitsSelected()) {
                    this.selection.forEach(u => { if (!u.isBuilding) { u.state = 'idle'; u.tPos = null; u.tEnt = null; }});
                }
                
                // Control groups
                if (e.ctrlKey && k >= '1' && k <= '9') {
                    e.preventDefault();
                    let group = parseInt(k);
                    this.ctrlGroups[group] = this.selection.filter(u => u.hp > 0).slice();
                    this.floatingTexts.push({x: this.camX + this.width/2, y: this.camY + 60, t: `Group ${group} set (${this.ctrlGroups[group].length})`, c: '#38bdf8', life: 60});
                    this.updateCtrlGroupUI();
                } else if (!e.ctrlKey && k >= '1' && k <= '9') {
                    let group = parseInt(k);
                    if (this.ctrlGroups[group] && this.ctrlGroups[group].length > 0) {
                        // Clean dead units
                        this.ctrlGroups[group] = this.ctrlGroups[group].filter(u => u.hp > 0 && this.entities.includes(u));
                        if (this.ctrlGroups[group].length > 0) {
                            this.selection.forEach(u => u.selected = false);
                            this.selection = [...this.ctrlGroups[group]];
                            this.selection.forEach(u => u.selected = true);
                            this.isTracking = true;
                            AudioSys.sfx.selectUnit();
                            this.updateUI();
                        }
                    }
                }
                
                // Mute toggle
                if (k === 'm') AudioSys.toggleMute();
                
                // Speed toggle
                if (k === 'f') this.cycleSpeed();
                
                // Period for idle worker
                if (k === '.') this.selectIdleWorker();
                // Comma for army select
                if (k === ',') this.selectArmy();
                
                // Space to center on selection
                if (k === ' ' && this.selection.length > 0) {
                    e.preventDefault();
                    this.isTracking = true;
                }
                
                // Tab to cycle through buildings  
                if (k === 'tab') {
                    e.preventDefault();
                    let buildings = this.entities.filter(e => e.faction === 'player' && e.isBuilding && e.progress >= 100);
                    if (buildings.length > 0) {
                        let curIdx = this.selection.length === 1 ? buildings.indexOf(this.selection[0]) : -1;
                        let next = buildings[(curIdx + 1) % buildings.length];
                        this.selection.forEach(u => u.selected = false);
                        this.selection = [next]; next.selected = true;
                        this.isTracking = true;
                        AudioSys.sfx.selectBuild();
                        this.updateUI();
                    }
                }

                // Hotkey buttons: Q, W, E, R for action panel buttons
                if (['q', 'w', 'e', 'r'].includes(k) && !e.ctrlKey) {
                    let btns = document.querySelectorAll('#action-panel .action-btn');
                    let idx = 'qwer'.indexOf(k);
                    if (btns[idx] && !btns[idx].disabled) btns[idx].click();
                }
            }
        }); 
        window.addEventListener('keyup', e => { 
            this.keys[e.key.toLowerCase()] = false; 
            if (e.key === 'Shift') this.keys['shift'] = false;
        });

        const mmap = document.getElementById('minimap-container'); let mmapDrag = false, mmapPanOffset = { x: 0, y: 0 };
        mmap.addEventListener('contextmenu', e => e.preventDefault());
        
        mmap.addEventListener('pointerdown', e => { 
            e.stopPropagation();
            let rect = this.minimap.getBoundingClientRect();
            let clickX = (e.clientX - rect.left) / rect.width * WORLD_WIDTH, clickY = (e.clientY - rect.top) / rect.height * WORLD_HEIGHT;
            
            if (e.button === 2 && this.hasPlayerUnitsSelected()) {
                let targetEnt = this.getEntityAt(clickX, clickY);
                let oldX = this.mouse.worldX, oldY = this.mouse.worldY;
                this.mouse.worldX = clickX; this.mouse.worldY = clickY;
                this.issueContextCommand(targetEnt);
                this.mouse.worldX = oldX; this.mouse.worldY = oldY;
                return;
            }

            mmapDrag = true; this.isTracking = false; 
            if (clickX >= this.camX && clickX <= this.camX + this.width && clickY >= this.camY && clickY <= this.camY + this.height) {
                mmapPanOffset.x = clickX - this.camX; mmapPanOffset.y = clickY - this.camY;
            } else { mmapPanOffset.x = this.width / 2; mmapPanOffset.y = this.height / 2; this.moveCamMinimap(e, mmapPanOffset); }
        });
        window.addEventListener('pointermove', e => { if(mmapDrag) this.moveCamMinimap(e, mmapPanOffset); }); window.addEventListener('pointerup', () => mmapDrag = false);
    },
