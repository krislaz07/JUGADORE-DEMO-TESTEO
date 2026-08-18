export function getFamaRank(level) {
    if (level >= 15) return "Leyenda";
    if (level >= 12) return "Superestrella";
    if (level >= 9) return "Estrella";
    if (level >= 6) return "Figura";
    if (level >= 4) return "Reconocido";
    if (level >= 2) return "Promesa";
    return "Desconocido";
}

export function getFamaRequirement(level) {
    if (level < 5) return 10 + (level * 5); 
    return 30 + ((level - 4) * 10); 
}

export function getDifficultyTag(difficulty) {
    if (difficulty >= 85) return "Candidato al título";
    if (difficulty >= 75) return "Equipo fuerte";
    if (difficulty >= 65) return "Competitivo";
    return "Equipo débil";
}

export const DEBUG_MODE = true; 

export const state = {
    player: null,
    originalAttributes: null, 
    currentScreen: 'main-menu',
    lastMatchResult: null,
    
    settings: {
        matchSpeed: 1 
    },
    
    debugSettings: {
        minigameDifficulty: 40 
    },

    career: {
        club: '', // Asignado dinámicamente al crear
        clubDifficulty: 50,
        season: 1,
        currentMatchIndex: 0,
        
        level: 1,
        xp: 0,
        xpToNextLevel: 100,
        devPoints: 0, 
        
        famaLevel: 0,
        famaPoints: 0,
        famaToNextLevel: 10,
        stats: {
            matchesPlayed: 0, goals: 0, assists: 0, matchRatings: [] 
        },
        
        // NUEVAS PROPIEDADES LIGA
        fixture: [],
        standings: []
    }
};

export function normalizePlayerPosition(player) {
    if (!player || !player.personalData) return;
    if (player.personalData.posicionBase) return;

    const oldPos = player.personalData.posicion;
    let base = "Delantero";
    let perfil = "Centro";

    switch(oldPos) {
        case "Arquero": base = "Arquero"; perfil = "Arquero"; break;
        case "Defensor Central": base = "Defensa"; perfil = "Central"; break;
        case "Lateral Derecho": case "Lateral Izquierdo": base = "Defensa"; perfil = "Lateral"; break;
        case "Mediocampista Defensivo": base = "Mediocampista"; perfil = "Defensivo"; break;
        case "Mediocampista Central": case "Mediocampista": base = "Mediocampista"; perfil = "Central"; break;
        case "Mediocampista Ofensivo": base = "Mediocampista"; perfil = "Ofensivo"; break;
        case "Extremo Derecho": case "Extremo Izquierdo": base = "Delantero"; perfil = "Extremo"; break;
        case "Delantero": base = "Delantero"; perfil = "Centro"; break;
    }

    player.personalData.posicionBase = base;
    player.personalData.perfil = perfil;
    player.personalData.posicion = base;
}