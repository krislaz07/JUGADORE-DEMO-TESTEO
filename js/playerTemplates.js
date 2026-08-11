export const PlayerTemplates = {
    attributesList: [
        'Velocidad', 'Aceleración', 'Resistencia', 'Fuerza', 'Pase', 'Mentalidad',
        'Técnica', 'Control', 'Regate', 'Visión', 'Definición', 'Potencia de tiro',
        'Marcaje', 'Entrada', 'Posicionamiento', 'Anticipación'
    ],
    weights: {
        "Arquero": { "Posicionamiento": 3, "Anticipación": 3, "Fuerza": 2, "Pase": 2, "Mentalidad": 1 },
        "Defensa": { "Marcaje": 3, "Entrada": 3, "Fuerza": 3, "Anticipación": 2, "Velocidad": 2, "Resistencia": 2 },
        "Mediocampista": { "Pase": 3, "Visión": 3, "Control": 3, "Técnica": 2, "Resistencia": 2, "Mentalidad": 2 },
        "Delantero": { "Definición": 3, "Velocidad": 3, "Aceleración": 3, "Potencia de tiro": 3, "Regate": 2, "Técnica": 2 }
    },
    positionInfo: {
        "Arquero": { abbr: "ARQ", desc: "La última línea. Posicionamiento, anticipación y fuerza son fundamentales." },
        "Defensa": { abbr: "DEF", desc: "Tu trabajo es recuperar, anticipar y proteger el arco." },
        "Mediocampista": { abbr: "MD", desc: "Conectás el equipo. Pase, visión y control son tus principales herramientas." },
        "Delantero": { abbr: "DL", desc: "Vivís cerca del área. Definición, velocidad y regate son tus principales armas." }
    },
    getHighlightedAttributes: function(positionBase) {
        const w = this.weights[positionBase] || {};
        return Object.keys(w).filter(attr => w[attr] >= 2);
    },
    calculateOVR: function(attributes, positionBase) {
        const w = this.weights[positionBase] || {};
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