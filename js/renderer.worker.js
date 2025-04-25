class Turtle {
  static INITIAL_ANGLE = -90;

  constructor() {
    this._x = 0;
    this._y = 0;
    this._angle = Turtle.INITIAL_ANGLE;
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
    // We only need to check opposite corners because seeing each extreme
    // once is enough.
    const corners = [
      { x: otherTurtle._minX, y: otherTurtle._minY },
      { x: otherTurtle._maxX, y: otherTurtle._maxY },
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

    for (const char of instructions) {
      if (ruleTurtles.has(char)) {
        // If this is a rule, use its cached path
        turtle.follow(ruleTurtles.get(char));
      } else {
        // Handle non-rule characters
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
    for (const char of this._ruleSet.axiom) {
      if (this._ruleSet.rules.has(char)) {
        currentRules.add(char);
      }
    }

    // For each iteration level
    for (let iteration = 1; iteration < iterations; iteration++) {
      const nextRules = ruleUsage.get(iteration);

      // For each rule used in the previous iteration
      for (const rule of currentRules) {
        const replacement = this._ruleSet.rules.get(rule);
        // Add any rules used in the replacement
        for (const char of replacement) {
          if (this._ruleSet.rules.has(char)) {
            nextRules.add(char);
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
  constructor() {
    this.ctx = null;
    this.turtle = null;
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

  generate(ruleSet, iterations, angle, panState) {
    // Send generation start message
    self.postMessage({
      status: 'generating',
      lSystemParams: { ruleSet, iterations, angle },
    });

    const startTime = performance.now();

    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.strokeStyle = '#2c3e50';

    const lsystem = new LSystem(ruleSet);
    this.turtle = lsystem.run(angle, iterations);
    this.draw(this.turtle.getPath(), this.turtle.getBounds(), panState);

    const totalTime = performance.now() - startTime;

    // Send completion message with timing data
    self.postMessage({
      status: 'complete',
      lSystemParams: { ruleSet, iterations, angle },
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
  let newLSystemParams = null;

  const processPendingOps = () => {
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
      renderer.initCanvas(params.canvas);
    },

    resize(params) {
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
    }
  };
})();

self.onmessage = function (e) {
  const { method, params } = e.data;
  WORKER_METHODS[method](params);
};
