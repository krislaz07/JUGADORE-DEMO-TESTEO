import { PlayerTemplates } from './playerTemplates.js';

export class PlayerGenerator {
    static create(formData) {
        formData.edad = 16;
        const attributes = this.generateAttributes(formData.posicionBase);
        const overall = PlayerTemplates.calculateOVR(attributes, formData.posicionBase);
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

    static generateAttributes(positionBase) {
        const attrs = {};
        
        const positionWeights = {
            "Arquero": { "Anticipación": 1.2, "Posicionamiento": 1.2, "Mentalidad": 1.1, "Fuerza": 1.1, "Control": 1.0, "Definición": 0.3, "Regate": 0.4 },
            "Defensa": { "Marcaje": 1.2, "Entrada": 1.2, "Fuerza": 1.1, "Anticipación": 1.1, "Posicionamiento": 1.1, "Definición": 0.5, "Regate": 0.7 },
            "Mediocampista": { "Pase": 1.2, "Visión": 1.2, "Control": 1.1, "Técnica": 1.1, "Mentalidad": 1.1 },
            "Delantero": { "Definición": 1.2, "Potencia de tiro": 1.1, "Aceleración": 1.1, "Fuerza": 1.0, "Entrada": 0.5, "Marcaje": 0.5 }
        };

        const weights = positionWeights[positionBase] || {};
        const templateWeights = PlayerTemplates.weights[positionBase] || {};

        PlayerTemplates.attributesList.forEach(attr => {
            let baseValue = Math.floor(Math.random() * 15) + 20; 
            const tWeight = templateWeights[attr] || 1;
            if (tWeight === 3) baseValue += 15; 
            if (tWeight === 2) baseValue += 8;
            
            let variance = Math.floor(Math.random() * 9) - 3;
            let rawValue = baseValue + variance;

            const pWeight = weights[attr] || 1.0;
            let statFinal = Math.floor(rawValue * pWeight);

            attrs[attr] = Math.min(99, Math.max(1, statFinal));
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