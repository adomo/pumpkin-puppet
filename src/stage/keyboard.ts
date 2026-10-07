import { PuppetSlot, CornerKey } from '../sync/channel';

export interface KeyboardCallbacks {
  onFocus: (slot: PuppetSlot) => void;
  onTalkToggle: () => void;
  onFlameToggle: () => void;
  onEyeFlames: (active: boolean) => void;
  onFreezeToggle: () => void;
  onSmoke: () => void;
  onLightning: () => void;
  onSoul: () => void;
  onScream: () => void;
  onSleepToggle: () => void;
  onWink: () => void;
  onLook: (dir: 'left' | 'center' | 'right') => void;
  onCallResponse: () => void;
  onSongToggle: () => void;
  onBlackout: () => void;
  onReset: () => void;
  onGateChange: (delta: number) => void;
  onDelayChange: (delta: number) => void;
  onToggleGrid: () => void;
  onToggleBlackCard: () => void;
  onToggleMappingMode: () => void;
  onCycleCorner: () => void;
  onSelectCorner: (corner: 'none' | CornerKey) => void;
  onNudgeCorner: (dx: number, dy: number) => void;
  onResetKeystone: () => void;
  onNudge: (dx: number, dy: number) => void;
  onScaleChange: (delta: number) => void;
  onScaleYChange: (delta: number) => void;
  onRotateChange: (delta: number) => void;
  isCornerActive: () => boolean;
}

export class StageKeyboard {
  private cb: KeyboardCallbacks;
  private eyeFlamePressed: boolean = false;

  constructor(callbacks: KeyboardCallbacks) {
    this.cb = callbacks;
    this.bindEvents();
  }

  private bindEvents(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this.handleKeyDown(e);
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.handleKeyUp(e);
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      return;
    }

    // Tab: cycle keystone edit corner
    if (e.key === 'Tab') {
      e.preventDefault();
      this.cb.onCycleCorner();
      return;
    }

    // Mapping Mode Direct Corner Selection: 7=TL, 8=TR, 9=BL, 0=BR
    if (e.key === '7') {
      e.preventDefault();
      this.cb.onSelectCorner('tl');
      return;
    }
    if (e.key === '8') {
      e.preventDefault();
      this.cb.onSelectCorner('tr');
      return;
    }
    if (e.key === '9') {
      e.preventDefault();
      this.cb.onSelectCorner('bl');
      return;
    }
    if (e.key === '0') {
      e.preventDefault();
      this.cb.onSelectCorner('br');
      return;
    }

    // Arrow keys:
    // If a specific keystone corner is active, arrows move that corner!
    if (this.cb.isCornerActive()) {
      const step = e.shiftKey ? 8 : 2;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.cb.onNudgeCorner(-step, 0);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.cb.onNudgeCorner(step, 0);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.cb.onNudgeCorner(0, -step);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.cb.onNudgeCorner(0, step);
        return;
      }
    }

    // Entire Puppet Nudging: Shift + Arrow keys
    if (e.shiftKey) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.cb.onNudge(-8, 0);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.cb.onNudge(8, 0);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.cb.onNudge(0, -8);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.cb.onNudge(0, 8);
        return;
      }
    }

    // Scaling: Alt + [ or ]
    if (e.altKey) {
      if (e.shiftKey) {
        // Vertical scale only (stretch/squash)
        if (e.key === '[' || e.code === 'BracketLeft') {
          e.preventDefault();
          this.cb.onScaleYChange(-0.05);
          return;
        }
        if (e.key === ']' || e.code === 'BracketRight') {
          e.preventDefault();
          this.cb.onScaleYChange(0.05);
          return;
        }
      } else {
        if (e.key === '[' || e.code === 'BracketLeft') {
          e.preventDefault();
          this.cb.onScaleChange(-0.05);
          return;
        }
        if (e.key === ']' || e.code === 'BracketRight') {
          e.preventDefault();
          this.cb.onScaleChange(0.05);
          return;
        }
      }
    }

    // Rotation: , and .
    if (e.key === ',' || e.key === '<') {
      e.preventDefault();
      this.cb.onRotateChange(-2);
      return;
    }
    if (e.key === '.' || e.key === '>') {
      e.preventDefault();
      this.cb.onRotateChange(2);
      return;
    }

    // Number keys: Focus Left, Center, Right
    if (e.key === '1') {
      e.preventDefault();
      this.cb.onFocus('left');
      return;
    }
    if (e.key === '2') {
      e.preventDefault();
      this.cb.onFocus('center');
      return;
    }
    if (e.key === '3') {
      e.preventDefault();
      this.cb.onFocus('right');
      return;
    }

    const key = e.key.toUpperCase();

    // Eye flames (Shift+F)
    if (e.shiftKey && key === 'F') {
      e.preventDefault();
      if (!this.eyeFlamePressed) {
        this.eyeFlamePressed = true;
        this.cb.onEyeFlames(true);
      }
      return;
    }

    // Scream (Shift+S)
    if (e.shiftKey && key === 'S') {
      e.preventDefault();
      this.cb.onScream();
      return;
    }

    switch (key) {
      case 'M':
        e.preventDefault();
        this.cb.onToggleMappingMode();
        break;
      case 'X':
        e.preventDefault();
        this.cb.onResetKeystone();
        break;
      case 'A':
        e.preventDefault();
        this.cb.onTalkToggle();
        break;
      case 'F':
        e.preventDefault();
        this.cb.onFlameToggle();
        break;
      case 'I':
        e.preventDefault();
        this.cb.onFreezeToggle();
        break;
      case 'S':
        e.preventDefault();
        this.cb.onSmoke();
        break;
      case 'L':
        e.preventDefault();
        this.cb.onLightning();
        break;
      case 'G':
        e.preventDefault();
        this.cb.onSoul();
        break;
      case 'Z':
        e.preventDefault();
        this.cb.onSleepToggle();
        break;
      case 'W':
        e.preventDefault();
        this.cb.onWink();
        break;
      case 'C':
        e.preventDefault();
        this.cb.onCallResponse();
        break;
      case 'ENTER':
        e.preventDefault();
        this.cb.onSongToggle();
        break;
      case 'B':
      case 'ESCAPE':
        e.preventDefault();
        this.cb.onBlackout();
        break;
      case 'R':
        e.preventDefault();
        this.cb.onReset();
        break;
      case 'H':
        e.preventDefault();
        this.cb.onToggleGrid();
        break;
      case 'K':
        e.preventDefault();
        this.cb.onToggleBlackCard();
        break;
      case '[':
        e.preventDefault();
        this.cb.onGateChange(-0.005);
        break;
      case ']':
        e.preventDefault();
        this.cb.onGateChange(0.005);
        break;
      case '-':
      case '_':
        e.preventDefault();
        this.cb.onDelayChange(-50);
        break;
      case '=':
      case '+':
        e.preventDefault();
        this.cb.onDelayChange(50);
        break;
      case 'ARROWLEFT':
        e.preventDefault();
        this.cb.onLook('left');
        break;
      case 'ARROWRIGHT':
        e.preventDefault();
        this.cb.onLook('right');
        break;
      case 'ARROWDOWN':
        e.preventDefault();
        this.cb.onLook('center');
        break;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (e.key.toUpperCase() === 'F' && this.eyeFlamePressed) {
      this.eyeFlamePressed = false;
      this.cb.onEyeFlames(false);
    }
  }
}
