/* ================================================================
   CAREER — game.js
   Orquestador principal del juego.

   En esta fase su única responsabilidad es:
     - inicializar la app
     - manejar la navegación entre pantallas
     - conectar los botones del menú con esa navegación

   A medida que se agreguen fases, este archivo va a delegar
   responsabilidades a nuevos módulos (match.js, career.js, etc.)
   en vez de crecer indefinidamente. Si supera ~250 líneas,
   se subdivide.
   ================================================================ */

import { getState, setCurrentScreen, hasSaveGame } from './state.js';

const Game = {

  /**
   * Punto de entrada. Se llama una sola vez desde main.js
   * cuando el DOM está listo.
   */
  init() {
    this._cacheScreens();
    this._bindNavigation();
    this._syncContinueButton();
    this.navigateTo(getState().currentScreen);

    console.log(`Career v${getState().version} — Fase 1 inicializada.`);
  },

  /**
   * Guarda referencias a todas las pantallas disponibles
   * para no tener que consultar el DOM repetidamente.
   */
  _cacheScreens() {
    this.screens = Array.from(document.querySelectorAll('.screen'));
  },

  /**
   * Conecta cualquier elemento con [data-nav] a la navegación,
   * sin necesidad de asignar listeners manualmente por botón.
   * Esto permite agregar botones nuevos en el futuro sin tocar
   * este archivo.
   */
  _bindNavigation() {
    document.querySelectorAll('[data-nav]').forEach((el) => {
      el.addEventListener('click', () => {
        if (el.disabled) return;
        this.navigateTo(el.dataset.nav);
      });
    });
  },

  /**
   * Habilita el botón "Continuar" solo si existe una partida
   * guardada. Placeholder hasta que exista save.js (Fase 16).
   */
  _syncContinueButton() {
    const btnContinuar = document.getElementById('btn-continuar');
    if (btnContinuar) {
      btnContinuar.disabled = !hasSaveGame();
    }
  },

  /**
   * Muestra la pantalla solicitada y oculta el resto.
   * @param {string} screenId
   */
  navigateTo(screenId) {
    const target = this.screens.find((s) => s.id === screenId);
    if (!target) {
      console.warn(`Career: no existe la pantalla "${screenId}".`);
      return;
    }

    this.screens.forEach((s) => s.classList.remove('active'));
    target.classList.add('active');

    setCurrentScreen(screenId);
  },
};

export { Game };
