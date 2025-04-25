class PanState {
  constructor() {
    this.reset();
  }

  reset() {
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
  }
}

class Canvas {
  static MAX_SEGMENTS = 1e6; // 1 million segments

  constructor(canvas, onStatusMessage) {
    this._canvas = canvas;
    this._onStatusMessage = onStatusMessage;

    this._worker = new Worker('js/renderer.worker.js');
    this._worker.onmessage = (e) => {
      onStatusMessage(e.data);
    };

    // Create OffscreenCanvas once
    this._offscreen = this._canvas.transferControlToOffscreen();
    this._worker.postMessage({
      method: 'initCanvas',
      params: { canvas: this._offscreen },
    }, [this._offscreen]);

    // Initialize pan state
    this._panState = new PanState();

    // Set up resize observer
    this._resizeObserver = new ResizeObserver(() => this._resizeCanvas());
    this._resizeObserver.observe(this._canvas);

    // Initial resize
    this._resizeCanvas();

    // Add mouse panning and zooming
    this._setupPanning();

    // Initialize deferred render function
    this._deferredRender = deferUntilAnimationFrame((message) => {
      this._worker.postMessage(message);
    });
  }

  _setupPanning() {
    let isPanning = false;
    let lastX = 0;
    let lastY = 0;
    let lastTouchDistance = 0;
    let isPinching = false;

    const handlePanStart = (x, y) => {
      if (isPinching) return; // Don't start panning if we're in the middle of a pinch
      isPanning = true;
      lastX = x;
      lastY = y;
      this._canvas.style.cursor = 'grabbing';
    };

    const handlePanMove = (x, y) => {
      if (!isPanning || isPinching) return;

      const dx = x - lastX;
      const dy = y - lastY;

      this._panState.panX += dx;
      this._panState.panY += dy;

      this._deferredRender({
        method: 'updateView',
        params: { panState: this._panState }
      });

      lastX = x;
      lastY = y;
    };

    const handlePanEnd = () => {
      isPanning = false;
      this._canvas.style.cursor = 'grab';
    };

    const handleZoom = (centerX, centerY, zoomFactor) => {
      const newZoom = this._panState.zoom * zoomFactor;

      // Limit zoom range
      if (newZoom >= 0.1 && newZoom <= 1e6) {
        // Calculate the point in the original coordinate system
        const rect = this._canvas.getBoundingClientRect();
        const originalX = (centerX - rect.left - this._panState.panX) / this._panState.zoom;
        const originalY = (centerY - rect.top - this._panState.panY) / this._panState.zoom;

        // Update zoom
        this._panState.zoom = newZoom;

        // Calculate new pan to keep the point under the center
        this._panState.panX = centerX - rect.left - originalX * this._panState.zoom;
        this._panState.panY = centerY - rect.top - originalY * this._panState.zoom;

        this._deferredRender({
          method: 'updateView',
          params: { panState: this._panState }
        });
      }
    };

    // Mouse events
    this._canvas.addEventListener('mousedown', (e) => {
      handlePanStart(e.clientX, e.clientY);
    });

    this._canvas.addEventListener('mousemove', (e) => {
      handlePanMove(e.clientX, e.clientY);
    });

    this._canvas.addEventListener('mouseup', handlePanEnd);
    this._canvas.addEventListener('mouseleave', handlePanEnd);

    // Touch events
    this._canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        handlePanStart(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        isPinching = true;
        // Calculate initial touch distance for pinch zoom
        lastTouchDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    });

    this._canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && isPanning && !isPinching) {
        handlePanMove(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        // Handle pinch zoom
        const currentDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );

        const zoomFactor = currentDistance / lastTouchDistance;
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

        handleZoom(centerX, centerY, zoomFactor);
        lastTouchDistance = currentDistance;
      }
    });

    this._canvas.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        isPinching = false;
        handlePanEnd();
      } else if (e.touches.length === 1) {
        // If we were pinching and now have one finger, don't start panning
        isPinching = false;
        isPanning = false;
      }
    });

    // Wheel zoom
    this._canvas.addEventListener('wheel', (e) => {
      e.preventDefault();

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const centerX = e.clientX;
      const centerY = e.clientY;

      handleZoom(centerX, centerY, zoomFactor);
    });

    // Set initial cursor style
    this._canvas.style.cursor = 'grab';
  }

  _resizeCanvas() {
    const width = this._canvas.offsetWidth;
    const height = this._canvas.offsetHeight;
    this._worker.postMessage({
      method: 'resize',
      params: {
        width,
        height,
        panState: this._panState
      }
    });
  }

  _handleError(message, lSystemParams) {
    this._onStatusMessage({
      status: 'error',
      lSystemParams,
      message
    });
    this._worker.postMessage({
      method: 'clear'
    });
  }

  generate(lSystemParams, resetPan = true) {
    const { ruleSet, iterations, angle } = lSystemParams;

    // Validate iterations
    if (iterations < 1 || !Number.isInteger(iterations)) {
      this._handleError('Iteration count is invalid', lSystemParams);
      return;
    }

    // Check if the line length would be too long
    const lineLength = ruleSet.calculateLineLength(iterations);
    if (lineLength > Canvas.MAX_SEGMENTS) {
      this._handleError(`Curve too long: ${lineLength} steps`, lSystemParams);
      return;
    }

    // Reset pan state when generating new L-system
    if (resetPan) {
      this._panState.reset();
    }

    this._worker.postMessage({
      method: 'generate',
      params: {
        ruleSet,
        iterations,
        angle,
        panState: this._panState
      }
    });
  }
}