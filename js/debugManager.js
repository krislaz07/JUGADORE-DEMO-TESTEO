import { state, DEBUG_MODE } from './state.js';

export class DebugManager {
    static init() {
        if (!DEBUG_MODE) return;
        
        this.isOpen = false;
        this.createToggleBtn();
        this.createPanel();
    }

    static createToggleBtn() {
        const btn = document.createElement('button');
        btn.textContent = "🛠 DEBUG";
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

        // Guardar respaldo de los stats la primera vez que se abre
        if (!state.originalAttributes) {
            state.originalAttributes = JSON.parse(JSON.stringify(state.player.attributes));
        }

        let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">
                        <h3 style="color:#FFD700; margin:0;">Modo Debug</h3>
                        <button id="debug-restore" style="background:#ff4c4c; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer;">Restaurar</button>
                    </div>
                    <div style="max-height: 400px; overflow-y: auto; padding-right: 10px;">`;

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
        html += `</div>`;
        
        this.panel.innerHTML = html;

        // Eventos
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
    }
}