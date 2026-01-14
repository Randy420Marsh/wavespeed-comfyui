/**
 * WaveSpeed Predictor - DOM widgets module (non-media now, media later)
 * Naming convention:
 *   createNonMediaDom* for non-media inputs
 *   createMediaDom* for media inputs (reserved)
 */

function createLabel(text, isRequired, description) {
    const label = document.createElement('div');
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.gap = '4px';
    label.style.color = '#cfd3da';
    label.style.fontSize = '12px';
    label.style.fontWeight = '500';

    const labelText = document.createElement('span');
    labelText.textContent = text || '';
    label.appendChild(labelText);

    if (isRequired) {
        const requiredMark = document.createElement('span');
        requiredMark.textContent = '*';
        requiredMark.style.color = '#ff6b6b';
        requiredMark.style.fontSize = '12px';
        requiredMark.style.fontWeight = 'normal';
        label.appendChild(requiredMark);
    }

    if (description) {
        const info = document.createElement('span');
        info.textContent = '?';
        info.title = description;
        info.style.display = 'inline-flex';
        info.style.alignItems = 'center';
        info.style.justifyContent = 'center';
        info.style.width = '14px';
        info.style.height = '14px';
        info.style.border = '1px solid #666';
        info.style.borderRadius = '50%';
        info.style.color = '#888';
        info.style.fontSize = '10px';
        info.style.cursor = 'help';
        label.appendChild(info);
    }

    return label;
}

function createRowContainer() {
    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = 'minmax(120px, max-content) 1fr';
    row.style.alignItems = 'center';
    row.style.gap = '10px';
    row.style.padding = '6px 0';
    return row;
}

function createInputBase() {
    const input = document.createElement('input');
    input.type = 'text';
    input.style.width = '100%';
    input.style.padding = '6px 8px';
    input.style.borderRadius = '6px';
    input.style.border = '1px solid #3a3f47';
    input.style.background = '#1f2329';
    input.style.color = '#e6e6e6';
    input.style.fontSize = '12px';
    return input;
}

function createTextareaBase() {
    const textarea = document.createElement('textarea');
    textarea.rows = 4;
    textarea.style.width = '100%';
    textarea.style.padding = '6px 8px';
    textarea.style.borderRadius = '6px';
    textarea.style.border = '1px solid #3a3f47';
    textarea.style.background = '#1f2329';
    textarea.style.color = '#e6e6e6';
    textarea.style.fontSize = '12px';
    textarea.style.resize = 'vertical';
    return textarea;
}

function createSelectBase(options) {
    const select = document.createElement('select');
    select.style.width = '100%';
    select.style.padding = '6px 8px';
    select.style.borderRadius = '6px';
    select.style.border = '1px solid #3a3f47';
    select.style.background = '#1f2329';
    select.style.color = '#e6e6e6';
    select.style.fontSize = '12px';
    for (const opt of options || []) {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
    }
    return select;
}

function applyDisabled(el, disabled) {
    if (!el) return;
    el.disabled = !!disabled;
    el.style.opacity = disabled ? '0.6' : '1';
    el.style.pointerEvents = disabled ? 'none' : 'auto';
}

function createDomWidgetBase(node, param, inputEl, onChange) {
    const container = createRowContainer();
    const label = createLabel(param.displayName || param.name, param.required, param.description);
    container.appendChild(label);
    container.appendChild(inputEl);

    const widget = node.addDOMWidget(param.name, 'div', container, { serialize: false });
    widget._wavespeed_dynamic = true;
    widget._wavespeed_param = param.name;

    const setValue = (value) => {
        if (inputEl instanceof HTMLInputElement || inputEl instanceof HTMLTextAreaElement) {
            inputEl.value = value ?? '';
        } else if (inputEl instanceof HTMLSelectElement) {
            inputEl.value = value ?? '';
        }
    };

    const restoreValue = (value) => {
        setValue(value);
        if (onChange) onChange(value);
    };

    return { widget, container, inputEl, setValue, restoreValue };
}

export function createNonMediaDomText(node, param, config = {}) {
    const inputEl = config.multiline ? createTextareaBase() : createInputBase();
    inputEl.placeholder = config.placeholder || '';

    const onChange = (value) => {
        if (config.onChange) config.onChange(value);
    };

    inputEl.addEventListener('input', (e) => onChange(e.target.value));

    const result = createDomWidgetBase(node, param, inputEl, onChange);
    applyDisabled(inputEl, config.disabled);
    if (config.initialValue !== undefined) result.setValue(config.initialValue);
    return result;
}

export function createNonMediaDomNumber(node, param, config = {}) {
    const inputEl = createInputBase();
    inputEl.type = 'number';
    if (config.min !== undefined) inputEl.min = String(config.min);
    if (config.max !== undefined) inputEl.max = String(config.max);
    if (config.step !== undefined) inputEl.step = String(config.step);

    const onChange = (value) => {
        const parsed = value === '' ? '' : Number(value);
        if (config.onChange) config.onChange(parsed);
    };

    inputEl.addEventListener('input', (e) => onChange(e.target.value));

    const result = createDomWidgetBase(node, param, inputEl, onChange);
    applyDisabled(inputEl, config.disabled);
    if (config.initialValue !== undefined) result.setValue(config.initialValue);
    return result;
}

