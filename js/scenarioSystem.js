export class ScenarioSystem {
    static lastScenarioId = null;

    static calculateOpportunityQuality({ positioning, opponentDifficulty, contextModifiers = {} }) {
        const azar = Math.floor(Math.random() * 31) - 15;
        const presionRival = (opponentDifficulty - 50) * 0.5;
        let puntaje = positioning + azar - presionRival;
        if (contextModifiers.localia) puntaje += contextModifiers.localia;
        puntaje = Math.max(0, Math.min(100, puntaje));
        
        let calidad = "";
        if (puntaje <= 29) calidad = "mala";
        else if (puntaje <= 54) calidad = "normal";
        else if (puntaje <= 74) calidad = "buena";
        else calidad = "peligrosa";
        return { puntaje, calidad };
    }

    static getScenario(playerPositionBase, quality) {
        let validScenarios = this.scenarios.filter(s => s.positions.includes(playerPositionBase) && s.quality.includes(quality));
        
        if (validScenarios.length === 0) {
            validScenarios = this.scenarios.filter(s => s.positions.includes(playerPositionBase));
        }

        if (validScenarios.length > 1 && this.lastScenarioId) {
            const noRep = validScenarios.filter(s => s.id !== this.lastScenarioId);
            if (noRep.length > 0) validScenarios = noRep;
        }

        if (validScenarios.length > 0) {
            const picked = validScenarios[Math.floor(Math.random() * validScenarios.length)];
            this.lastScenarioId = picked.id;
            return picked;
        }
        
        return this.scenarios.find(s => s.positions.includes(playerPositionBase));
    }

    static scenarios = [
        // --- ARQUERO ---
        {
            id: "gk_mn_1", positions: ["Arquero"], quality: ["mala", "normal", "buena"],
            title: "Centro cruzado al área", description: "Viene una pelota llovida y hay muchos jugadores en el área.",
            actions: [
                { text: "Salir a descolgar", type: "action", reqAttr: "Posicionamiento + Anticipación + Fuerza", desc: "Intentás atraparla en el aire.", calc: { "Posicionamiento": 0.4, "Anticipación": 0.4, "Fuerza": 0.2 }, statCategory: "tackle", chainChance: 0, successMsg: "Te quedaste con la pelota en lo alto.", failMsg: "Saliste a destiempo, pero el cabezazo rival se fue desviado." },
                { text: "Rechazar de puños", type: "action", reqAttr: "Fuerza + Anticipación", desc: "Reventás la pelota lejos.", calc: { "Fuerza": 0.6, "Anticipación": 0.4 }, statCategory: "tackle", chainChance: 0, failChainChance: 1.0, failChainQuality: "segunda_pelota", successMsg: "Puñetazo firme que aleja el peligro.", failMsg: "Rechazo corto al borde del área." },
                { text: "Quedarse en la línea", type: "action", reqAttr: "Posicionamiento + Anticipación", desc: "Confiás en tus reflejos bajo los palos.", calc: { "Posicionamiento": 0.6, "Anticipación": 0.4 }, statCategory: "tackle", chainChance: 0.3, chainQuality: "buena", successMsg: "Bien ubicado, te quedaste con el cabezazo.", failMsg: "Te anticiparon de cerca, pero la pelota dio en el travesaño." }
            ]
        },
        {
            id: "gk_segunda_pelota", positions: ["Arquero"], quality: ["segunda_pelota"], 
            title: "¡Segunda pelota!", description: "Un rival captura el rebote al borde del área y remata rápido.",
            actions: [
                { text: "Volar al palo", type: "action", reqAttr: "Anticipación + Control + Aceleración", desc: "Te estirás para intentar desviar el tiro.", calc: { "Anticipación": 0.4, "Control": 0.4, "Aceleración": 0.2 }, statCategory: "tackle", chainChance: 0, concedesGoalOnFail: true, successMsg: "¡Espectacular volada! Evitaste el gol en la segunda jugada.", failMsg: "El remate iba muy esquinado y no llegaste a tocarla." },
                { text: "Quedarse firme", type: "action", reqAttr: "Posicionamiento + Mentalidad + Fuerza", desc: "Te parás fuerte confiando en tu ubicación.", calc: { "Posicionamiento": 0.5, "Mentalidad": 0.3, "Fuerza": 0.2 }, statCategory: "tackle", chainChance: 0, concedesGoalOnFail: true, successMsg: "El remate fue al medio y lo contuviste con seguridad.", failMsg: "El tiro te venció por potencia y se metió." }
            ]
        },
        {
            id: "gk_mn_2", positions: ["Arquero"], quality: ["mala", "normal"],
            title: "Pase atrás comprometido", description: "Tu defensor te la da exigida por la presión del 9 rival.",
            actions: [
                { text: "Reventar arriba", type: "action", reqAttr: "Fuerza + Pase", desc: "Despejás sin dudar.", calc: { "Fuerza": 0.6, "Pase": 0.4 }, statCategory: "pass", chainChance: 0, successMsg: "Pelotazo a dividir lejos de tu arco.", failMsg: "Le erraste a la pelota y la mandaste al lateral." },
                { text: "Pase corto al lateral", type: "action", reqAttr: "Pase + Control", desc: "Salís jugando rasante.", calc: { "Pase": 0.6, "Control": 0.4 }, statCategory: "pass", chainChance: 0.3, chainQuality: "normal", failChainChance: 1.0, failChainQuality: "peligrosa", successMsg: "Salida limpia con los pies.", failMsg: "¡Pase interceptado en el borde del área!" },
                { text: "Amagar al delantero", type: "action", reqAttr: "Control + Pase + Técnica", desc: "Frenás la pelota y dejás pasar de largo al 9.", calc: { "Control": 0.5, "Pase": 0.3, "Técnica": 0.2 }, statCategory: "dribble", chainChance: 1.0, chainQuality: "buena", failChainChance: 1.0, failChainQuality: "peligrosa", successMsg: "¡Hielos en las venas! Lo dejaste pasando de largo.", failMsg: "Te adivinó el amague y te robó la pelota." }
            ]
        },
        {
            id: "gk_bp_1", positions: ["Arquero"], quality: ["peligrosa"], 
            title: "¡Mano a mano inminente!", description: "El atacante rival rompió la línea y se te viene encima.",
            actions: [
                { text: "Achicar rápido", type: "action", reqAttr: "Aceleración + Anticipación + Velocidad", desc: "Salís rápido para cerrarle el ángulo.", calc: { "Aceleración": 0.4, "Anticipación": 0.4, "Velocidad": 0.2 }, statCategory: "tackle", chainChance: 0, concedesGoalOnFail: true, successMsg: "Gran achique, le bloqueaste todo el arco.", failMsg: "Te definió por arriba antes de que llegues." },
                { text: "Aguantar parado", type: "action", reqAttr: "Posicionamiento + Mentalidad", desc: "Te quedás firme esperando el error.", calc: { "Posicionamiento": 0.6, "Mentalidad": 0.4 }, statCategory: "tackle", chainChance: 0, concedesGoalOnFail: true, successMsg: "Le ganaste el duelo psicológico y atajaste el remate.", failMsg: "Te cruzó el remate, inatajable." },
                { text: "Tirarse a los pies", type: "action", reqAttr: "Fuerza + Anticipación", desc: "Vas directo a barrer la pelota.", calc: { "Fuerza": 0.6, "Anticipación": 0.4 }, statCategory: "tackle", chainChance: 0, failChainChance: 1.0, failChainQuality: "penalti_en_contra", successMsg: "¡Salvada heroica tirándote a los pies!", failMsg: "Llegaste tardísimo a la pelota. ¡Falta en el área!" }
            ]
        },
        {
            id: "gk_penal", positions: ["Arquero"], quality: ["penalti_en_contra"], 
            title: "PENAL EN CONTRA", description: "El rival acomoda la pelota en el punto blanco.",
            actions: [
                { text: "Tirarse a la izquierda", type: "action", reqAttr: "Anticipación + Mentalidad", desc: "Adivinás que va cruzado.", calc: { "Anticipación": 0.6, "Mentalidad": 0.4 }, statCategory: "tackle", chainChance: 0, concedesGoalOnFail: true, isPenalty: true, successMsg: "¡ATAJASTE EL PENAL! Espectacular volada a la izquierda.", failMsg: "La tiró al otro lado y te engañó por completo." },
                { text: "Quedarse en el centro", type: "action", reqAttr: "Mentalidad + Posicionamiento", desc: "Confiás en que la pique o tire al medio.", calc: { "Mentalidad": 0.6, "Posicionamiento": 0.4 }, statCategory: "tackle", chainChance: 0, concedesGoalOnFail: true, isPenalty: true, successMsg: "¡ATAJASTE EL PENAL! Te quedaste parado y te llegó a las manos.", failMsg: "Te fusiló a un costado." },
                { text: "Tirarse a la derecha", type: "action", reqAttr: "Anticipación + Mentalidad", desc: "Adivinás que va abierto.", calc: { "Anticipación": 0.6, "Mentalidad": 0.4 }, statCategory: "tackle", chainChance: 0, concedesGoalOnFail: true, isPenalty: true, successMsg: "¡ATAJASTE EL PENAL! Gran estirada abajo a la derecha.", failMsg: "Entró con lo justo por el palo opuesto." }
            ]
        },

        // --- DEFENSA ---
        {
            id: "def_mn_1", positions: ["Defensa"], quality: ["mala", "normal", "buena"],
            title: "Salida presionada", description: "Recibís la pelota y el equipo rival presiona alto.",
            actions: [
                { text: "Pase corto seguro", type: "action", reqAttr: "Pase + Control", desc: "Buscás al pivot en el medio.", calc: { "Pase": 0.6, "Control": 0.4 }, statCategory: "pass", chainChance: 0.3, chainQuality: "normal", successMsg: "Salida prolija rompiendo la primera presión.", failMsg: "Pase defectuoso, pero tu compañero logró rehacerse." },
                { text: "Reventar", type: "action", reqAttr: "Fuerza + Pase", desc: "No te complicás y la tirás larga.", calc: { "Fuerza": 0.6, "Pase": 0.4 }, statCategory: "pass", chainChance: 0, successMsg: "Despeje largo, a reorganizarse.", failMsg: "Despeje corto que se pierde por un costado." },
                { text: "Cubrir con el cuerpo", type: "action", reqAttr: "Fuerza + Control", desc: "Buscás la falta a favor.", calc: { "Fuerza": 0.6, "Control": 0.4 }, statCategory: "dribble", chainChance: 0.3, chainQuality: "normal", successMsg: "Ganaste el foul a favor.", failMsg: "Te ganaron con el cuerpo limpiamente." }
            ]
        },
        {
            id: "def_mn_2", positions: ["Defensa"], quality: ["mala", "normal"],
            title: "Atacante encarando", description: "El extremo rival te busca el 1 vs 1 por la banda.",
            actions: [
                { text: "Temporizar", type: "action", reqAttr: "Marcaje + Posicionamiento", desc: "Retrocedés agachado para no dar espacios.", calc: { "Marcaje": 0.6, "Posicionamiento": 0.4 }, statCategory: "tackle", chainChance: 0.4, chainQuality: "buena", successMsg: "Lo fuiste llevando hasta que perdió la pelota.", failMsg: "Te recortó hacia adentro, pero el centro fue despejado." },
                { text: "Tackle agresivo", type: "action", reqAttr: "Entrada + Fuerza", desc: "Vas al piso a barrer la pelota.", calc: { "Entrada": 0.6, "Fuerza": 0.4 }, statCategory: "tackle", chainChance: 1.0, chainQuality: "buena", successMsg: "¡Robo impecable! Te quedaste la pelota.", failMsg: "Falta fuerte al costado del área." },
                { text: "Puntear el balón", type: "action", reqAttr: "Anticipación + Entrada", desc: "Metés el pie justo cuando adelanta la pelota.", calc: { "Anticipación": 0.6, "Entrada": 0.4 }, statCategory: "tackle", chainChance: 0.5, chainQuality: "buena", successMsg: "Punteada justa al lateral.", failMsg: "Punteaste el aire, aunque la jugada no prosperó." }
            ]
        },
        {
            id: "def_bp_1", positions: ["Defensa"], quality: ["buena", "peligrosa"],
            title: "¡Contragolpe rival!", description: "El equipo quedó descompensado y se viene un 2 vs 1.",
            actions: [
                { text: "Cortar línea de pase", type: "action", reqAttr: "Anticipación + Posicionamiento", desc: "Adivinás dónde va la pelota.", calc: { "Anticipación": 0.6, "Posicionamiento": 0.4 }, statCategory: "tackle", chainChance: 1.0, chainQuality: "normal", successMsg: "¡Lectura de maestro! Interceptaste el pase clave.", failMsg: "Te equivocaste de línea, pero el delantero rival perdonó." },
                { text: "Tackle salvador", type: "action", reqAttr: "Entrada + Aceleración", desc: "Te jugás la vida yendo al piso al último hombre.", calc: { "Entrada": 0.6, "Aceleración": 0.4 }, statCategory: "tackle", chainChance: 0, successMsg: "¡TREMENDO QUITE! Salvaste una jugada de peligro.", failMsg: "Llegaste tarde. Falta clara al borde del área." },
                { text: "Achicar espacio", type: "action", reqAttr: "Marcaje + Mentalidad", desc: "Salís a presionar al poseedor para que decida rápido.", calc: { "Marcaje": 0.6, "Mentalidad": 0.4 }, statCategory: "tackle", chainChance: 0, successMsg: "Lo pusiste nervioso y forzaste un mal tiro.", failMsg: "Te pasó en velocidad, aunque tu arquero salvó la situación." }
            ]
        },

        // --- MEDIOCAMPISTA ---
        {
            id: "mid_mn_1", positions: ["Mediocampista"], quality: ["mala", "normal"],
            title: "Balón en el círculo central", description: "Recibís con la marca encima y poco espacio.",
            actions: [
                { text: "Tocar atrás", type: "action", reqAttr: "Pase + Control", desc: "Asegurás con los centrales.", calc: { "Pase": 0.6, "Control": 0.4 }, statCategory: "pass", chainChance: 0.3, chainQuality: "normal", successMsg: "Pase de seguridad completado.", failMsg: "Pase corto impreciso que se va afuera." },
                { text: "Giro para perfilarse", type: "action", reqAttr: "Control + Técnica", desc: "Amagás el toque atrás y girás hacia adelante.", calc: { "Control": 0.6, "Técnica": 0.4 }, statCategory: "dribble", chainChance: 1.0, chainQuality: "buena", successMsg: "Gran control orientado, limpiaste la zona.", failMsg: "Te leyeron el giro sin consecuencias graves." },
                { text: "Proteger el balón", type: "action", reqAttr: "Fuerza + Control", desc: "Ponés el cuerpo para esperar que abran la cancha.", calc: { "Fuerza": 0.6, "Control": 0.4 }, statCategory: "dribble", chainChance: 0.5, chainQuality: "normal", successMsg: "Pusiste el cuerpo y forzaste la falta.", failMsg: "Te ganaron la posesión en el medio." }
            ]
        },
        {
            id: "mid_bp_1", positions: ["Mediocampista"], quality: ["buena", "peligrosa"],
            title: "¡Recuperación alta!", description: "El rival quedó mal parado y tenés la pelota a 30 metros del arco.",
            actions: [
                { text: "Pase filtrado rápido", type: "action", reqAttr: "Visión + Pase", desc: "Buscás al delantero que pica al espacio.", calc: { "Visión": 0.6, "Pase": 0.4 }, statCategory: "assist", chainChance: 0, successMsg: "¡Pase quirúrgico! Dejaste a tu compañero con ventaja.", failMsg: "El pase fue muy exigido y lo cortaron." },
                { text: "Conducción ofensiva", type: "action", reqAttr: "Aceleración + Control", desc: "Avanzás rápido para atraer marcas.", calc: { "Aceleración": 0.6, "Control": 0.4 }, statCategory: "dribble", chainChance: 1.0, chainQuality: "peligrosa", successMsg: "Fijaste a la defensa y abriste huecos.", failMsg: "La llevaste demasiado y chocaste con un central." },
                { text: "Cambio de frente", type: "action", reqAttr: "Visión + Pase", desc: "Lanzás cruzado para el extremo libre.", calc: { "Visión": 0.6, "Pase": 0.4 }, statCategory: "pass", chainChance: 1.0, chainQuality: "buena", successMsg: "Balón largo perfecto al pie.", failMsg: "Pelota demasiado larga que sale por el lateral." }
            ]
        },

        // --- DELANTERO ---
        {
            id: "att_mn_1", positions: ["Delantero"], quality: ["mala", "normal"],
            title: "Recibís de espaldas", description: "El central rival te respira en la nuca.",
            actions: [
                { text: "Descargar de primera", type: "action", reqAttr: "Pase + Control", desc: "Rebotás el balón al medio.", calc: { "Pase": 0.6, "Control": 0.4 }, statCategory: "pass", chainChance: 0.3, chainQuality: "normal", successMsg: "Descarga limpia y segura.", failMsg: "Toque impreciso recuperado por la defensa." },
                { text: "Aguantar con el cuerpo", type: "action", reqAttr: "Fuerza + Control", desc: "Soportás el choque esperando compañía.", calc: { "Fuerza": 0.6, "Control": 0.4 }, statCategory: "dribble", chainChance: 0.4, chainQuality: "normal", successMsg: "Pusiste el cuerpo como un poste.", failMsg: "Te desplazaron fácil." },
                { text: "Girar rápido", type: "action", reqAttr: "Regate + Técnica", desc: "Buscás quedar de frente.", calc: { "Regate": 0.6, "Técnica": 0.4 }, statCategory: "dribble", chainChance: 1.0, chainQuality: "buena", successMsg: "Giro fantástico, quedaste perfilado.", failMsg: "Te trabaron al girar." }
            ]
        },
        {
            id: "att_mn_2", positions: ["Delantero"], quality: ["mala", "normal"],
            title: "Pase impreciso", description: "Te tiran una pedrada difícil de dominar.",
            actions: [
                { text: "Dormirla en el pie", type: "action", reqAttr: "Control + Técnica", desc: "Buscás bajarla suavemente.", calc: { "Control": 0.6, "Técnica": 0.4 }, statCategory: "dribble", chainChance: 0.5, chainQuality: "normal", successMsg: "Control de terciopelo.", failMsg: "La pelota rebotó a dos metros." },
                { text: "Tocar forzado", type: "action", reqAttr: "Pase + Anticipación", desc: "La rozás para cambiarla de zona.", calc: { "Pase": 0.6, "Anticipación": 0.4 }, statCategory: "pass", chainChance: 0.3, chainQuality: "normal", successMsg: "Toque utilitario para salvar la jugada.", failMsg: "Regalo al rival sin peligro inminente." },
                { text: "Control orientado", type: "action", reqAttr: "Control + Velocidad", desc: "Intentás acomodarla hacia adelante.", calc: { "Control": 0.6, "Velocidad": 0.4 }, statCategory: "dribble", chainChance: 1.0, chainQuality: "buena", successMsg: "Control largo que te da ventaja.", failMsg: "Se te fue larga hasta las manos del arquero." }
            ]
        },
        {
            id: "att_bp_1", positions: ["Delantero"], quality: ["buena", "peligrosa"],
            title: "¡Hueco en la defensa!", description: "Tenés espacio por el medio hacia el arco.",
            actions: [
                { text: "Rematar fuerte", type: "shoot", shotType: "power", reqAttr: "Potencia + Definición", desc: "Buscás el gol directo." },
                { text: "Conducir directo", type: "action", reqAttr: "Aceleración + Control", desc: "Te vas derecho contra el arquero.", calc: { "Aceleración": 0.6, "Control": 0.4 }, statCategory: "dribble", chainChance: 1.0, chainQuality: "peligrosa", successMsg: "Ganaste el mano a mano en velocidad.", failMsg: "Te enredaste con la pelota y la perdiste." },
                { text: "Pase al vacío", type: "action", reqAttr: "Visión + Pase", desc: "Viste picar a tu compañero al otro palo.", calc: { "Visión": 0.6, "Pase": 0.4 }, statCategory: "assist", chainChance: 0, successMsg: "¡Pase fenomenal! Oportunidad clarísima creada.", failMsg: "El defensor la interceptó milagrosamente." }
            ]
        },
        {
            id: "att_bp_2", positions: ["Delantero"], quality: ["buena", "peligrosa"],
            title: "Mano a mano esquinado", description: "Pisás el área por un costado.",
            actions: [
                { text: "Tiro colocado", type: "shoot", shotType: "placed", reqAttr: "Definición + Técnica", desc: "Buscás ponerla lejos del arquero." },
                { text: "Pase de la muerte", type: "action", reqAttr: "Pase + Visión", desc: "La cruzás rasante al segundo palo.", calc: { "Pase": 0.6, "Visión": 0.4 }, statCategory: "assist", chainChance: 0, successMsg: "Pase atrás impecable. Oportunidad inmejorable.", failMsg: "Despejó el zaguero cortando la línea de pase." },
                { text: "Amagar y enganchar", type: "action", reqAttr: "Regate + Control", desc: "Buscás el penal o abrir el ángulo.", calc: { "Regate": 0.6, "Control": 0.4 }, statCategory: "dribble", chainChance: 1.0, chainQuality: "peligrosa", successMsg: "¡Enganche brillante! Tenés todo el arco a disposición.", failMsg: "El arquero te sacó la pelota de los pies limpiamente." }
            ]
        }
    ];
}