class VisualizerProxy {
  constructor() {
    this._canvas = document.getElementById('canvas');
    this._resizeCanvas();
    window.addEventListener('resize', () => this._resizeCanvas());

    this._worker = new Worker('renderer.worker.js');
    this._worker.onmessage = (e) => {
      const { totalTime } = e.data;
      this._updateTimingDisplay(totalTime);
    };

    // Create OffscreenCanvas once
    this._offscreen = this._canvas.transferControlToOffscreen();
    this._worker.postMessage({ canvas: this._offscreen }, [this._offscreen]);

    // Add mouse panning and zooming
    this._resetPanState();
    this._setupPanning();
  }

  _resetPanState() {
    this._panX = 0;
    this._panY = 0;
    this._zoom = 1;
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

      this._panX += dx;
      this._panY += dy;

      this._worker.postMessage({
        pan: { x: this._panX, y: this._panY, zoom: this._zoom }
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
      const newZoom = this._zoom * zoomFactor;

      // Limit zoom range
      if (newZoom >= 0.1 && newZoom <= 10) {
        // Calculate the point in the original coordinate system
        const originalX = (mouseX - this._panX) / this._zoom;
        const originalY = (mouseY - this._panY) / this._zoom;

        // Update zoom
        this._zoom = newZoom;

        // Calculate new pan to keep the point under the mouse
        this._panX = mouseX - originalX * this._zoom;
        this._panY = mouseY - originalY * this._zoom;

        this._worker.postMessage({
          pan: { x: this._panX, y: this._panY, zoom: this._zoom }
        });
      }
    });

    // Set initial cursor style
    this._canvas.style.cursor = 'grab';
  }

  _resizeCanvas() {
    this._canvas.width = this._canvas.offsetWidth;
    this._canvas.height = this._canvas.offsetHeight;
  }

  _updateTimingDisplay(totalTime) {
    const timingElement = document.getElementById('timing');
    timingElement.textContent = `Total time: ${totalTime.toFixed(2)}ms`;
  }

  generate() {
    // Reset pan state when generating new L-system
    this._resetPanState();

    const axiom = document.getElementById('axiom').value;
    const rules = document.getElementById('rules').value;
    const iterations = parseInt(document.getElementById('iterations').value);
    const angle = parseInt(document.getElementById('angle').value);

    this._worker.postMessage({
      axiom,
      rules,
      iterations,
      angle
    });
  }
}