export function createNonMediaDomSelect(node, param, config = {}) {
    const inputEl = createSelectBase(config.options || []);

    const onChange = (value) => {
        if (config.onChange) config.onChange(value);
    };

    inputEl.addEventListener('change', (e) => onChange(e.target.value));

    const result = createDomWidgetBase(node, param, inputEl, onChange);
    applyDisabled(inputEl, config.disabled);
    if (config.initialValue !== undefined) result.setValue(config.initialValue);
    return result;
}

export function setNonMediaDomDisabled(domWidget, disabled) {
    if (!domWidget) return;
    applyDisabled(domWidget.inputEl, disabled);
}

export function createSizeTitleDom(param, rangeText) {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '8px';
    container.style.padding = '8px 10px';
    container.style.backgroundColor = '#2a2a2a';
    container.style.border = '1px solid #444';
    container.style.borderRadius = '4px 4px 0 0';

    const titleLabel = createLabel(param.displayName || param.name, param.required, param.description);
    titleLabel.style.color = '#e0e0e0';
    titleLabel.style.fontSize = '12px';
    titleLabel.style.fontWeight = '500';

    const rangeInfo = document.createElement('span');
    rangeInfo.textContent = rangeText || '';
    rangeInfo.style.color = '#666';
    rangeInfo.style.marginLeft = 'auto';
    rangeInfo.style.fontSize = '11px';

    container.appendChild(titleLabel);
    container.appendChild(rangeInfo);

    return container;
}

// Helper function to initialize size values based on x-hidden and defaults
export function initializeSizeValues(param, parsedDefault, storedWidth, storedHeight) {
    let width = storedWidth;
    let height = storedHeight;

    if (param.xHidden === true) {
        // x-hidden: only use API default values, otherwise keep null (empty)
        if (width === null && parsedDefault) {
            width = parsedDefault.width;
        }
        if (height === null && parsedDefault) {
            height = parsedDefault.height;
        }
    } else {
        // non x-hidden: use default values or fallback to 1024
        if (width === null) {
            width = parsedDefault?.width || 1024;
        }
        if (height === null) {
            height = parsedDefault?.height || 1024;
        }
    }

    return { width, height };
}

export function createSizeRatioDom(presets, onSelect) {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexWrap = 'wrap';
    container.style.gap = '4px';
    container.style.padding = '6px 10px';
    container.style.backgroundColor = '#2a2a2a';
    container.style.border = '1px solid #444';
    container.style.borderTop = 'none';

    const buttons = [];
    (presets || []).forEach((preset) => {
        const btn = document.createElement('button');
        btn.className = 'wavespeed-ratio-btn';
        btn.dataset.ratio = preset.label;
        btn.innerHTML = `<span class="ratio-icon" style="font-size:10px;opacity:0.7;">${preset.icon}</span><span class="ratio-label" style="font-weight:500;">${preset.label}</span>`;
        btn.title = `${preset.width} x ${preset.height}`;
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.gap = '4px';
        btn.style.padding = '4px 8px';
        btn.style.backgroundColor = '#2a2a2a';
        btn.style.color = '#e0e0e0';
        btn.style.border = '1px solid #444';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '11px';
        btn.style.transition = 'all 0.2s ease';

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (onSelect) onSelect(preset);
        });

        buttons.push(btn);
        container.appendChild(btn);
    });

    return { container, buttons };
}

export function createSizeAxisDom(labelText, value, min, max, onInput, onBlur) {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '8px';
    container.style.padding = '6px 10px';
    container.style.backgroundColor = '#2a2a2a';
    container.style.border = '1px solid #444';
    container.style.borderTop = 'none';

    const label = document.createElement('label');
    label.textContent = labelText || '';
    label.style.color = '#888';
    label.style.fontSize = '11px';
    label.style.minWidth = '48px';

    const input = document.createElement('input');
    input.type = 'number';
    if (min !== undefined) input.min = String(min);
    if (max !== undefined) input.max = String(max);
    input.step = '8';
    input.style.flex = '1';
    input.style.width = '100%';
    input.style.padding = '6px 10px';
    input.style.backgroundColor = '#2a2a2a';
    input.style.color = '#e0e0e0';
    input.style.border = '1px solid #444';
    input.style.borderRadius = '4px';
    input.style.fontSize = '13px';
    input.style.fontFamily = '-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif';
    input.style.textAlign = 'center';
    input.style.boxSizing = 'border-box';
    input.value = value ?? '';

    input.addEventListener('input', (e) => {
        if (onInput) onInput(e.target.value, input);
    });
    input.addEventListener('blur', (e) => {
        if (onBlur) onBlur(e.target.value, input, labelText || '');
    });

    container.appendChild(label);
    container.appendChild(input);

    return { container, input };
}

export function showSizeToast(message, anchorEl) {
    if (!anchorEl || !anchorEl.ownerDocument) return;
    const doc = anchorEl.ownerDocument;
    const rect = anchorEl.getBoundingClientRect();
    const toast = doc.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.left = `${Math.max(8, rect.left)}px`;
    toast.style.top = `${Math.max(8, rect.top - 28)}px`;
    toast.style.padding = '4px 8px';
    toast.style.background = '#1f1f1f';
    toast.style.color = '#f1f1f1';
    toast.style.border = '1px solid #b04a4a';
    toast.style.borderRadius = '4px';
    toast.style.fontSize = '11px';
    toast.style.zIndex = '9999';
    toast.style.pointerEvents = 'none';
    doc.body.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 1800);
}
