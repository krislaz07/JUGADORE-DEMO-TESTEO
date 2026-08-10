import { PlayerTemplates } from './playerTemplates.js';

export class PlayerGenerator {
    static create(formData) {
        // Fijar edad en 16
        formData.edad = 16;
        
        const attributes = this.generateAttributes(formData.posicion);
        const overall = PlayerTemplates.calculateOVR(attributes, formData.posicion);
        const potential = Math.floor(Math.random() * (95 - 65 + 1)) + 65;

        return {
            personalData: { ...formData },
            attributes: attributes,
            overall: overall,
            potential: potential, 
            personality: this.generatePersonality(),
            playerCareer: {}, stats: {}, contracts: {}, finances: {}, injuries: {}, history: {}, objectives: {}
        };
    }

    static generateAttributes(position) {
        const attrs = {};
        const weights = PlayerTemplates.weights[position] || {};

        PlayerTemplates.attributesList.forEach(attr => {
            // Base mucho más baja para empezar en OVR 40-50
            let baseValue = Math.floor(Math.random() * 15) + 20; 
            const weight = weights[attr] || 1;

            if (weight === 3) baseValue += 15; // Atributos clave un poco mejores
            if (weight === 2) baseValue += 8;

            const variance = Math.floor(Math.random() * 9) - 3;
            attrs[attr] = Math.min(99, Math.max(1, baseValue + variance));
        });
        
        return attrs;
    }

    static generatePersonality() {
        const traits = ['Profesionalismo', 'Ambición', 'Disciplina', 'Liderazgo', 'Temperamento'];
        const personality = {};
        traits.forEach(t => { personality[t] = Math.floor(Math.random() * 99) + 1; });
        return personality;
    }
}