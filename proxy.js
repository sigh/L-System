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
    const axiom = document.getElementById('axiom').value;
    const rules = document.getElementById('rules').value;
    const iterations = parseInt(document.getElementById('iterations').value);
    const angle = parseInt(document.getElementById('angle').value);
    const length = parseInt(document.getElementById('length').value);

    this._worker.postMessage({
      axiom,
      rules,
      iterations,
      angle,
      length
    });
  }
}