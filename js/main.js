import { DebugManager } from './debugManager.js';

// ... en alguna parte de tu código de inicio, por ejemplo apenas cargue la app:
document.addEventListener('DOMContentLoaded', () => {
    DebugManager.init();
    // ... tu código existente
});

import { PlayerCreator } from './playerCreator.js';
import { CareerManager } from './careerManager.js';
import { MatchEngine } from './matchEngine.js';
import { SeasonManager } from './seasonManager.js';
import { DevelopmentManager } from './developmentManager.js';
import { state } from './state.js';

document.addEventListener('DOMContentLoaded', () => {
    const btnNewCareer = document.getElementById('btn-new-career');
    const btnBackMain = document.getElementById('btn-back-main');
    const btnContinueCareer = document.getElementById('btn-continue-career');
    const btnPlayMatch = document.getElementById('btn-play-match');
    const btnFinishMatch = document.getElementById('btn-finish-match');
    const btnContinueSeason = document.getElementById('btn-continue-season');
    const btnResumeMatch = document.getElementById('btn-resume-match'); 
    
    // FASE 4: Botones de Desarrollo
    const btnDevelopment = document.getElementById('btn-development');
    const btnDevConfirm = document.getElementById('btn-dev-confirm');
    const btnDevCancel = document.getElementById('btn-dev-cancel');
    
    if (btnNewCareer) {
        btnNewCareer.addEventListener('click', () => {
            document.getElementById('main-menu').style.display = 'none';
            document.getElementById('screen-creation').style.display = 'block';
        });
    }

    if (btnBackMain) {
        btnBackMain.addEventListener('click', () => {
            document.getElementById('screen-creation').style.display = 'none';
            document.getElementById('main-menu').style.display = 'block';
        });
    }

    if (btnContinueCareer) {
        btnContinueCareer.addEventListener('click', () => {
            document.getElementById('screen-summary').style.display = 'none';
            document.getElementById('screen-career-hub').style.display = 'block';
            CareerManager.updateHub();
        });
    }

    if (btnPlayMatch) {
        btnPlayMatch.addEventListener('click', () => {
            const nextMatch = state.career.calendar[state.career.currentMatchIndex];
            if (nextMatch) {
                document.getElementById('screen-career-hub').style.display = 'none';
                document.getElementById('screen-match').style.display = 'block';
                MatchEngine.init(nextMatch);
            }
        });
    }

    const speedBtns = document.querySelectorAll('.speed-btn');
    speedBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            speedBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const speed = parseInt(e.target.dataset.speed);
            MatchEngine.setSpeed(speed);
        });
    });

    if (btnResumeMatch) {
        btnResumeMatch.addEventListener('click', () => {
            MatchEngine.resumeSecondHalf();
        });
    }

    if (btnFinishMatch) {
        btnFinishMatch.addEventListener('click', () => {
            SeasonManager.processMatchResult();
            document.getElementById('screen-match').style.display = 'none';
            document.getElementById('screen-post-match').style.display = 'block';
        });
    }

    if (btnContinueSeason) {
        btnContinueSeason.addEventListener('click', () => {
            CareerManager.updateHub();
            document.getElementById('screen-post-match').style.display = 'none';
            document.getElementById('screen-career-hub').style.display = 'block';
        });
    }

    // Navegación de Desarrollo
    if (btnDevelopment) {
        btnDevelopment.addEventListener('click', () => {
            DevelopmentManager.openScreen();
        });
    }
    if (btnDevConfirm) {
        btnDevConfirm.addEventListener('click', () => {
            DevelopmentManager.confirmChanges();
        });
    }
    if (btnDevCancel) {
        btnDevCancel.addEventListener('click', () => {
            DevelopmentManager.cancelChanges();
        });
    }
    
    PlayerCreator.init();
    DevelopmentManager.init();
});