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

  generateAndDraw(iterations, turtle, angle, length) {
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
    this.reset();
  }

  reset() {
    this._x = this._ctx.canvas.width / 2;
    this._y = this._ctx.canvas.height;
    this._angle = -90;
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
  lsystem.generateAndDraw(iterations, turtle, angle, length);

  const totalTime = performance.now() - startTime;

  self.postMessage({ totalTime });
};