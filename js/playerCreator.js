import { PlayerGenerator } from './playerGenerator.js';
import { state } from './state.js';
import { PlayerTemplates } from './playerTemplates.js';

export class PlayerCreator {
    static init() {
        const form = document.getElementById('player-creation-form');
        this.setupLivePreview();

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

    static validateAndCreate(form) {
        const errorMsg = document.getElementById('form-error-msg');
        errorMsg.style.display = 'none';

        if (!form.checkValidity()) {
            errorMsg.textContent = 'Por favor, completá todos los campos correctamente.';
            errorMsg.style.display = 'block';
            return;
        }

        const formData = {
            nombre: document.getElementById('pc-nombre').value,
            apellido: document.getElementById('pc-apellido').value,
            nacionalidad: document.getElementById('pc-nacionalidad').value,
            // La edad se fuerza a 16 internamente en el generator, pero pasamos placeholders
            altura: parseInt(document.getElementById('pc-altura').value),
            peso: parseInt(document.getElementById('pc-peso').value),
            posicion: document.getElementById('pc-posicion').value,
            pie: document.getElementById('pc-pie').value,
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
        document.getElementById('sum-pos-badge').textContent = player.personalData.posicion;
        document.getElementById('sum-name').textContent = `${player.personalData.nombre} ${player.personalData.apellido}`;
        document.getElementById('sum-nat').textContent = player.personalData.nacionalidad;
        document.getElementById('sum-age').textContent = `${player.personalData.edad} años`;
        document.getElementById('sum-height').textContent = `${player.personalData.altura} cm`;
        document.getElementById('sum-weight').textContent = `${player.personalData.peso} kg`;
        document.getElementById('sum-foot').textContent = player.personalData.pie;

        const attrsContainer = document.getElementById('sum-attributes');
        attrsContainer.innerHTML = '';
        
        const highlighted = PlayerTemplates.getHighlightedAttributes(player.personalData.posicion);
        
        for (const [attr, val] of Object.entries(player.attributes)) {
            const el = document.createElement('div');
            el.className = 'attr-row';
            const isHighlight = highlighted.includes(attr);
            el.innerHTML = `<span class="${isHighlight ? 'attr-highlight' : ''}">${attr} ${isHighlight ? '⭐' : ''}</span> <strong>${val}</strong>`;
            attrsContainer.appendChild(el);
        }
    }
}