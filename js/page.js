class RuleSet {
  static SYMBOL_REGEX = /[^\d\s]\d*/g;

  constructor(axiom, rulesString) {
    this.axiom = this._parseSymbols(axiom);
    this.rules = this._parseRules(rulesString);
  }

  _parseSymbols(str) {
    return [...str.matchAll(RuleSet.SYMBOL_REGEX)].map(match => match[0]);
  }

  _parseRules(rulesString) {
    const rules = new Map();
    const rulePairs = rulesString.split(/[;\n]/).filter(pair => pair.trim() !== '');
    rulePairs.forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) {
        // Remove all whitespace from both key and value
        const symbol = key.trim();
        const replacement = this._parseSymbols(value.replace(/\s+/g, ''));
        rules.set(symbol, replacement);
      }
    });
    return rules;
  }

  // Calculates the total length of the line for a given number of iterations.
  // This is useful for performance optimization and auto-limiting iterations.
  calculateLineLength(iterations) {
    // Start with counts of symbols in the axiom
    let counts = new Map();
    for (const symbol of this.axiom) {
      counts.set(symbol, (counts.get(symbol) || 0) + 1);
    }

    for (let i = 0; i < iterations; i++) {
      const nextCounts = new Map();

      for (const [symbol, count] of counts) {
        const replacement = this.rules.get(symbol);
        if (replacement) {
          // If it's a rule, count each symbol in the replacement
          for (const replacementSymbol of replacement) {
            nextCounts.set(replacementSymbol,
              (nextCounts.get(replacementSymbol) || 0) + count);
          }
        } else {
          // If it's not a rule, keep its count
          nextCounts.set(symbol,
            (nextCounts.get(symbol) || 0) + count);
        }
      }

      counts = nextCounts;
    }

    // Sum up the counts of all symbols that start with 'F'
    return [...counts.entries()]
      .filter(([symbol]) => symbol[0] === 'F')
      .reduce((sum, [_, count]) => sum + count, 0);
  }

  equals(other) {
    if (!(other instanceof RuleSet)) {
      return false;
    }
    if (this.axiom.length !== other.axiom.length) {
      return false;
    }
    if (!arraysAreEqual(this.axiom, other.axiom)) {
      return false;
    }
    if (this.rules.size !== other.rules.size) {
      return false;
    }
    for (const [key, value] of this.rules) {
      const otherValue = other.rules.get(key);
      if (!otherValue || !arraysAreEqual(value, otherValue)) {
        return false;
      }
    }
    return true;
  }
}

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
        timingElement.classList.remove('error');
        break;
      case 'complete':
        timingElement.textContent = `Rendered in: ${Math.round(data.data.totalTime)} ms`;
        timingElement.classList.remove('error');
        break;
      case 'error':
        timingElement.textContent = data.message;
        timingElement.classList.add('error');
        break;
    }
  }

  _getLSystemParams() {
    const axiom = document.getElementById('axiom').value;
    const rules = document.getElementById('rules').value;
    const iterations = parseFloat(document.getElementById('iterations').value);
    const angle = parseFloat(document.getElementById('angle').value);
    return {
      ruleSet: new RuleSet(axiom, rules),
      iterations,
      angle
    };
  }

  _setupPresets() {
    const presetSelect = document.getElementById('preset');
    Object.entries(L_SYSTEM_PRESETS).forEach(([key, preset]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = preset.name;
      preset.ruleSet = new RuleSet(preset.axiom, preset.rules);
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
      const params = this._getLSystemParams();
      this._updateUrl(params);
      this._updatePresetField(params);
      this._canvas.generate(params, /* resetPan = */ true);
    });

    // Add preset selection handler
    document.getElementById('preset').addEventListener('change', (e) => {
      const preset = L_SYSTEM_PRESETS[e.target.value];
      if (preset) {
        this._updateControlsFromPreset(preset);
        const params = this._getLSystemParams();
        this._updateUrl(params);
        this._canvas.generate(params, /* resetPan = */ true);
      }
    });

    // Add input change handlers to update URL and preset field
    ['axiom', 'rules', 'angle'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => {
        const params = this._getLSystemParams();
        this._updateUrl(params);
        this._updatePresetField(params);
      });
    });

    // Add input change handlers to update URL and regenerate without resetting pan
    ['iterations', 'angle'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => {
        const params = this._getLSystemParams();
        this._updateUrl(params);
        this._canvas.generate(params, /* resetPan = */ false);
      });
    });
  }

  _setupSliderControl(sliderId, inputId) {
    const slider = document.getElementById(sliderId);
    const input = document.getElementById(inputId);

    slider.addEventListener('input', () => {
      input.value = slider.value;
      const params = this._getLSystemParams();
      this._updateUrl(params);
      this._canvas.generate(params, /* resetPan = */ false);
    });

    input.addEventListener('change', () => {
      slider.value = input.value;
      const params = this._getLSystemParams();
      this._updateUrl(params);
      this._canvas.generate(params, /* resetPan = */ false);
    });
  }

  _updateUrl(params) {
    const urlParams = new URLSearchParams();
    urlParams.set('axiom', params.ruleSet.axiom.join(''));
    urlParams.set('rules', document.getElementById('rules').value);
    urlParams.set('iterations', params.iterations);
    urlParams.set('angle', params.angle);

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }

  _updatePresetField(params) {
    const matchingPreset = this._findMatchingPreset(params.ruleSet, params.angle);
    document.getElementById('preset').value = matchingPreset;
  }

  _findMatchingPreset(ruleSet, angle) {
    return Object.entries(L_SYSTEM_PRESETS).find(([_, preset]) =>
      preset.angle === angle && preset.ruleSet.equals(ruleSet)
    )?.[0] || 'custom';
  }

  _loadFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);

    if (!urlParams.get('axiom')) {
      // Use the first preset if no axiom (hence invalid ruleset).
      const preset = Object.values(L_SYSTEM_PRESETS)[0];
      this._updateControlsFromPreset(preset);
      this._updateUrl(preset);
      this._canvas.generate(preset, /* resetPan = */ true);
      return;
    }

    document.getElementById('axiom').value = urlParams.get('axiom');
    document.getElementById('rules').value = urlParams.get('rules');
    if (urlParams.get('iterations')) {
      document.getElementById('iterations').value = urlParams.get('iterations');
      document.getElementById('iterations-slider').value = urlParams.get('iterations');
    }
    if (urlParams.get('angle')) {
      document.getElementById('angle').value = urlParams.get('angle');
      document.getElementById('angle-slider').value = urlParams.get('angle');
    }

    const params = this._getLSystemParams();
    this._updatePresetField(params);
    this._canvas.generate(params, /* resetPan = */ true);
  }
}

// Initialize the page handler when the page loads
window.addEventListener('load', () => {
  new PageHandler();
});