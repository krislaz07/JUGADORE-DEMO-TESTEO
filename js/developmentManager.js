import { state, normalizePlayerPosition } from './state.js';
import { PlayerTemplates } from './playerTemplates.js';
import { CareerManager } from './careerManager.js';

export class DevelopmentManager {
    static init() {
        this.tempAttributes = {};
        this.tempPoints = 0;
    }

    static openScreen() {
        document.getElementById('screen-career-hub').style.display = 'none';
        document.getElementById('screen-development').style.display = 'block';
        
        this.tempAttributes = { ...state.player.attributes };
        this.tempPoints = state.career.devPoints;
        
        this.renderInterface();
    }

    static renderInterface() {
        const player = state.player;
        normalizePlayerPosition(player);

        document.getElementById('dev-level').textContent = state.career.level;
        document.getElementById('dev-points').textContent = this.tempPoints;
        
        const currentTempOVR = PlayerTemplates.calculateOVR(this.tempAttributes, player.personalData.posicionBase);
        document.getElementById('dev-ovr').textContent = currentTempOVR;
        
        const container = document.getElementById('dev-attributes-list');
        container.innerHTML = '';
        
        const highlighted = PlayerTemplates.getHighlightedAttributes(player.personalData.posicionBase);
        
        PlayerTemplates.attributesList.forEach(attr => {
            const originalVal = player.attributes[attr];
            const tempVal = this.tempAttributes[attr];
            const isHighlight = highlighted.includes(attr);
            
            const row = document.createElement('div');
            row.className = 'attr-dev-row';
            
            row.innerHTML = `
                <div class="${isHighlight ? 'attr-highlight' : ''}" style="flex: 1;">
                    ${attr} ${isHighlight ? '★' : ''}
                </div>
                <div style="font-weight: bold; width: 30px; text-align: center; color: ${tempVal > originalVal ? 'var(--success)' : 'white'}">
                    ${tempVal}
                </div>
                <div style="display: flex; gap: 5px;">
                    <button class="game-btn secondary btn-small" data-action="minus" data-attr="${attr}" ${tempVal <= originalVal ? 'disabled' : ''}>-</button>
                    <button class="game-btn secondary btn-small" data-action="plus" data-attr="${attr}" ${this.tempPoints <= 0 || tempVal >= 99 ? 'disabled' : ''}>+</button>
                </div>
            `;
            container.appendChild(row);
        });

        container.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const attr = e.target.dataset.attr;
                
                if (action === 'plus' && this.tempPoints > 0 && this.tempAttributes[attr] < 99) {
                    this.tempAttributes[attr]++;
                    this.tempPoints--;
                    this.renderInterface();
                } else if (action === 'minus' && this.tempAttributes[attr] > player.attributes[attr]) {
                    this.tempAttributes[attr]--;
                    this.tempPoints++;
                    this.renderInterface();
                }
            });
        });
    }

    static confirmChanges() {
        state.player.attributes = { ...this.tempAttributes };
        state.career.devPoints = this.tempPoints;
        
        state.player.overall = PlayerTemplates.calculateOVR(state.player.attributes, state.player.personalData.posicionBase);
        document.getElementById('screen-development').style.display = 'none';
        document.getElementById('screen-career-hub').style.display = 'block';
        
        CareerManager.updateHub();
    }

    static cancelChanges() {
        document.getElementById('screen-development').style.display = 'none';
        document.getElementById('screen-career-hub').style.display = 'block';
        CareerManager.updateHub();
    }
}