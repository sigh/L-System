class LSystem {
  constructor(axiom, rules) {
    this._axiom = axiom;
    this._rules = this._parseRules(rules);
    this._current = axiom;
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

  generate(iterations) {
    this._current = this._axiom;
    for (let i = 0; i < iterations; i++) {
      let next = '';
      for (let char of this._current) {
        next += this._rules[char] || char;
      }
      this._current = next;
    }
    return this._current;
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

  forward(length) {
    const newX = this._x + Math.cos(this._angle * Math.PI / 180) * length;
    const newY = this._y + Math.sin(this._angle * Math.PI / 180) * length;

    this._ctx.beginPath();
    this._ctx.moveTo(this._x, this._y);
    this._ctx.lineTo(newX, newY);
    this._ctx.stroke();

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

  _setupControls() {
    this._setupSliderControl('iterations-slider', 'iterations');
    this._setupSliderControl('angle-slider', 'angle');
    this._setupSliderControl('length-slider', 'length');

    document.getElementById('generate').addEventListener('click', () => this.generate());
  }

  _updateTimingDisplay(generationTime, drawingTime, totalTime) {
    const timingElement = document.getElementById('timing');
    timingElement.textContent = `Generation: ${generationTime.toFixed(2)}ms | Drawing: ${drawingTime.toFixed(2)}ms | Total: ${totalTime.toFixed(2)}ms`;
  }

  _drawLSystem(instructions, angle, length) {
    this._turtle.reset();
    for (let char of instructions) {
      switch (char) {
        case 'F':
          this._turtle.forward(length);
          break;
        case '+':
          this._turtle.rotate(angle);
          break;
        case '-':
          this._turtle.rotate(-angle);
          break;
        case '[':
          this._turtle.push();
          break;
        case ']':
          this._turtle.pop();
          break;
      }
    }
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

    // Generate L-system
    const lsystem = new LSystem(axiom, rules);
    const generationStart = performance.now();
    const result = lsystem.generate(iterations);
    const generationTime = performance.now() - generationStart;

    // Draw using turtle graphics
    const drawingStart = performance.now();
    this._drawLSystem(result, angle, length);
    const drawingTime = performance.now() - drawingStart;
    const totalTime = performance.now() - startTime;

    this._updateTimingDisplay(generationTime, drawingTime, totalTime);
  }
}

// Initialize the visualizer when the page loads
window.addEventListener('load', () => {
  new LSystemVisualizer();
});