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

    static getScenario(playerPosition, quality) {
        let validScenarios = this.scenarios.filter(s => {
            const matchesPosition = s.positions.some(p => playerPosition.includes(p));
            const matchesQuality = s.quality.includes(quality);
            return matchesPosition && matchesQuality;
        });
        
        if (validScenarios.length > 1 && this.lastScenarioId) {
            const noRep = validScenarios.filter(s => s.id !== this.lastScenarioId);
            if (noRep.length > 0) validScenarios = noRep;
        }

        if (validScenarios.length > 0) {
            const picked = validScenarios[Math.floor(Math.random() * validScenarios.length)];
            this.lastScenarioId = picked.id;
            return picked;
        }
        
        return this.scenarios[0];
    }

    static scenarios = [
        // --- DELANTEROS / EXTREMOS / MCO (Mala/Normal) ---
        {
            id: "att_mn_1", positions: ["Delantero", "Extremo", "Ofensivo"], quality: ["mala", "normal"],
            title: "Recibís de espaldas", description: "Un defensor te marca muy de cerca.",
            actions: [
                { 
                    text: "Descargar rápido", type: "action", reqAttr: "Pase + Control", 
                    desc: "Jugás de primera hacia atrás para asegurar la pelota.", calc: { "Pase": 0.6, "Control": 0.4 },
                    statCategory: "pass", chainChance: 0.3, chainQuality: "normal", // Construcción
                    successMsg: "Pase de primera seguro. Mantenés la posesión.", 
                    critSuccessMsg: "¡Toque sutil de primera que oxigena la jugada!", 
                    failMsg: "El pase fue impreciso y regalaste la pelota bajo presión."
                },
                { 
                    text: "Aguantar la pelota", type: "action", reqAttr: "Fuerza + Control", 
                    desc: "Protegés el balón de espaldas esperando apoyo.", calc: { "Fuerza": 0.6, "Control": 0.4 },
                    statCategory: "dribble", chainChance: 0.5, chainQuality: "normal", // Construcción (Pausa)
                    successMsg: "Pusiste bien el cuerpo y aguantaste la marca.", 
                    critSuccessMsg: "¡Muralla! Chocaste al defensor y te ganaste el espacio para jugar.", 
                    failMsg: "Te desplazaron físicamente y perdiste el balón."
                },
                { 
                    text: "Girar y encarar", type: "action", reqAttr: "Regate + Técnica + Control", 
                    desc: "Intentás un movimiento brusco para sacarte la marca.", calc: { "Regate": 0.5, "Técnica": 0.3, "Control": 0.2 },
                    statCategory: "dribble", chainChance: 1.0, chainQuality: "buena", // Progresión (Garantiza cadena pero a zona "buena", no directo al mano a mano)
                    successMsg: "¡Gran giro! Dejaste pagando a tu marcador.", 
                    critSuccessMsg: "¡QUÉ GIRO DE CRACK! Lo dejaste en el piso y encarás con ventaja.", 
                    failMsg: "Te adivinaron la intención al girar y te la robaron."
                }
            ]
        },
        {
            id: "att_mn_2", positions: ["Delantero", "Extremo", "Ofensivo"], quality: ["mala", "normal"],
            title: "Balón dividido", description: "La pelota cae cerca del área pero hay un rival al lado.",
            actions: [
                { 
                    text: "Meter el cuerpo", type: "action", reqAttr: "Fuerza + Anticipación", 
                    desc: "Chocás físicamente para ganar la posición.", calc: { "Fuerza": 0.6, "Anticipación": 0.4 },
                    statCategory: "dribble", chainChance: 1.0, chainQuality: "normal", // Progresión
                    successMsg: "Ganaste la posición con pura potencia.", 
                    critSuccessMsg: "¡Tremendo choque! Lo mandaste a volar y te quedaste la pelota.", 
                    failMsg: "Te primerearon y perdiste el duelo."
                },
                { 
                    text: "Tocar de primera", type: "action", reqAttr: "Pase + Anticipación + Técnica", 
                    desc: "Punteás la pelota hacia un compañero cercano.", calc: { "Pase": 0.5, "Anticipación": 0.3, "Técnica": 0.2 },
                    statCategory: "pass", chainChance: 0.4, chainQuality: "buena", // Construcción
                    successMsg: "Punteaste la pelota rápido y seguro.", 
                    critSuccessMsg: "¡Anticipo de cirujano para tocarla impecable!", 
                    failMsg: "Llegaste un segundo tarde al toque."
                },
                { 
                    text: "Control orientado", type: "action", reqAttr: "Control + Velocidad", 
                    desc: "Tirás la pelota al espacio para ganar por velocidad.", calc: { "Control": 0.6, "Velocidad": 0.4 },
                    statCategory: "dribble", chainChance: 1.0, chainQuality: "buena", // Progresión
                    successMsg: "Control largo excelente, ganaste espacio.", 
                    critSuccessMsg: "¡Un toque y a correr! Dejaste al rival clavado en el piso.", 
                    failMsg: "Se te fue larga en el control y la perdiste."
                }
            ]
        },
        {
            id: "att_mn_3", positions: ["Delantero", "Extremo", "Ofensivo"], quality: ["mala", "normal"],
            title: "Pase incómodo", description: "Te tiran la pelota forzada contra la banda.",
            actions: [
                { 
                    text: "Pisar y frenar", type: "action", reqAttr: "Control + Técnica", 
                    desc: "Frenás la jugada para ordenar el ataque.", calc: { "Control": 0.6, "Técnica": 0.4 },
                    statCategory: "dribble", chainChance: 0.5, chainQuality: "normal", // Construcción
                    successMsg: "Pisaste la pelota inteligentemente para pausar el juego.", 
                    critSuccessMsg: "Control de taco exquisito para limpiar la jugada.", 
                    failMsg: "Trastabillaste al intentar controlar."
                },
                { 
                    text: "Rebote atrás", type: "action", reqAttr: "Pase + Visión", 
                    desc: "Devolvés de espaldas para oxigenar la jugada.", calc: { "Pase": 0.6, "Visión": 0.4 },
                    statCategory: "pass", chainChance: 0.3, chainQuality: "normal", // Construcción
                    successMsg: "Rebote limpio hacia el mediocampo.", 
                    critSuccessMsg: "Toque de memoria hacia atrás, pura visión periférica.", 
                    failMsg: "Pase atrás mal dado, generaste un contragolpe."
                },
                { 
                    text: "Desbordar", type: "action", reqAttr: "Velocidad + Regate + Aceleración", 
                    desc: "Acelerás por la línea esquivando al lateral rival.", calc: { "Velocidad": 0.4, "Regate": 0.4, "Aceleración": 0.2 },
                    statCategory: "dribble", chainChance: 1.0, chainQuality: "peligrosa", // Progresión a zona de centro o tiro
                    successMsg: "¡Pura explosión! Le ganaste en velocidad por la banda.", 
                    critSuccessMsg: "¡Le tiraste la pelota larga y lo destrozaste en velocidad!", 
                    failMsg: "El lateral te cerró bien los caminos."
                }
            ]
        },
        
        // --- DELANTEROS / EXTREMOS / MCO (Buena/Peligrosa) ---
        {
            id: "att_bp_1", positions: ["Delantero", "Extremo", "Ofensivo"], quality: ["buena", "peligrosa"],
            title: "¡Hueco a espaldas de la defensa!", description: "Picaste perfecto y tenés ventaja.",
            actions: [
                { text: "Rematar de primera", type: "shoot", shotType: "first_time", reqAttr: "Definición + Mentalidad", desc: "Le pegás antes de que cierre el central (Abre minijuego)." },
                { 
                    text: "Pase al medio", type: "action", reqAttr: "Visión + Pase", 
                    desc: "Buscás a un compañero mejor ubicado en el área.", calc: { "Visión": 0.6, "Pase": 0.4 },
                    statCategory: "assist", chainChance: 0, // Definición (Finaliza tu intervención)
                    successMsg: "¡Gran pase al medio! Dejás a tu compañero de cara al arco.", 
                    critSuccessMsg: "¡Pase de la muerte increíble! El delantero recibe solo con el arco vacío.", 
                    failMsg: "El central interceptó providencialmente el pase."
                },
                { 
                    text: "Encarar al arquero", type: "action", reqAttr: "Regate + Control + Técnica", 
                    desc: "Intentás eludir al arquero para definir con arco libre.", calc: { "Regate": 0.5, "Control": 0.3, "Técnica": 0.2 },
                    statCategory: "dribble", chainChance: 1.0, chainQuality: "peligrosa", // Progresión
                    successMsg: "¡Gambeta hermosa! Te abriste el espacio para definir.", 
                    critSuccessMsg: "¡Desparramaste al arquero! Te quedó servida para empujarla.", 
                    failMsg: "El arquero te adivinó la intención y te sacó el balón de los pies."
                }
            ]
        },
        {
            id: "att_bp_2", positions: ["Delantero", "Extremo", "Ofensivo"], quality: ["buena", "peligrosa"],
            title: "Perfilado en el área", description: "Recibís con tiempo frente al arco.",
            actions: [
                { text: "Remate colocado", type: "shoot", shotType: "placed", reqAttr: "Definición + Técnica", desc: "Buscás el palo más lejano (Abre minijuego)." },
                { text: "Romperle el arco", type: "shoot", shotType: "power", reqAttr: "Potencia + Definición", desc: "Tirás un misil al primer palo (Abre minijuego)." },
                { 
                    text: "Pase de la muerte", type: "action", reqAttr: "Visión + Pase + Técnica", 
                    desc: "Tocás atrás para el que entra de frente.", calc: { "Visión": 0.5, "Pase": 0.3, "Técnica": 0.2 },
                    statCategory: "assist", chainChance: 0, // Definición
                    successMsg: "Pase rasante perfecto que deja a tu compañero mano a mano.", 
                    critSuccessMsg: "¡Pase no-look fenomenal! La defensa rival quedó desarmada.", 
                    failMsg: "No levantaste la cabeza y la tiraste a los pies del rival."
                }
            ]
        },
        {
            id: "att_bp_3", positions: ["Delantero", "Extremo", "Ofensivo"], quality: ["buena", "peligrosa"],
            title: "Espacio entre líneas", description: "Estás libre detrás de los volantes rivales.",
            actions: [
                { 
                    text: "Pase filtrado", type: "action", reqAttr: "Visión + Pase + Técnica", 
                    desc: "Metés una pelota profunda rompiendo la defensa.", calc: { "Visión": 0.5, "Pase": 0.3, "Técnica": 0.2 },
                    statCategory: "assist", chainChance: 0, // Definición de jugada para vos, oportunidad para el compañero
                    successMsg: "Pase filtrado milimétrico que rompe líneas. ¡Dejaste a un compañero con ventaja!", 
                    critSuccessMsg: "¡Una pincelada! Pase quirúrgico que deja a tu compañero completamente solo.", 
                    failMsg: "El pase rebotó en los defensores."
                },
                { text: "Probar de afuera", type: "shoot", shotType: "long_shot", reqAttr: "Potencia + Mentalidad", desc: "Adelantás la pelota y rematás de media distancia." },
                { 
                    text: "Conducir al área", type: "action", reqAttr: "Aceleración + Control + Regate", 
                    desc: "Encarás de frente a los centrales rivales.", calc: { "Aceleración": 0.5, "Control": 0.3, "Regate": 0.2 },
                    statCategory: "dribble", chainChance: 1.0, chainQuality: "peligrosa", // Progresión
                    successMsg: "Conducción rapidísima hacia la medialuna.", 
                    critSuccessMsg: "Encaraste en velocidad y se le abrieron las aguas a la defensa.", 
                    failMsg: "Adelantaste demasiado el balón y te lo robaron."
                }
            ]
        },
        
        // --- MEDIOCAMPISTAS ---
        {
            id: "mid_mn_1", positions: ["Mediocampista Central", "Defensivo"], quality: ["mala", "normal"],
            title: "Pelota en mitad de cancha", description: "El rival está replegado esperándote.",
            actions: [
                { 
                    text: "Pase seguro", type: "action", reqAttr: "Pase + Control", desc: "Tocás corto para mantener la posesión.",
                    calc: { "Pase": 0.7, "Control": 0.3 }, statCategory: "pass", chainChance: 0.4, chainQuality: "normal",
                    successMsg: "Distribución prolija en el medio.", critSuccessMsg: "Un toque elegante de primera.", failMsg: "Pase interceptado en zona peligrosa." 
                },
                { 
                    text: "Cambio de frente", type: "action", reqAttr: "Visión + Pase + Técnica", desc: "Cruzás la pelota para limpiar el juego.",
                    calc: { "Visión": 0.4, "Pase": 0.4, "Técnica": 0.2 }, statCategory: "pass", chainChance: 0.5, chainQuality: "buena",
                    successMsg: "Gran pelotazo cruzado para oxigenar.", critSuccessMsg: "¡Cambio de frente de 40 metros al pie!", failMsg: "Se fue directo a la tribuna." 
                },
                { 
                    text: "Aguantar la marca", type: "action", reqAttr: "Fuerza + Técnica", desc: "Ponés el cuerpo para no perderla ante la presión.",
                    calc: { "Fuerza": 0.6, "Técnica": 0.4 }, statCategory: "dribble", chainChance: 1.0, chainQuality: "normal", // Progresión (Ganar duelo)
                    successMsg: "Giraste bien cubriendo el balón.", critSuccessMsg: "¡Zafaste con una pisada exquisita!", failMsg: "Te ahogaron en la salida." 
                }
            ]
        },
        {
            id: "mid_bp_1", positions: ["Mediocampista Central", "Defensivo"], quality: ["buena", "peligrosa"],
            title: "¡Recuperación alta!", description: "La defensa rival está totalmente desorganizada.",
            actions: [
                { 
                    text: "Pase filtrado clave", type: "action", reqAttr: "Visión + Pase + Técnica", desc: "Asistís al delantero que pica al espacio.",
                    calc: { "Visión": 0.5, "Pase": 0.3, "Técnica": 0.2 }, statCategory: "assist", chainChance: 0,
                    successMsg: "¡Pase de mago! El delantero recibe en posición inmejorable.", critSuccessMsg: "¡Rompiste todas las líneas! Lo dejaste completamente solo frente al arquero.", failMsg: "El pase fue muy exigido." 
                },
                { 
                    text: "Conducir directo", type: "action", reqAttr: "Velocidad + Control + Aceleración", desc: "Aprovechás el caos para meterte al área.",
                    calc: { "Velocidad": 0.4, "Control": 0.4, "Aceleración": 0.2 }, statCategory: "dribble", chainChance: 1.0, chainQuality: "peligrosa",
                    successMsg: "Te metiste rompiendo el esquema.", critSuccessMsg: "¡Imparable! Dejaste a tres en el camino.", failMsg: "Trasladaste de más y te la pincharon." 
                },
                { text: "Sorprender al arco", type: "shoot", shotType: "long_shot", reqAttr: "Potencia + Definición", desc: "Probás de lejos viendo al arquero adelantado." }
            ]
        },

        // --- DEFENSORES / LATERALES ---
        {
            id: "def_mn_1", positions: ["Defensor", "Lateral"], quality: ["mala", "normal", "buena"],
            title: "Salida desde el fondo", description: "Recibís la pelota con presión rival cercana.",
            actions: [
                { 
                    text: "Pase seguro", type: "action", reqAttr: "Pase + Mentalidad", desc: "Tocás rápido con tu compañero de zaga.",
                    calc: { "Pase": 0.7, "Mentalidad": 0.3 }, statCategory: "pass", chainChance: 0.3, chainQuality: "normal",
                    successMsg: "Salida limpia desde abajo.", critSuccessMsg: "Saliste tocando con la frialdad de un líbero.", failMsg: "Dudaste y entregaste un mal pase." 
                },
                { 
                    text: "Rechazar largo", type: "action", reqAttr: "Fuerza + Pase", desc: "Reventás la pelota a dividir arriba.",
                    calc: { "Fuerza": 0.6, "Pase": 0.4 }, statCategory: "pass", chainChance: 0, // Definición defensiva, aleja el peligro
                    successMsg: "Pelotazo largo alejando el peligro.", critSuccessMsg: "Despeje perfecto que cae en el pecho de tu 9.", failMsg: "Rechazo defectuoso." 
                }
            ]
        },
        {
            id: "def_bp_1", positions: ["Defensor", "Lateral"], quality: ["peligrosa"],
            title: "¡Peligro inminente!", description: "El delantero rival se escapa con campo a favor.",
            actions: [
                { 
                    text: "Tackle agresivo", type: "action", reqAttr: "Entrada + Aceleración", desc: "Te tirás a barrer jugándote el todo por el todo.",
                    calc: { "Entrada": 0.6, "Aceleración": 0.4 }, statCategory: "tackle", chainChance: 1.0, chainQuality: "normal", // Progresión, recupera y sale jugando
                    successMsg: "¡Tackle espectacular y limpio!", critSuccessMsg: "¡TREMENDO QUITE! Salvaste un gol hecho y salís jugando.", failMsg: "Llegaste muy tarde, falta peligrosa." 
                },
                { 
                    text: "Anticipar el pase", type: "action", reqAttr: "Anticipación + Visión + Velocidad", desc: "Cortás la línea de pase antes de que reciba.",
                    calc: { "Anticipación": 0.5, "Visión": 0.3, "Velocidad": 0.2 }, statCategory: "tackle", chainChance: 1.0, chainQuality: "normal",
                    successMsg: "Lectura perfecta, interceptaste el balón.", critSuccessMsg: "¡Leíste la jugada 3 segundos antes! Intercepción de crack.", failMsg: "Quedaste pagando por anticipar mal." 
                }
            ]
        }
    ];
}