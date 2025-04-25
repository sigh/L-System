class Turtle {
  static INITIAL_ANGLE = -90;

  constructor() {
    this._x = 0;
    this._y = 0;
    this._angle = Turtle.INITIAL_ANGLE;
    this._stack = [];
    this._minX = 0;
    this._minY = 0;
    this._maxX = 0;
    this._maxY = 0;
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

  follow(otherTurtle) {
    const currentX = this._x;
    const currentY = this._y;
    const currentAngle = this._angle;

    // Create transformation matrix
    const transform = new DOMMatrix()
      .translate(currentX, currentY)
      .rotate(currentAngle - Turtle.INITIAL_ANGLE);

    // Apply path
    this._path.addPath(otherTurtle.getPath(), transform);

    // Calculate end position and angle
    const endPoint = transform.transformPoint({
      x: otherTurtle._x,
      y: otherTurtle._y
    });
    this._x = endPoint.x;
    this._y = endPoint.y;
    this._angle = currentAngle + otherTurtle._angle - Turtle.INITIAL_ANGLE;

    // Update bounds with transformed corners.
    const corners = [
      { x: otherTurtle._minX, y: otherTurtle._minY },
      { x: otherTurtle._maxX, y: otherTurtle._maxY },
      { x: otherTurtle._minX, y: otherTurtle._maxY },
      { x: otherTurtle._maxX, y: otherTurtle._minY },
    ];
    for (const corner of corners) {
      const transformed = transform.transformPoint(corner);
      this._updateBounds(transformed.x, transformed.y);
    }
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

class LSystem {
  constructor(ruleSet) {
    this._ruleSet = ruleSet;
  }

  /**
   * Generates a turtle that follows the given instructions, using cached
   * turtles for any rules encountered.
   */
  _generateTurtle(instructions, angle, ruleTurtles) {
    const turtle = new Turtle();

    for (const symbol of instructions) {
      if (ruleTurtles.has(symbol)) {
        // If this is a rule, use its cached path
        turtle.follow(ruleTurtles.get(symbol));
      } else {
        // Handle instruction symbols
        switch (symbol[0]) {
          case 'F':
            turtle.forward(1, true);
            break;
          case 'f':
            turtle.forward(1, false);
            break;
          case '-':
            turtle.rotate(angle);
            break;
          case '+':
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
    }

    return turtle;
  }

  /**
   * Returns a Map where each key is an iteration number and each value is a Set
   * of rules used in that iteration. This is used for the bottom-up approach
   * where we generate paths for each rule at each iteration level.
   */
  _ruleUsagePerIteration(iterations) {
    const ruleUsage = new Map();

    // Initialize the map with empty sets for each iteration
    for (let i = 0; i < iterations; i++) {
      ruleUsage.set(i, new Set());
    }

    // Start with the axiom
    let currentRules = ruleUsage.get(0);
    for (const symbol of this._ruleSet.axiom) {
      if (this._ruleSet.rules.has(symbol)) {
        currentRules.add(symbol);
      }
    }

    // For each iteration level
    for (let iteration = 1; iteration < iterations; iteration++) {
      const nextRules = ruleUsage.get(iteration);

      // For each rule used in the previous iteration
      for (const rule of currentRules) {
        const replacement = this._ruleSet.rules.get(rule);
        // Add any rules used in the replacement
        for (const symbol of replacement) {
          if (this._ruleSet.rules.has(symbol)) {
            nextRules.add(symbol);
          }
        }
      }

      currentRules = nextRules;
    }

    return ruleUsage;
  }

  /**
   * Generates the L-system using a bottom-up approach:
   * 1. Start from the last iteration and work backwards
   * 2. For each iteration, generate paths for all rules used in that iteration
   * 3. Use the cached paths from the next iteration when generating paths
   * 4. Finally, generate the path for the axiom using all cached paths
   */
  run(angle, iterations) {
    const ruleUsage = this._ruleUsagePerIteration(iterations);
    let previousRuleTurtles = new Map();

    // Start from the last iteration and work backwards
    for (let iteration = iterations - 1; iteration >= 0; iteration--) {
      const nextRuleTurtles = new Map();

      // For each rule used in this iteration
      for (const rule of ruleUsage.get(iteration)) {
        const ruleBody = this._ruleSet.rules.get(rule);
        const turtle = this._generateTurtle(ruleBody, angle, previousRuleTurtles);
        nextRuleTurtles.set(rule, turtle);
      }

      previousRuleTurtles = nextRuleTurtles;
    }

    return this._generateTurtle(this._ruleSet.axiom, angle, previousRuleTurtles);
  }
}

class Renderer {
  constructor(canvas) {
    this._ctx = canvas.getContext('2d');
    this._turtle = null;
  }

  resize(width, height) {
    this._ctx.canvas.width = parseInt(width);
    this._ctx.canvas.height = parseInt(height);
  }

  clear() {
    this._ctx.clearRect(0, 0, this._ctx.canvas.width, this._ctx.canvas.height);
    this._turtle = null;
  }

  draw(turtle, panState) {
    const path = turtle.getPath();
    const bounds = turtle.getBounds();

    // Calculate scale to fit canvas
    const padding = 10;
    const scaleX = (this._ctx.canvas.width - 2 * padding) / Math.max(bounds.maxX - bounds.minX, 1);
    const scaleY = (this._ctx.canvas.height - 2 * padding) / Math.max(bounds.maxY - bounds.minY, 1);
    const baseScale = Math.min(scaleX, scaleY);

    // Calculate translation to center the path after scaling
    const translateX = (this._ctx.canvas.width / 2) - ((bounds.minX + bounds.maxX) / 2) * baseScale;
    const translateY = (this._ctx.canvas.height / 2) - ((bounds.minY + bounds.maxY) / 2) * baseScale;

    this._ctx.save();
    // Apply user pan and zoom first
    this._ctx.translate(panState.panX, panState.panY);
    this._ctx.scale(panState.zoom, panState.zoom);
    // Apply turtle transformations last
    this._ctx.translate(translateX, translateY);
    this._ctx.scale(baseScale, baseScale);
    // Set line width based on zoom level
    this._ctx.lineWidth = 1 / (baseScale * panState.zoom);
    // Draw the path
    this._ctx.stroke(path);
    this._ctx.restore();
  }

  generate(ruleSet, iterations, angle, panState) {
    // Send generation start message
    self.postMessage({
      status: 'generating',
      lSystemParams: { ruleSet, iterations, angle },
    });

    const startTime = performance.now();

    this._ctx.clearRect(0, 0, this._ctx.canvas.width, this._ctx.canvas.height);
    this._ctx.strokeStyle = '#2c3e50';

    const lsystem = new LSystem(ruleSet);
    this._turtle = lsystem.run(angle, iterations);
    this.draw(this._turtle, panState);

    const totalTime = performance.now() - startTime;

    // Send completion message with timing data
    self.postMessage({
      status: 'complete',
      lSystemParams: { ruleSet, iterations, angle },
      data: { totalTime }
    });
  }

  updateView(panState) {
    if (!this._turtle) return;
    this._ctx.clearRect(0, 0, this._ctx.canvas.width, this._ctx.canvas.height);
    this._ctx.strokeStyle = '#2c3e50';
    this.draw(this._turtle, panState);
  }
}

const WORKER_METHODS = (() => {
  let renderer = null;

  let newPanState = null;
  let newLSystemParams = null;

  const processPendingOps = () => {
    if (!renderer) return;

    if (newLSystemParams) {
      const { ruleSet, iterations, angle } = newLSystemParams;
      renderer.generate(ruleSet, iterations, angle, newPanState);
    } else if (newPanState) {
      renderer.updateView(newPanState);
    }

    newPanState = null;
    newLSystemParams = null;
  };

  // Public methods
  return {
    initCanvas(params) {
      renderer = new Renderer(params.canvas);
    },

    resize(params) {
      if (!renderer) return;
      renderer.resize(params.width, params.height);
      newPanState = { panX: 0, panY: 0, zoom: 1 };
      setTimeout(processPendingOps, 0);
    },

    generate(params) {
      newPanState = params.panState;
      newLSystemParams = {
        ruleSet: params.ruleSet,
        iterations: params.iterations,
        angle: params.angle
      };
      setTimeout(processPendingOps, 0);
    },

    updateView(params) {
      newPanState = params.panState;
      setTimeout(processPendingOps, 0);
    },

    clear() {
      if (!renderer) return;
      newPanState = null;
      newLSystemParams = null;
      renderer.clear();
    }
  };
})();

self.onmessage = function (e) {
  const { method, params } = e.data;
  WORKER_METHODS[method](params);
};
