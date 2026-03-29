/**
 * POC Reference: UI Update & Action Panel (pond_craft.html lines 870-1064)
 *
 * Ported to: src/ui/selection-panel.tsx, src/ui/action-panel.tsx, src/ui/store.ts
 *
 * updateCtrlGroupUI, updateUI (portrait, name, HP bar, stats, description),
 * action buttons: build (Burrow/Armory/Tower), train (Gatherer/Brawler/Sniper),
 * tech upgrades (Sturdy Mud, Swift Paws, Sharp Sticks, Eagle Eye),
 * combat actions (Atk Move, Halt), training queue display with progress.
 */

    // NEW: Control group UI update
    updateCtrlGroupUI() {
        let container = document.getElementById('ctrl-groups');
        container.innerHTML = '';
        let hasAny = false;
        for (let i = 1; i <= 9; i++) {
            if (this.ctrlGroups[i] && this.ctrlGroups[i].length > 0) {
                this.ctrlGroups[i] = this.ctrlGroups[i].filter(u => u.hp > 0 && this.entities.includes(u));
                if (this.ctrlGroups[i].length > 0) {
                    hasAny = true;
                    let btn = document.createElement('button');
                    btn.className = 'ui-panel text-[10px] px-2 py-0.5 border border-slate-600 rounded cursor-pointer hover:bg-slate-700 text-sky-300';
                    btn.textContent = `${i}: ${this.ctrlGroups[i].length}`;
                    btn.onclick = () => { this.keys[i.toString()] = true; setTimeout(() => this.keys[i.toString()] = false, 50); };
                    container.appendChild(btn);
                }
            }
        }
    },

    updateUI() {
        const els = { name: document.getElementById('sel-name'), stats: document.getElementById('sel-stats'), desc: document.getElementById('sel-desc'), hpBar: document.getElementById('sel-hp-bar'), hpFill: document.getElementById('sel-hp-fill'), panel: document.getElementById('action-panel') };
        const portraitCanvas = document.getElementById('portrait-canvas'); const pCtx = portraitCanvas.getContext('2d');
        
        els.panel.innerHTML = '';
        if (this.selection.length === 0) {
            portraitCanvas.classList.add('hidden');
            els.name.textContent = "No Selection"; els.name.className = "text-base md:text-xl font-bold text-slate-500 leading-tight";
            els.stats.innerHTML = ""; els.desc.textContent = ""; els.hpBar.classList.add('hidden'); return;
        }
        
        let ent = this.selection[0];
        
        if (this.selection.length > 1) {
            portraitCanvas.classList.add('hidden');
            els.name.textContent = `Squad (${this.selection.length})`; els.name.className = "text-base md:text-xl font-bold text-white leading-tight";
            
            // NEW: Show total HP and composition
            let totalHp = 0, totalMaxHp = 0;
            let typeCounts = {};
            this.selection.forEach(u => { 
                totalHp += u.hp; totalMaxHp += u.maxHp; 
                typeCounts[u.type] = (typeCounts[u.type] || 0) + 1;
            });
            let compStr = Object.entries(typeCounts).map(([t, c]) => `${c} ${t}`).join(', ');
            els.desc.textContent = compStr;
            els.hpBar.classList.remove('hidden');
            els.hpFill.style.width = `${(totalHp/totalMaxHp)*100}%`;
            
            let gridHTML = '<div class="flex flex-wrap gap-1 mt-1">';
            let maxShow = 12;
            for(let i=0; i < Math.min(this.selection.length, maxShow); i++) {
                let u = this.selection[i];
                let hpPct = Math.floor(u.hp / u.maxHp * 100);
                let borderColor = hpPct > 60 ? 'border-slate-600' : hpPct > 30 ? 'border-yellow-600' : 'border-red-600';
                gridHTML += `<img src="${u.sprite.toDataURL()}" class="w-6 h-6 md:w-8 md:h-8 bg-slate-800 border ${borderColor} rounded-sm render-pixelated" title="${u.type} (${hpPct}% HP)">`;
            }
            if(this.selection.length > maxShow) {
                gridHTML += `<div class="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-[10px] font-bold bg-slate-800 border border-slate-600 text-slate-400 rounded-sm">+${this.selection.length - maxShow}</div>`;
            }
            gridHTML += '</div>';
            els.stats.innerHTML = gridHTML;
            
        } else {
            portraitCanvas.classList.remove('hidden');
            pCtx.clearRect(0,0,64,64); pCtx.imageSmoothingEnabled = false; pCtx.fillStyle = '#0f172a'; pCtx.fillRect(0,0,64,64);
            let sW = ent.sprite.width, sH = ent.sprite.height, scale = Math.min(48/sW, 48/sH), dW = sW * scale, dH = sH * scale;
            pCtx.drawImage(ent.sprite, 32 - dW/2, 32 - dH/2, dW, dH);
            
            // NEW: Show kill count on portrait
            if (ent.kills > 0) {
                pCtx.fillStyle = '#ef4444'; pCtx.font = 'bold 10px Courier New'; pCtx.textAlign = 'right';
                pCtx.fillText('☆' + ent.kills, 62, 12);
            }

            els.name.textContent = ent.type.replace('_', ' ').toUpperCase();
            els.name.className = `text-base md:text-xl font-bold leading-tight ${ent.faction==='player'?'text-sky-300':(ent.faction==='enemy'?'text-red-400':'text-amber-300')}`;
            els.hpBar.classList.remove('hidden'); els.hpFill.style.width = `${Math.max(0, (ent.hp/ent.maxHp)*100)}%`;
            
            // NEW: Color HP bar based on health
            let hpPct = ent.hp / ent.maxHp;
            els.hpFill.style.background = hpPct > 0.6 ? '#22c55e' : hpPct > 0.3 ? '#eab308' : '#ef4444';
            
            if (ent.isResource) {
                els.stats.innerHTML = `Resources: ${ent.resAmount}`; els.desc.textContent = ent.type==='cattail' ? "Twigs. Right-click with gatherer to harvest." : "Clams. Right-click with gatherer to harvest."; els.hpBar.classList.add('hidden');
            } else {
                let statsStr = `HP: ${Math.floor(ent.hp)}/${ent.maxHp}`;
                if (ent.dmg) statsStr += ` | Dmg: ${ent.dmg}`;
                if (ent.kills > 0) statsStr += ` | Kills: ${ent.kills}`;
                if (ent.atkRange > 60) statsStr += ` | Rng: ${ent.atkRange}`;
                els.stats.innerHTML = statsStr;
                
                let statusText = ent.progress < 100 ? `Building ${Math.floor(ent.progress)}%` : ent.state;
                if (ent.heldRes) statusText += ` (carrying ${ent.heldRes})`;
                if (ent.isBuilding && ent.q && ent.q.length > 0) statusText = `Training (${ent.q.length} queued)`;
                els.desc.textContent = `Status: ${statusText}`;
            }
        }

        let isPlayer = this.selection.every(e => e.faction === 'player'); if (!isPlayer) return;

        let hotkeyIdx = 0;
        const addBtn = (title, cost, fn, afford, hotkey) => {
            let b = document.createElement('button');
            b.className = `action-btn relative flex flex-col items-center justify-center p-1 md:p-2 rounded text-[10px] md:text-xs font-bold shadow-md ${!afford?'opacity-50 grayscale cursor-not-allowed':''}`;
            let hkLabel = hotkey || 'QWER'[hotkeyIdx];
            b.innerHTML = `<span class="hotkey-badge">${hkLabel}</span><span>${title}</span><span class="text-sky-200 font-normal text-[8px] md:text-[10px] mt-1 whitespace-pre-line">${cost}</span>`;
            if (afford) b.onclick = (e) => { e.stopPropagation(); AudioSys.sfx.click(); fn(); }; 
            els.panel.appendChild(b);
            hotkeyIdx++;
        };

        if (this.selection.some(e => e.type === 'gatherer')) {
            addBtn("Burrow", "100 T", () => this.placingBuilding='burrow', this.resources.twigs >= 100);
            addBtn("Armory", "250C 150T", () => this.placingBuilding='armory', this.resources.clams >= 250 && this.resources.twigs >= 150);
            addBtn("Tower", "200C 250T", () => this.placingBuilding='tower', this.resources.clams >= 200 && this.resources.twigs >= 250);
        }
        if (this.selection.length === 1 && ent.type === 'lodge' && ent.progress >= 100) {
            addBtn("Gatherer", "50C 1Food", () => this.train(ent, 'gatherer', 50, 0, 1), this.resources.clams >= 50 && this.resources.food < this.resources.maxFood);
            
            if (!this.tech.sturdyMud) {
                addBtn("Sturdy Mud", "200C 300T\n(+Bldg HP)", () => {
                    this.resources.clams -= 200; this.resources.twigs -= 300; this.tech.sturdyMud = true;
                    this.entities.forEach(e => { if (e.faction === 'player' && e.isBuilding) { e.maxHp += 300; e.hp += 300; } });
                    AudioSys.sfx.upgrade(); this.updateUI();
                }, this.resources.clams >= 200 && this.resources.twigs >= 300);
            }
            // NEW: Swift Paws upgrade
            if (!this.tech.swiftPaws && this.tech.sturdyMud) {
                addBtn("Swift Paws", "250C 200T\n(+Speed)", () => {
                    this.resources.clams -= 250; this.resources.twigs -= 200; this.tech.swiftPaws = true;
                    this.entities.forEach(e => { if (e.faction === 'player' && !e.isBuilding && !e.isResource) e.speed += 0.4; });
                    AudioSys.sfx.upgrade(); this.updateUI();
                }, this.resources.clams >= 250 && this.resources.twigs >= 200);
            }
        }
        if (this.selection.length === 1 && ent.type === 'armory' && ent.progress >= 100) {
            addBtn("Brawler", "100C 50T\n1Food", () => this.train(ent, 'brawler', 100, 50, 1), this.resources.clams >= 100 && this.resources.twigs >= 50 && this.resources.food < this.resources.maxFood);
            addBtn("Sniper", "80C 80T\n1Food", () => this.train(ent, 'sniper', 80, 80, 1), this.resources.clams >= 80 && this.resources.twigs >= 80 && this.resources.food < this.resources.maxFood);
            
            if (!this.tech.sharpSticks) {
                addBtn("Sharp Sticks", "300C 200T\n(+2 Dmg)", () => {
                    this.resources.clams -= 300; this.resources.twigs -= 200; this.tech.sharpSticks = true;
                    this.entities.forEach(e => { if (e.faction === 'player' && !e.isBuilding && e.dmg) e.dmg += 2; });
                    AudioSys.sfx.upgrade(); this.updateUI();
                }, this.resources.clams >= 300 && this.resources.twigs >= 200);
            }
            // NEW: Eagle Eye upgrade
            if (!this.tech.eagleEye && this.tech.sharpSticks) {
                addBtn("Eagle Eye", "400C 300T\n(+Sniper Rng)", () => {
                    this.resources.clams -= 400; this.resources.twigs -= 300; this.tech.eagleEye = true;
                    this.entities.forEach(e => { if (e.faction === 'player' && e.type === 'sniper') e.atkRange += 50; });
                    AudioSys.sfx.upgrade(); this.updateUI();
                }, this.resources.clams >= 400 && this.resources.twigs >= 300);
            }
        }
        
        // NEW: Attack-move button for military units
        if (this.selection.some(e => e.faction === 'player' && !e.isBuilding && e.dmg && e.type !== 'gatherer')) {
            addBtn("Atk Move", "(A)", () => {
                this.attackMoveMode = true;
                this.container.style.cursor = 'url("data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'><text y=\'20\' font-size=\'20\'>⚔️</text></svg>") 12 12, crosshair';
            }, true, 'A');
        }
        
        // Halt button
        if (this.hasPlayerUnitsSelected()) {
            addBtn("Halt", "(H)", () => {
                this.selection.forEach(u => { if (!u.isBuilding) { u.state = 'idle'; u.tPos = null; u.tEnt = null; }});
            }, true, 'H');
        }
        
        if (this.selection.length === 1 && ent.isBuilding && ent.q && ent.q.length > 0) {
            let qContainer = document.createElement('div');
            qContainer.className = 'col-span-2 sm:col-span-3 mt-2 flex flex-col gap-1 border-t border-slate-600 pt-2';
            qContainer.innerHTML = `<span class="text-[10px] text-sky-200 uppercase tracking-wider">Queue (Click to Cancel)</span>`;
            
            let qRow = document.createElement('div'); qRow.className = 'flex gap-2 flex-wrap';
            ent.q.forEach((t, i) => {
                let btn = document.createElement('div');
                btn.className = 'relative w-8 h-8 bg-slate-700 border border-slate-500 hover:border-red-500 rounded cursor-pointer overflow-hidden';
                btn.onclick = (e) => { e.stopPropagation(); AudioSys.sfx.click(); this.cancelTrain(ent, i); };
                
                let fill = document.createElement('div'); fill.id = (i === 0) ? `q-fill-active` : '';
                fill.className = 'absolute bottom-0 left-0 w-full bg-green-600 transition-all duration-75';
                fill.style.height = (i === 0) ? `${(1 - ent.qTimer/180)*100}%` : '0%'; btn.appendChild(fill);
                
                let txt = document.createElement('span'); txt.className = 'absolute inset-0 flex items-center justify-center text-xs font-bold text-white z-10 shadow-sm';
                txt.innerText = t.charAt(0).toUpperCase(); btn.appendChild(txt);
                
                qRow.appendChild(btn);
            });
            qContainer.appendChild(qRow); els.panel.appendChild(qContainer);
        }
    },
