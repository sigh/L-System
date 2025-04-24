class LSystem {
  constructor(axiom, rules) {
    this._axiom = axiom;
    this._rules = this._parseRules(rules);
  }

  _parseRules(rulesString) {
    const rules = {};
    const rulePairs = rulesString.split(/[;\n]/).filter(pair => pair.trim() !== '');
    rulePairs.forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) {
        rules[key.trim()] = value.trim();
      }
    });
    return rules;
  }

  run(turtle, angle, iterations) {
    const stack = [[this._axiom, iterations]];

    while (stack.length > 0) {
      const [current, remainingIterations] = stack.pop();

      if (remainingIterations === 0) {
        for (let char of current) {
          switch (char) {
            case 'F':
              turtle.forward(1, true);
              break;
            case 'f':
              turtle.forward(1, false);
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
        for (let i = current.length - 1; i >= 0; i--) {
          const char = current[i];
          const replacement = this._rules[char];
          if (replacement) {
            stack.push([replacement, remainingIterations - 1]);
          } else {
            stack.push([char, 0]);
          }
        }
      }
    }
  }
}

class Turtle {
  constructor(ctx) {
    this._ctx = ctx;
    this.reset();
  }

  reset() {
    this._x = 0;
    this._y = 0;
    this._angle = -90;
    this._stack = [];
    this._minX = -.1;
    this._minY = -.1;
    this._maxX = .1;
    this._maxY = .1;
    this._baseScale = 1;
    this._path = new Path2D();
    this._path.moveTo(this._x, this._y);
  }

  _updateBounds(x, y) {
    this._minX = Math.min(this._minX, x);
    this._minY = Math.min(this._minY, y);
    this._maxX = Math.max(this._maxX, x);
    this._maxY = Math.max(this._maxY, y);
  }

  draw({ panX = 0, panY = 0, zoom = 1 }) {
    // Calculate scale to fit canvas
    const padding = 20;
    const scaleX = (this._ctx.canvas.width - 2 * padding) / (this._maxX - this._minX);
    const scaleY = (this._ctx.canvas.height - 2 * padding) / (this._maxY - this._minY);
    this._baseScale = Math.min(scaleX, scaleY);

    // Calculate translation to center the path after scaling
    const translateX = (this._ctx.canvas.width / 2) - ((this._minX + this._maxX) / 2) * this._baseScale;
    const translateY = (this._ctx.canvas.height / 2) - ((this._minY + this._maxY) / 2) * this._baseScale;

    this._ctx.save();
    // Apply user pan and zoom first
    this._ctx.translate(panX, panY);
    this._ctx.scale(zoom, zoom);
    // Apply turtle transformations last
    this._ctx.translate(translateX, translateY);
    this._ctx.scale(this._baseScale, this._baseScale);
    // Set line width based on zoom level
    this._ctx.lineWidth = 1 / (this._baseScale * zoom);
    // Draw the path
    this._ctx.stroke(this._path);
    this._ctx.restore();
  }

  forward(length, draw = true) {
    const newX = this._x + Math.cos(this._angle * Math.PI / 180) * length;
    const newY = this._y + Math.sin(this._angle * Math.PI / 180) * length;

    if (draw) {
      this._path.lineTo(newX, newY);
    } else {
      this._path.moveTo(newX, newY);
    }
    this._updateBounds(newX, newY);

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
      this._path.moveTo(this._x, this._y);
    }
  }
}

class Renderer {
  constructor() {
    this.ctx = null;
    this.turtle = null;
    this.lsystem = null;
  }

  initCanvas(canvas) {
    this.ctx = canvas.getContext('2d');
  }

  resize(width, height) {
    this.ctx.canvas.width = parseInt(width);
    this.ctx.canvas.height = parseInt(height);
  }

  generate(axiom, rules, iterations, angle, panState) {
    // Send generation start message
    self.postMessage({
      status: 'generating',
      ruleset: { axiom, rules, iterations, angle }
    });

    const startTime = performance.now();

    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.strokeStyle = '#2c3e50';

    this.turtle = new Turtle(this.ctx);
    this.lsystem = new LSystem(axiom, rules);
    this.lsystem.run(this.turtle, angle, iterations);
    this.turtle.draw(panState);

    const totalTime = performance.now() - startTime;

    // Send completion message with timing data
    self.postMessage({
      status: 'complete',
      ruleset: { axiom, rules, iterations, angle },
      data: { totalTime }
    });
  }

  updateView(panState) {
    if (!this.turtle) return;
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.strokeStyle = '#2c3e50';
    this.turtle.draw(panState);
  }
}

const WORKER_METHODS = (() => {
  const renderer = new Renderer();

  let newPanState = null;
  let newRuleset = null;

  const processPendingOps = () => {
    if (newRuleset) {
      const { axiom, rules, iterations, angle } = newRuleset;
      renderer.generate(axiom, rules, iterations, angle, newPanState);
    } else if (newPanState) {
      renderer.updateView(newPanState);
    }

    newPanState = null;
    newRuleset = null;
  };

  // Public methods
  return {
    initCanvas(params) {
      renderer.initCanvas(params.canvas);
    },

    resize(params) {
      renderer.resize(params.width, params.height);
      newPanState = { panX: 0, panY: 0, zoom: 1 };
      setTimeout(processPendingOps, 0);
    },

    generate(params) {
      newPanState = params.panState;
      newRuleset = {
        axiom: params.axiom,
        rules: params.rules,
        iterations: params.iterations,
        angle: params.angle
      };
      setTimeout(processPendingOps, 0);
    },

    updateView(params) {
      newPanState = params.panState;
      setTimeout(processPendingOps, 0);
    }
  };
})();

self.onmessage = function (e) {
  const { method, params } = e.data;
  WORKER_METHODS[method](params);
};
