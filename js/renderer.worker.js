class RuleSet {
  constructor(axiom, rulesString) {
    this.axiom = axiom;
    this.rules = this._parseRules(rulesString);
  }

  _parseRules(rulesString) {
    const rules = new Map();
    const rulePairs = rulesString.split(/[;\n]/).filter(pair => pair.trim() !== '');
    rulePairs.forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) {
        // Remove all whitespace from both key and value
        rules.set(key.trim(), value.replace(/\s+/g, ''));
      }
    });
    return rules;
  }
}

class LSystem {
  constructor(axiom, rules) {
    this._ruleSet = new RuleSet(axiom, rules);
  }

  run(turtle, angle, iterations) {
    const stack = [[this._ruleSet.axiom, iterations]];

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
          const replacement = this._ruleSet.rules.get(char);
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
  constructor() {
    this._x = 0;
    this._y = 0;
    this._angle = -90;
    this._stack = [];
    this._minX = -.1;
    this._minY = -.1;
    this._maxX = .1;
    this._maxY = .1;
    this._path = new Path2D();
    this._path.moveTo(this._x, this._y);
  }

  _updateBounds(x, y) {
    this._minX = Math.min(this._minX, x);
    this._minY = Math.min(this._minY, y);
    this._maxX = Math.max(this._maxX, x);
    this._maxY = Math.max(this._maxY, y);
  }

  getPath() {
    return this._path;
  }

  getBounds() {
    return {
      minX: this._minX,
      minY: this._minY,
      maxX: this._maxX,
      maxY: this._maxY
    };
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

  draw(path, bounds, panState) {
    // Calculate scale to fit canvas
    const padding = 20;
    const scaleX = (this.ctx.canvas.width - 2 * padding) / (bounds.maxX - bounds.minX);
    const scaleY = (this.ctx.canvas.height - 2 * padding) / (bounds.maxY - bounds.minY);
    const baseScale = Math.min(scaleX, scaleY);

    // Calculate translation to center the path after scaling
    const translateX = (this.ctx.canvas.width / 2) - ((bounds.minX + bounds.maxX) / 2) * baseScale;
    const translateY = (this.ctx.canvas.height / 2) - ((bounds.minY + bounds.maxY) / 2) * baseScale;

    this.ctx.save();
    // Apply user pan and zoom first
    this.ctx.translate(panState.panX, panState.panY);
    this.ctx.scale(panState.zoom, panState.zoom);
    // Apply turtle transformations last
    this.ctx.translate(translateX, translateY);
    this.ctx.scale(baseScale, baseScale);
    // Set line width based on zoom level
    this.ctx.lineWidth = 1 / (baseScale * panState.zoom);
    // Draw the path
    this.ctx.stroke(path);
    this.ctx.restore();
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

    this.turtle = new Turtle();
    this.lsystem = new LSystem(axiom, rules);
    this.lsystem.run(this.turtle, angle, iterations);
    this.draw(this.turtle.getPath(), this.turtle.getBounds(), panState);

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
    this.draw(this.turtle.getPath(), this.turtle.getBounds(), panState);
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
