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

  draw(iterations, turtle, angle, length) {
    turtle.beginLine();
    const stack = [[this._axiom, iterations]];

    while (stack.length > 0) {
      const [current, remainingIterations] = stack.pop();

      if (remainingIterations === 0) {
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
    turtle.endLine();
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
  }

  beginLine() {
    this._path = new Path2D();
    this._path.moveTo(this._x, this._y);
    this._updateBounds(this._x, this._y);
  }

  _updateBounds(x, y) {
    this._minX = Math.min(this._minX, x);
    this._minY = Math.min(this._minY, y);
    this._maxX = Math.max(this._maxX, x);
    this._maxY = Math.max(this._maxY, y);
  }

  endLine() {
    // Calculate scale to fit canvas
    const padding = 20;
    const scaleX = (this._ctx.canvas.width - 2 * padding) / (this._maxX - this._minX);
    const scaleY = (this._ctx.canvas.height - 2 * padding) / (this._maxY - this._minY);
    const scale = Math.min(scaleX, scaleY);

    // Calculate translation to center
    const translateX = (this._ctx.canvas.width - (this._maxX - this._minX) * scale) / 2 - this._minX * scale;
    const translateY = (this._ctx.canvas.height - (this._maxY - this._minY) * scale) / 2 - this._minY * scale;

    // Apply transformation
    this._ctx.save();
    this._ctx.translate(translateX, translateY);
    this._ctx.scale(scale, scale);
    this._ctx.stroke(this._path);
    this._ctx.restore();
  }

  forward(length) {
    const newX = this._x + Math.cos(this._angle * Math.PI / 180) * length;
    const newY = this._y + Math.sin(this._angle * Math.PI / 180) * length;

    this._path.lineTo(newX, newY);
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

self.onmessage = function (e) {
  const data = e.data;

  if (data.canvas) {
    // Initialize canvas
    ctx = data.canvas.getContext('2d');
    return;
  }

  const { axiom, rules, iterations, angle, length } = data;

  const startTime = performance.now();

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.strokeStyle = '#2c3e50';
  ctx.lineWidth = 1;

  const turtle = new Turtle(ctx);
  const lsystem = new LSystem(axiom, rules);
  lsystem.draw(iterations, turtle, angle, length);

  const totalTime = performance.now() - startTime;

  self.postMessage({ totalTime });
};