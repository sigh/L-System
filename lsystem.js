class LSystem {
  constructor(axiom, rules) {
    this._axiom = axiom;
    this._rules = this._parseRules(rules);
  }

  _parseRules(rulesString) {
    const rules = {};
    // Split by both semicolons and line breaks
    const rulePairs = rulesString.split(/[;\n]/).filter(pair => pair.trim() !== '');
    rulePairs.forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) {
        rules[key.trim()] = value.trim();
      }
    });
    return rules;
  }

  generateAndDraw(iterations, turtle, angle, length) {
    turtle.beginLine();
    // Stack entries are [string, remainingIterations]
    const stack = [[this._axiom, iterations]];

    while (stack.length > 0) {
      const [current, remainingIterations] = stack.pop();

      if (remainingIterations === 0) {
        // Draw the current character
        for (let char of current) {
          switch (char) {
            case 'F':
              turtle.forward(length);
              break;
            case '+':
              turtle.rotate(angle);
              break;
            case '-':
              turtle.rotate(-angle);
              break;
            case '[':
              turtle.push();
              break;
            case ']':
              turtle.pop();
              break;
          }
        }
      } else {
        // Push characters in reverse order to maintain correct drawing order
        for (let i = current.length - 1; i >= 0; i--) {
          const char = current[i];
          const replacement = this._rules[char];
          if (replacement) {
            stack.push([replacement, remainingIterations - 1]);
          } else {
            stack.push([char, 0]); // Draw this character immediately
          }
        }
      }
    }
    turtle.endLine();
  }
}

class Turtle {
  constructor(canvas) {
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this.reset();
  }

  reset() {
    this._x = this._canvas.width / 2;
    this._y = this._canvas.height;
    this._angle = -90; // Start pointing up
    this._stack = [];
  }

  beginLine() {
    this._ctx.beginPath();
    this._ctx.moveTo(this._x, this._y);
  }

  endLine() {
    this._ctx.stroke();
  }

  forward(length) {
    const newX = this._x + Math.cos(this._angle * Math.PI / 180) * length;
    const newY = this._y + Math.sin(this._angle * Math.PI / 180) * length;

    this._ctx.lineTo(newX, newY);

    this._x = newX;
    this._y = newY;
  }

  rotate(angle) {
    this._angle += angle;
  }

  push() {
    this._stack.push({
      x: this._x,
      y: this._y,
      angle: this._angle
    });
  }

  pop() {
    const state = this._stack.pop();
    if (state) {
      this._x = state.x;
      this._y = state.y;
      this._angle = state.angle;
    }
  }
}

class LSystemVisualizer {
  constructor() {
    this._canvas = document.getElementById('canvas');
    this._resizeCanvas();
    window.addEventListener('resize', () => this._resizeCanvas());

    this._turtle = new Turtle(this._canvas);
    this._setupControls();
    this._populatePresets();
    this._setInitialPreset();
  }

  _resizeCanvas() {
    this._canvas.width = this._canvas.offsetWidth;
    this._canvas.height = this._canvas.offsetHeight;
  }

  _setupSliderControl(sliderId, inputId) {
    const slider = document.getElementById(sliderId);
    const input = document.getElementById(inputId);

    slider.addEventListener('input', () => {
      input.value = slider.value;
    });

    input.addEventListener('input', () => {
      const value = parseInt(input.value);
      if (value >= input.min && value <= input.max) {
        slider.value = value;
      }
    });
  }

  _populatePresets() {
    const presetSelect = document.getElementById('preset');
    Object.entries(LSystemPresets).forEach(([key, preset]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = preset.name;
      presetSelect.appendChild(option);
    });
  }

  _setInitialPreset() {
    const firstPreset = Object.values(LSystemPresets)[0];
    if (firstPreset) {
      document.getElementById('axiom').value = firstPreset.axiom;
      document.getElementById('rules').value = firstPreset.rules;
      document.getElementById('iterations').value = firstPreset.iterations;
      document.getElementById('iterations-slider').value = firstPreset.iterations;
      document.getElementById('angle').value = firstPreset.angle;
      document.getElementById('angle-slider').value = firstPreset.angle;
      document.getElementById('length').value = firstPreset.length;
      document.getElementById('length-slider').value = firstPreset.length;
      this.generate();
    }
  }

  _setupControls() {
    this._setupSliderControl('iterations-slider', 'iterations');
    this._setupSliderControl('angle-slider', 'angle');
    this._setupSliderControl('length-slider', 'length');

    document.getElementById('generate').addEventListener('click', () => this.generate());

    // Add preset selection handler
    document.getElementById('preset').addEventListener('change', (e) => {
      const preset = LSystemPresets[e.target.value];
      if (preset) {
        document.getElementById('axiom').value = preset.axiom;
        document.getElementById('rules').value = preset.rules;
        document.getElementById('iterations').value = preset.iterations;
        document.getElementById('iterations-slider').value = preset.iterations;
        document.getElementById('angle').value = preset.angle;
        document.getElementById('angle-slider').value = preset.angle;
        document.getElementById('length').value = preset.length;
        document.getElementById('length-slider').value = preset.length;
        this.generate();
      }
    });
  }

  _updateTimingDisplay(totalTime) {
    const timingElement = document.getElementById('timing');
    timingElement.textContent = `Total time: ${totalTime.toFixed(2)}ms`;
  }

  generate() {
    const startTime = performance.now();

    const axiom = document.getElementById('axiom').value;
    const rules = document.getElementById('rules').value;
    const iterations = parseInt(document.getElementById('iterations').value);
    const angle = parseInt(document.getElementById('angle').value);
    const length = parseInt(document.getElementById('length').value);

    // Clear canvas
    this._ctx = this._canvas.getContext('2d');
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this._ctx.strokeStyle = '#2c3e50';
    this._ctx.lineWidth = 1;

    // Reset turtle
    this._turtle.reset();

    // Generate and draw L-system
    const lsystem = new LSystem(axiom, rules);
    lsystem.generateAndDraw(iterations, this._turtle, angle, length);
    const totalTime = performance.now() - startTime;

    this._updateTimingDisplay(totalTime);
  }
}

// Initialize the visualizer when the page loads
window.addEventListener('load', () => {
  new LSystemVisualizer();
});