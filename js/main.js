import { DebugManager } from './debugManager.js';
import { PlayerCreator } from './playerCreator.js';
import { CareerManager } from './careerManager.js';
import { MatchEngine } from './matchEngine.js';
import { SeasonManager } from './seasonManager.js';
import { DevelopmentManager } from './developmentManager.js';
import { state } from './state.js';

document.addEventListener('DOMContentLoaded', () => {
    DebugManager.init();

    const btnNewCareer = document.getElementById('btn-new-career');
    const btnBackMain = document.getElementById('btn-back-main');
    const btnContinueCareer = document.getElementById('btn-continue-career');
    const btnPlayMatch = document.getElementById('btn-play-match');
    const btnFinishMatch = document.getElementById('btn-finish-match');
    const btnContinueSeason = document.getElementById('btn-continue-season');
    const btnResumeMatch = document.getElementById('btn-resume-match'); 
    
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
            const currentMatchday = state.career.fixture[state.career.currentMatchIndex];
            if (currentMatchday && state.career.currentMatchIndex < 58) {
                const playerMatch = currentMatchday.find(m => m.home === state.career.club || m.away === state.career.club);
                const isHome = playerMatch.home === state.career.club;
                
                document.getElementById('screen-career-hub').style.display = 'none';
                // CORRECCIÓN: Volvemos a 'block' para respetar tu layout clásico vertical
                document.getElementById('screen-match').style.display = 'block'; 
                
                MatchEngine.init({
                    opponent: isHome ? playerMatch.away : playerMatch.home,
                    difficulty: isHome ? playerMatch.awayDiff : playerMatch.homeDiff
                });
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