export interface GameUi {
  bindStart: (start: () => void) => void;
  setScore: (score: number) => void;
  showOverlay: (visible: boolean) => void;
}

export function setupUi(): GameUi {
  const overlay = document.getElementById('overlay');
  const score = document.getElementById('score');

  if (!overlay || !score) {
    throw new Error('Required UI elements are missing from index.html');
  }

  return {
    bindStart: (start: () => void): void => {
      overlay.addEventListener('click', start);
    },
    setScore: (value: number): void => {
      score.textContent = `Score: ${value}`;
    },
    showOverlay: (visible: boolean): void => {
      overlay.classList.toggle('hidden', !visible);
    }
  };
}
