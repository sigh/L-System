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

class VisualizerProxy {
  constructor(canvas, onWorkerMessage) {
    this._canvas = canvas;
    this._onWorkerMessage = onWorkerMessage;

    this._worker = new Worker('js/renderer.worker.js');
    this._worker.onmessage = (e) => {
      this._onWorkerMessage(e.data);
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

    this._canvas.addEventListener('mousedown', (e) => {
      isPanning = true;
      lastX = e.clientX;
      lastY = e.clientY;
      this._canvas.style.cursor = 'grabbing';
    });

    this._canvas.addEventListener('mousemove', (e) => {
      if (!isPanning) return;

      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;

      this._panState.panX += dx;
      this._panState.panY += dy;

      this._deferredRender({
        method: 'updateView',
        params: { panState: this._panState }
      });

      lastX = e.clientX;
      lastY = e.clientY;
    });

    this._canvas.addEventListener('mouseup', () => {
      isPanning = false;
      this._canvas.style.cursor = 'grab';
    });

    this._canvas.addEventListener('mouseleave', () => {
      isPanning = false;
      this._canvas.style.cursor = 'grab';
    });

    // Add zooming
    this._canvas.addEventListener('wheel', (e) => {
      e.preventDefault();

      // Calculate zoom factor (0.9 for zoom out, 1.1 for zoom in)
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;

      // Calculate mouse position relative to canvas
      const rect = this._canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate new zoom
      const newZoom = this._panState.zoom * zoomFactor;

      // Limit zoom range
      if (newZoom >= 0.1 && newZoom <= 10) {
        // Calculate the point in the original coordinate system
        const originalX = (mouseX - this._panState.panX) / this._panState.zoom;
        const originalY = (mouseY - this._panState.panY) / this._panState.zoom;

        // Update zoom
        this._panState.zoom = newZoom;

        // Calculate new pan to keep the point under the mouse
        this._panState.panX = mouseX - originalX * this._panState.zoom;
        this._panState.panY = mouseY - originalY * this._panState.zoom;

        this._deferredRender({
          method: 'updateView',
          params: { panState: this._panState }
        });
      }
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

  generate({ axiom, rules, iterations, angle }, resetPan = true) {
    // Reset pan state when generating new L-system
    if (resetPan) {
      this._panState.reset();
    }

    this._worker.postMessage({
      method: 'generate',
      params: {
        axiom,
        rules,
        iterations,
        angle,
        panState: this._panState
      }
    });
  }
}