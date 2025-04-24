class PageHandler {
  constructor() {
    this._canvas = new Canvas(
      document.getElementById('canvas'),
      (data) => this._handleStatusMessage(data)
    );
    this._setupPresets();
    this._setupControls();
    this._loadFromUrl();
  }

  _handleStatusMessage(data) {
    const timingElement = document.getElementById('timing');

    switch (data.status) {
      case 'generating':
        timingElement.textContent = 'Generating...';
        break;
      case 'complete':
        timingElement.textContent = `Rendered in: ${Math.round(data.data.totalTime)} ms`;
        break;
    }
  }

  _getLSystemParams() {
    return {
      axiom: document.getElementById('axiom').value,
      rules: document.getElementById('rules').value,
      iterations: parseInt(document.getElementById('iterations').value),
      angle: parseFloat(document.getElementById('angle').value)
    };
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

  _setupControls() {
    this._setupSliderControl('iterations-slider', 'iterations');
    this._setupSliderControl('angle-slider', 'angle');

    document.getElementById('generate').addEventListener('click', () => {
      this._updateUrl();
      this._updatePresetField();
      this._canvas.generate(this._getLSystemParams(), /* resetPan = */ true);
    });

    // Add preset selection handler
    document.getElementById('preset').addEventListener('change', (e) => {
      const preset = LSystemPresets[e.target.value];
      if (preset) {
        this._updateControlsFromPreset(preset);
        this._updateUrl();
        this._canvas.generate(this._getLSystemParams(), /* resetPan = */ true);
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
        this._canvas.generate(this._getLSystemParams(), /* resetPan = */ false);
      });
    });
  }

  _setupSliderControl(sliderId, inputId) {
    const slider = document.getElementById(sliderId);
    const input = document.getElementById(inputId);

    slider.addEventListener('input', () => {
      input.value = slider.value;
      this._updateUrl();
      this._canvas.generate(this._getLSystemParams(), /* resetPan = */ false);
    });

    input.addEventListener('change', () => {
      slider.value = input.value;
      this._updateUrl();
      this._canvas.generate(this._getLSystemParams(), /* resetPan = */ false);
    });
  }

  _updateUrl() {
    const params = new URLSearchParams();
    const lsystemParams = this._getLSystemParams();
    Object.entries(lsystemParams).forEach(([key, value]) => {
      params.set(key, value);
    });

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }

  _updatePresetField() {
    const { axiom, rules, angle } = this._getLSystemParams();
    const matchingPreset = this._findMatchingPreset(axiom, rules, angle);
    document.getElementById('preset').value = matchingPreset;
  }

  _findMatchingPreset(axiom, rules, angle) {
    return Object.entries(LSystemPresets).find(([_, preset]) =>
      preset.axiom === axiom &&
      preset.rules === rules &&
      preset.angle === angle
    )?.[0] || 'custom';
  }

  _loadFromUrl() {
    const params = new URLSearchParams(window.location.search);
    document.getElementById('axiom').value = params.get('axiom');
    document.getElementById('rules').value = params.get('rules');
    if (params.get('iterations')) {
      document.getElementById('iterations').value = params.get('iterations');
      document.getElementById('iterations-slider').value = params.get('iterations');
    }
    if (params.get('angle')) {
      document.getElementById('angle').value = params.get('angle');
      document.getElementById('angle-slider').value = params.get('angle');
    }

    if (params.get('axiom')) {
      this._updatePresetField();
      this._canvas.generate(this._getLSystemParams(), /* resetPan = */ true);
    } else {
      // Use the first preset if no URL parameters
      const firstPreset = Object.values(LSystemPresets)[0];
      this._updateControlsFromPreset(firstPreset);
      this._updateUrl();
      this._canvas.generate(this._getLSystemParams(), /* resetPan = */ true);
    }
  }
}

// Initialize the page handler when the page loads
window.addEventListener('load', () => {
  new PageHandler();
});