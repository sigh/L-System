class PageHandler {
  constructor() {
    this._visualizer = new Proxy();
    this._setupPresets();
    this._setupControls();
  }

  _setupPresets() {
    this._populatePresets();
    this._setInitialPreset();
  }

  _populatePresets() {
    const presetSelect = document.getElementById('preset');
    Object.entries(LSystemPresets).forEach(([key, preset]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = preset.name;
      presetSelect.appendChild(option);
    });
  }

  _setInitialPreset() {
    const firstPreset = Object.values(LSystemPresets)[0];
    if (firstPreset) {
      this._updateControlsFromPreset(firstPreset);
      this._visualizer.generate();
    }
  }

  _updateControlsFromPreset(preset) {
    document.getElementById('axiom').value = preset.axiom;
    document.getElementById('rules').value = preset.rules;
    document.getElementById('iterations').value = preset.iterations;
    document.getElementById('iterations-slider').value = preset.iterations;
    document.getElementById('angle').value = preset.angle;
    document.getElementById('angle-slider').value = preset.angle;
    document.getElementById('length').value = preset.length;
    document.getElementById('length-slider').value = preset.length;
  }

  _setupControls() {
    this._setupSliderControl('iterations-slider', 'iterations');
    this._setupSliderControl('angle-slider', 'angle');
    this._setupSliderControl('length-slider', 'length');

    document.getElementById('generate').addEventListener('click', () => this._visualizer.generate());

    // Add preset selection handler
    document.getElementById('preset').addEventListener('change', (e) => {
      const preset = LSystemPresets[e.target.value];
      if (preset) {
        this._updateControlsFromPreset(preset);
        this._visualizer.generate();
      }
    });
  }

  _setupSliderControl(sliderId, inputId) {
    const slider = document.getElementById(sliderId);
    const input = document.getElementById(inputId);

    slider.addEventListener('input', () => {
      input.value = slider.value;
    });

    input.addEventListener('input', () => {
      const value = parseInt(input.value);
      if (value >= input.min && value <= input.max) {
        slider.value = value;
      }
    });
  }
}

// Initialize the page handler when the page loads
window.addEventListener('load', () => {
  new PageHandler();
});