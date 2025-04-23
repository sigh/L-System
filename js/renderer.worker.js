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
    this._path = new Path2D();
    this.reset();
  }

  reset() {
    this._x = this._ctx.canvas.width / 2;
    this._y = this._ctx.canvas.height;
    this._angle = -90;
    this._stack = [];
    this._path = new Path2D();
    this._minX = Infinity;
    this._minY = Infinity;
    this._maxX = -Infinity;
    this._maxY = -Infinity;
    this._baseScale = 1;
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

let ctx = null;
let turtle = null;
let lsystem = null;

const methods = {
  initCanvas({ canvas }) {
    ctx = canvas.getContext('2d');
  },

  resize({ width, height, panState }) {
    ctx.canvas.width = parseInt(width);
    ctx.canvas.height = parseInt(height);
    // Redraw if we have a turtle
    if (turtle) {
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = '#2c3e50';
      turtle.draw(panState);
    }
  },

  generate({ axiom, rules, iterations, angle, panState }) {
    const startTime = performance.now();

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.strokeStyle = '#2c3e50';

    turtle = new Turtle(ctx);
    lsystem = new LSystem(axiom, rules);
    lsystem.run(turtle, angle, iterations);
    turtle.draw(panState);

    const totalTime = performance.now() - startTime;
    return { totalTime };
  },

  updateView({ panState }) {
    if (!turtle) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.strokeStyle = '#2c3e50';
    turtle.draw(panState);
  }
};

self.onmessage = function (e) {
  const { method, params } = e.data;
  const result = methods[method](params);
  if (result) {
    self.postMessage(result);
  }
};