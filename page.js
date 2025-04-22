class PageHandler {
  constructor() {
    this._visualizer = new VisualizerProxy();
    this._setupPresets();
    this._setupControls();
    this._loadFromUrl();
  }

  _setupPresets() {
    const presetSelect = document.getElementById('preset');
    Object.entries(LSystemPresets).forEach(([key, preset]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = preset.name;
      presetSelect.appendChild(option);
    });
  }

  _updateControlsFromPreset(preset) {
    document.getElementById('axiom').value = preset.axiom;
    document.getElementById('rules').value = preset.rules;
    document.getElementById('iterations').value = preset.iterations;
    document.getElementById('iterations-slider').value = preset.iterations;
    document.getElementById('angle').value = preset.angle;
    document.getElementById('angle-slider').value = preset.angle;
  }

  _findMatchingPreset(axiom, rules, angle) {
    return Object.entries(LSystemPresets).find(([_, preset]) =>
      preset.axiom === axiom &&
      preset.rules === rules &&
      Math.abs(preset.angle - parseFloat(angle)) < 0.001
    )?.[0] || '';
  }

  _updatePresetField() {
    const axiom = document.getElementById('axiom').value;
    const rules = document.getElementById('rules').value;
    const angle = document.getElementById('angle').value;
    const matchingPreset = this._findMatchingPreset(axiom, rules, angle);
    document.getElementById('preset').value = matchingPreset;
  }

  _setupControls() {
    this._setupSliderControl('iterations-slider', 'iterations');
    this._setupSliderControl('angle-slider', 'angle');

    document.getElementById('generate').addEventListener('click', () => {
      this._updateUrl();
      this._updatePresetField();
      this._visualizer.generate(true);
    });

    // Add preset selection handler
    document.getElementById('preset').addEventListener('change', (e) => {
      const preset = LSystemPresets[e.target.value];
      if (preset) {
        this._updateControlsFromPreset(preset);
        this._updateUrl();
        this._visualizer.generate(true);
      }
    });

    // Add input change handlers to update URL and preset field
    ['axiom', 'rules', 'angle'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => {
        this._updateUrl();
        this._updatePresetField();
      });
    });

    // Add input change handlers to update URL and regenerate without resetting pan
    ['iterations', 'angle'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => {
        this._updateUrl();
        this._visualizer.generate(false);
      });
    });
  }

  _setupSliderControl(sliderId, inputId) {
    const slider = document.getElementById(sliderId);
    const input = document.getElementById(inputId);

    slider.addEventListener('input', () => {
      input.value = slider.value;
      this._updateUrl();
      this._visualizer.generate(false);
    });

    input.addEventListener('change', () => {
      slider.value = input.value;
      this._updateUrl();
      this._visualizer.generate(false);
    });
  }

  _updateUrl() {
    const params = new URLSearchParams();
    params.set('axiom', document.getElementById('axiom').value);
    params.set('rules', document.getElementById('rules').value);
    params.set('iterations', document.getElementById('iterations').value);
    params.set('angle', document.getElementById('angle').value);

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }

  _loadFromUrl() {
    const params = new URLSearchParams(window.location.search);

    if (params.has('axiom')) {
      document.getElementById('axiom').value = params.get('axiom');
    }
    if (params.has('rules')) {
      document.getElementById('rules').value = params.get('rules');
    }
    if (params.has('iterations')) {
      const iterations = params.get('iterations');
      document.getElementById('iterations').value = iterations;
      document.getElementById('iterations-slider').value = iterations;
    }
    if (params.has('angle')) {
      const angle = params.get('angle');
      document.getElementById('angle').value = angle;
      document.getElementById('angle-slider').value = angle;
    }

    // Update preset field based on loaded parameters
    this._updatePresetField();

    // If we loaded parameters from URL, generate the L-system
    if (params.toString()) {
      this._visualizer.generate(true);
    }
  }
}

// Initialize the page handler when the page loads
window.addEventListener('load', () => {
  new PageHandler();
});