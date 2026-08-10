export const PlayerTemplates = {
    // ELIMINADO: 'Pase Largo'. AGREGADO: 'Mentalidad'
    attributesList: [
        'Velocidad', 'Aceleración', 'Resistencia', 'Fuerza', 'Pase', 'Mentalidad',
        'Técnica', 'Control', 'Regate', 'Visión', 'Definición', 'Potencia de tiro',
        'Marcaje', 'Entrada', 'Posicionamiento', 'Anticipación'
    ],
    weights: {
        "Arquero": { "Posicionamiento": 3, "Anticipación": 3, "Fuerza": 2, "Pase": 2, "Mentalidad": 1 },
        "Lateral Derecho": { "Velocidad": 3, "Resistencia": 3, "Marcaje": 2, "Entrada": 2, "Pase": 2 },
        "Lateral Izquierdo": { "Velocidad": 3, "Resistencia": 3, "Marcaje": 2, "Entrada": 2, "Pase": 2 },
        "Defensor Central": { "Fuerza": 3, "Marcaje": 3, "Entrada": 3, "Anticipación": 2, "Mentalidad": 2 },
        "Mediocampista Defensivo": { "Resistencia": 3, "Marcaje": 3, "Posicionamiento": 3, "Entrada": 2, "Mentalidad": 2 },
        "Mediocampista Central": { "Pase": 3, "Control": 3, "Técnica": 2, "Visión": 2, "Mentalidad": 2 },
        "Mediocampista Ofensivo": { "Visión": 3, "Pase": 3, "Regate": 3, "Control": 2, "Mentalidad": 2 },
        "Extremo Derecho": { "Velocidad": 3, "Aceleración": 3, "Regate": 2, "Control": 2, "Técnica": 2 },
        "Extremo Izquierdo": { "Velocidad": 3, "Aceleración": 3, "Regate": 2, "Control": 2, "Técnica": 2 },
        "Delantero": { "Definición": 3, "Potencia de tiro": 3, "Regate": 2, "Velocidad": 2, "Aceleración": 2, "Posicionamiento": 2, "Mentalidad": 1 }
    },
    getHighlightedAttributes: function(position) {
        const w = this.weights[position] || {};
        return Object.keys(w).filter(attr => w[attr] >= 2);
    },
    calculateOVR: function(attributes, position) {
        const w = this.weights[position] || {};
        let totalWeight = 0;
        let weightedSum = 0;

        for (const [attr, val] of Object.entries(attributes)) {
            const weight = w[attr] || 1;
            weightedSum += (val * weight);
            totalWeight += weight;
        }
        
        return Math.floor(weightedSum / totalWeight);
    }
};