import { PlayerGenerator } from './playerGenerator.js';
import { state } from './state.js';
import { PlayerTemplates } from './playerTemplates.js';

export class PlayerCreator {
    static init() {
        const form = document.getElementById('player-creation-form');
        this.setupLivePreview();
        this.setupPitchSelector();

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.validateAndCreate(form);
            });
        }
    }

    static setupLivePreview() {
        const inputNombre = document.getElementById('pc-nombre');
        const inputApellido = document.getElementById('pc-apellido');
        const selectNacionalidad = document.getElementById('pc-nacionalidad');
        const avatarInitials = document.getElementById('avatar-initials');
        const avatarNatFlag = document.getElementById('avatar-nat-flag');
        
        const updateAvatar = () => {
            const n = inputNombre.value.trim().charAt(0).toUpperCase();
            const a = inputApellido.value.trim().charAt(0).toUpperCase();
            avatarInitials.textContent = (n || a) ? `${n}${a}` : '?';
        };
        const updateNat = () => {
            avatarNatFlag.textContent = selectNacionalidad.value || 'FOTO';
        };
        
        inputNombre.addEventListener('input', updateAvatar);
        inputApellido.addEventListener('input', updateAvatar);
        selectNacionalidad.addEventListener('change', updateNat);
    }

    static setupPitchSelector() {
        const zones = document.querySelectorAll('.pitch-zone');
        const inputPos = document.getElementById('pc-posicion');
        const titleEl = document.getElementById('pos-info-title');
        const descEl = document.getElementById('pos-info-desc');
        const attrsEl = document.getElementById('pos-info-attrs');

        zones.forEach(zone => {
            zone.addEventListener('click', () => {
                zones.forEach(z => z.classList.remove('active'));
                zone.classList.add('active');
                
                const pos = zone.getAttribute('data-pos');
                inputPos.value = pos; 
                
                const info = PlayerTemplates.positionInfo[pos];
                titleEl.textContent = pos.toUpperCase();
                descEl.textContent = info.desc;
                
                const highlights = PlayerTemplates.getHighlightedAttributes(pos).join(' · ');
                attrsEl.textContent = highlights;
            });
        });
    }

    static validateAndCreate(form) {
        const errorMsg = document.getElementById('form-error-msg');
        errorMsg.style.display = 'none';
        
        const posInput = document.getElementById('pc-posicion').value;
        if (!posInput) {
            errorMsg.textContent = 'Por favor, seleccioná tu posición en la cancha.';
            errorMsg.style.display = 'block';
            return;
        }

        if (!form.checkValidity()) {
            errorMsg.textContent = 'Por favor, completá todos los campos correctamente.';
            errorMsg.style.display = 'block';
            return;
        }

        const perfilesMap = {
            "Arquero": "Arquero",
            "Defensa": "Central",
            "Mediocampista": "Central",
            "Delantero": "Centro"
        };

        const formData = {
            nombre: document.getElementById('pc-nombre').value,
            apellido: document.getElementById('pc-apellido').value,
            nacionalidad: document.getElementById('pc-nacionalidad').value,
            altura: parseInt(document.getElementById('pc-altura').value),
            peso: parseInt(document.getElementById('pc-peso').value),
            pie: document.getElementById('pc-pie').value,
            
            posicionBase: posInput,
            perfil: perfilesMap[posInput],
            posicion: posInput,

            apariencia: {
                piel: document.getElementById('pc-piel').value,
                pelo: document.getElementById('pc-pelo').value,
                peinado: document.getElementById('pc-peinado').value,
                barba: document.getElementById('pc-barba').value,
                ojos: document.getElementById('pc-ojos').value
            }
        };
        
        const newPlayer = PlayerGenerator.create(formData);
        state.player = newPlayer;
        this.showSummaryScreen(newPlayer);
    }

    static showSummaryScreen(player) {
        document.getElementById('screen-creation').style.display = 'none';
        const summaryScreen = document.getElementById('screen-summary');
        summaryScreen.style.display = 'block';
        
        document.getElementById('sum-ovr').textContent = player.overall;
        document.getElementById('sum-pos-badge').textContent = PlayerTemplates.positionInfo[player.personalData.posicionBase].abbr;
        
        document.getElementById('sum-name').textContent = `${player.personalData.nombre} ${player.personalData.apellido}`;
        document.getElementById('sum-nat').textContent = player.personalData.nacionalidad;
        document.getElementById('sum-age').textContent = `${player.personalData.edad} años`;
        document.getElementById('sum-height').textContent = `${player.personalData.altura} cm`;
        document.getElementById('sum-weight').textContent = `${player.personalData.peso} kg`;
        document.getElementById('sum-foot').textContent = player.personalData.pie;
        
        const attrsContainer = document.getElementById('sum-attributes');
        attrsContainer.innerHTML = '';
        
        const highlighted = PlayerTemplates.getHighlightedAttributes(player.personalData.posicionBase);
        
        for (const [attr, val] of Object.entries(player.attributes)) {
            const el = document.createElement('div');
            el.className = 'attr-row';
            const isHighlight = highlighted.includes(attr);
            el.innerHTML = `<span class="${isHighlight ? 'attr-highlight' : ''}">${attr} ${isHighlight ? '★' : ''}</span> <strong>${val}</strong>`;
            attrsContainer.appendChild(el);
        }
    }
}