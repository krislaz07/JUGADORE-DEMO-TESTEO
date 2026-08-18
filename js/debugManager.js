import { state, DEBUG_MODE } from './state.js';
import { MinigameManager } from './minigames/minigameManager.js';

export class DebugManager {
    static init() {
        if (!DEBUG_MODE) return;
        
        this.isOpen = false;
        this.createToggleBtn();
        this.createPanel();
    }

    static createToggleBtn() {
        const btn = document.createElement('button');
        btn.textContent = "⚙️ DEBUG";
        btn.style.cssText = "position: fixed; bottom: 20px; right: 20px; z-index: 9999; background: #ff0055; color: white; padding: 10px 15px; border-radius: 8px; border: none; font-weight: bold; cursor: pointer;";
        btn.onclick = () => this.togglePanel();
        document.body.appendChild(btn);
    }

    static createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = "debug-panel";
        this.panel.style.display = "none";
        document.body.appendChild(this.panel);
    }

    static togglePanel() {
        this.isOpen = !this.isOpen;
        this.panel.style.display = this.isOpen ? "flex" : "none";
        if (this.isOpen) this.renderStats();
    }

    static renderStats() {
        if (!state.player) {
            this.panel.innerHTML = "<p style='color:white; text-align:center;'>Iniciá una partida primero.</p>";
            return;
        }

        if (!state.originalAttributes) {
            state.originalAttributes = JSON.parse(JSON.stringify(state.player.attributes));
        }

        let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">
                        <h3 style="color:#FFD700; margin:0;">Modo Debug</h3>
                        <button id="debug-restore" style="background:#ff4c4c; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer;">Restaurar</button>
                    </div>
                    <div style="max-height: 200px; overflow-y: auto; padding-right: 10px;">`;

        for (const [attr, val] of Object.entries(state.player.attributes)) {
            html += `
            <div class="debug-row">
                <span class="debug-label">${attr}</span>
                <div class="debug-controls">
                    <button class="d-btn" data-attr="${attr}" data-val="-5">-5</button>
                    <button class="d-btn" data-attr="${attr}" data-val="-1">-1</button>
                    <span class="debug-val" id="val-${attr.replace(/\s+/g, '')}">${val}</span>
                    <button class="d-btn" data-attr="${attr}" data-val="1">+1</button>
                    <button class="d-btn" data-attr="${attr}" data-val="5">+5</button>
                </div>
            </div>`;
        }
        
        html += `</div>
                 <div style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 15px; margin-top: 15px;">
                    <h4 style="color:#00d2ff; margin:0 0 10px 0; text-align:center;">🎮 LABORATORIO</h4>
                    
                    <div style="margin-bottom: 10px; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 6px;">
                        <label style="color:#FFD700; font-size:11px; font-weight:bold; display:block; margin-bottom:5px; text-transform:uppercase;">Nivel del Jugador:</label>
                        <input type="number" id="dbg-level" class="game-input" style="padding: 6px; font-size: 13px;" value="${state.career.level}" min="1" max="100">
                    </div>

                    <div style="margin-bottom: 15px; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 6px;">
                        <label style="color:#FFD700; font-size:11px; font-weight:bold; display:block; margin-bottom:5px; text-transform:uppercase;">Dificultad del rival:</label>
                        <select id="dbg-difficulty" class="game-select" style="padding: 6px; font-size: 13px;">
                            <option value="20" ${state.debugSettings.minigameDifficulty === 20 ? 'selected' : ''}>Débil (20)</option>
                            <option value="40" ${state.debugSettings.minigameDifficulty === 40 ? 'selected' : ''}>Normal (40)</option>
                            <option value="60" ${state.debugSettings.minigameDifficulty === 60 ? 'selected' : ''}>Fuerte (60)</option>
                            <option value="80" ${state.debugSettings.minigameDifficulty === 80 ? 'selected' : ''}>Competitivo (80)</option>
                            <option value="95" ${state.debugSettings.minigameDifficulty === 95 ? 'selected' : ''}>Muy difícil (95)</option>
                        </select>
                    </div>

                    <div style="display: flex; gap: 10px; flex-direction: column;">
                        <button id="btn-dbg-shoot" class="game-btn primary">⚽ PROBAR TIRO</button>
                        <button id="btn-dbg-dribble" class="game-btn primary">🌀 PROBAR REGATE</button>
                        <button id="btn-dbg-pass" class="game-btn primary">🎯 PROBAR PASE</button>
                    </div>
                    <div id="dbg-lab-result" style="text-align:center; margin-top:10px; color:#FFD700; font-weight:bold; min-height: 20px;"></div>
                 </div>`;

        this.panel.innerHTML = html;

        document.getElementById('debug-restore').onclick = () => {
            state.player.attributes = JSON.parse(JSON.stringify(state.originalAttributes));
            this.renderStats();
        };

        const btns = this.panel.querySelectorAll('.d-btn');
        btns.forEach(b => {
            b.onclick = (e) => {
                const attrName = e.target.getAttribute('data-attr');
                const change = parseInt(e.target.getAttribute('data-val'));
                let newVal = state.player.attributes[attrName] + change;
                newVal = Math.max(1, Math.min(99, newVal));
                
                state.player.attributes[attrName] = newVal;
                document.getElementById(`val-${attrName.replace(/\s+/g, '')}`).textContent = newVal;
            };
        });

        document.getElementById('dbg-difficulty').onchange = (e) => {
            state.debugSettings.minigameDifficulty = parseInt(e.target.value);
        };

        document.getElementById('dbg-level').onchange = (e) => {
            state.career.level = parseInt(e.target.value);
        };

        document.getElementById('btn-dbg-shoot').onclick = () => {
            document.getElementById('dbg-lab-result').textContent = 'Jugando...';
            const dummyAction = { statCategory: 'shot', calc: { 'Definición': 0.5, 'Potencia de tiro': 0.5 } };
            MinigameManager.start('shooting', dummyAction, state.player.attributes, state.debugSettings.minigameDifficulty, (res) => {
                document.getElementById('dbg-lab-result').textContent = `Resultado: ${res.quality.toUpperCase()}`;
            });
        };

        document.getElementById('btn-dbg-dribble').onclick = () => {
            document.getElementById('dbg-lab-result').textContent = 'Jugando...';
            const dummyAction = { statCategory: 'dribble', calc: { 'Regate': 0.6, 'Técnica': 0.25, 'Aceleración': 0.15 } };
            MinigameManager.start('dribbling', dummyAction, state.player.attributes, state.debugSettings.minigameDifficulty, (res) => {
                document.getElementById('dbg-lab-result').textContent = `Resultado: ${res.quality.toUpperCase()}`;
            });
        };

        // NUEVO: Laboratorio del minijuego de PASE
        document.getElementById('btn-dbg-pass').onclick = () => {
            document.getElementById('dbg-lab-result').textContent = 'Jugando...';
            const dummyAction = { statCategory: 'pass', calc: { 'Pase': 0.6, 'Visión': 0.4 } };
            MinigameManager.start('passing', dummyAction, state.player.attributes, state.debugSettings.minigameDifficulty, (res) => {
                document.getElementById('dbg-lab-result').textContent = `Resultado: ${res.quality.toUpperCase()}`;
            });
        };
    }
}