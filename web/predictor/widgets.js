/**
 * WaveSpeed Predictor - Widget creation and management module
 */

import { getMediaType, getOriginalApiType } from './parameters.js';
import { createFilePreview, createLoadingPreview, createErrorPreview, createUploadButton, uploadToWaveSpeed } from './media.js';

// Create label element (with required marker)
function createLabelWithRequired(text, isRequired, description) {
    const labelContainer = document.createElement('span');
    labelContainer.style.display = 'inline-flex';
    labelContainer.style.alignItems = 'center';
    labelContainer.style.gap = '2px';
    
    const labelText = document.createElement('span');
    labelText.textContent = text;
    labelContainer.appendChild(labelText);
    
    if (isRequired) {
        const requiredMark = document.createElement('span');
        requiredMark.textContent = '*';
        requiredMark.style.color = '#ff6b6b';
        requiredMark.style.fontSize = '14px';
        requiredMark.style.fontWeight = 'normal';
        requiredMark.style.marginLeft = '1px';
        requiredMark.style.lineHeight = '1';
        labelContainer.appendChild(requiredMark);
    }
    
    // Add description icon (tooltip)
    if (description) {
        const infoIcon = createInfoTooltip(description);
        labelContainer.appendChild(infoIcon);
    }
    
    return labelContainer;
}

// Create info icon (with tooltip)
function createInfoTooltip(description) {
    const iconContainer = document.createElement('span');
    iconContainer.style.position = 'relative';
    iconContainer.style.display = 'inline-flex';
    iconContainer.style.alignItems = 'center';
    iconContainer.style.marginLeft = '4px';
    iconContainer.style.cursor = 'help';
    
    const icon = document.createElement('span');
    icon.textContent = '?';
    icon.style.display = 'inline-flex';
    icon.style.alignItems = 'center';
    icon.style.justifyContent = 'center';
    icon.style.width = '14px';
    icon.style.height = '14px';
    icon.style.fontSize = '10px';
    icon.style.fontWeight = 'bold';
    icon.style.color = '#888';
    icon.style.backgroundColor = 'transparent';
    icon.style.border = '1px solid #666';
    icon.style.borderRadius = '50%';
    icon.style.opacity = '0.8';
    icon.style.transition = 'all 0.2s ease';
    
    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'wavespeed-tooltip';
    tooltip.textContent = description;
    tooltip.style.position = 'fixed';
    tooltip.style.backgroundColor = '#2a2a2a';
    tooltip.style.color = '#e0e0e0';
    tooltip.style.padding = '8px 12px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '11px';
    tooltip.style.lineHeight = '1.4';
    tooltip.style.maxWidth = '280px';
    tooltip.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4)';
    tooltip.style.border = '1px solid #444';
    tooltip.style.zIndex = '999999';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.opacity = '0';
    tooltip.style.transition = 'opacity 0.15s ease';
    tooltip.style.whiteSpace = 'normal';
    tooltip.style.wordWrap = 'break-word';
    
    // Add to body
    document.body.appendChild(tooltip);
    
    // Show on mouse hover
    iconContainer.addEventListener('mouseenter', (e) => {
        icon.style.opacity = '1';
        icon.style.color = '#4a9eff';
        icon.style.borderColor = '#4a9eff';
        
        // Calculate position
        const rect = iconContainer.getBoundingClientRect();
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.bottom + 5}px`;
        
        // Check if exceeds screen right edge
        const tooltipRect = tooltip.getBoundingClientRect();
        if (tooltipRect.right > window.innerWidth) {
            tooltip.style.left = `${window.innerWidth - tooltipRect.width - 10}px`;
        }
        
        tooltip.style.opacity = '1';
    });
    
    // Hide on mouse leave
    iconContainer.addEventListener('mouseleave', () => {
        icon.style.opacity = '0.8';
        icon.style.color = '#888';
        icon.style.borderColor = '#666';
        tooltip.style.opacity = '0';
    });
    
    // Prevent event bubbling
    iconContainer.addEventListener('mousedown', (e) => e.stopPropagation());
    iconContainer.addEventListener('click', (e) => e.stopPropagation());
    
    iconContainer.appendChild(icon);
    
    // Save tooltip reference for cleanup
    iconContainer._tooltip = tooltip;
    
    return iconContainer;
}

// Create description element (deprecated, use tooltip instead)
function createDescriptionElement(description) {
    if (!description) return null;
    
    // Return null, no longer display description text
    // Description is now shown via tooltip on ? icon
    return null;
}

// Size ratio presets
const SIZE_RATIO_PRESETS = [
    { label: '1:1', icon: '□', width: 1024, height: 1024 },
    { label: '16:9', icon: '▭', width: 1344, height: 756 },
    { label: '9:16', icon: '▯', width: 756, height: 1344 },
    { label: '4:3', icon: '□', width: 1152, height: 864 },
    { label: '3:4', icon: '▯', width: 864, height: 1152 },
    { label: '3:2', icon: '▭', width: 1216, height: 832 },
    { label: '2:3', icon: '▯', width: 832, height: 1216 },
];

// Create Size selector widget
export function createSizeWidget(node, param) {
    const container = document.createElement('div');
    container.className = 'wavespeed-size-selector';
    
    let isExpanded = false;
    let currentWidth = 1024;
    let currentHeight = 1024;
    let currentRatio = '1:1';
    const minSize = param.min || 256;
    const maxSize = param.max || 2048;
    
    // Parse default value
    if (param.default) {
        const match = param.default.match(/(\d+)\s*[*x×]\s*(\d+)/i);
        if (match) {
            currentWidth = parseInt(match[1]);
            currentHeight = parseInt(match[2]);
        }
    }
    
    // Collapsible header
    const header = document.createElement('div');
    header.className = 'wavespeed-size-header';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '8px';
    header.style.padding = '8px 10px';
    header.style.cursor = 'pointer';
    header.style.userSelect = 'none';
    header.style.backgroundColor = '#2a2a2a';
    header.style.border = '1px solid #444';
    header.style.borderRadius = '4px';
    
    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'wavespeed-size-toggle';
    toggleIcon.innerHTML = '○';
    toggleIcon.style.color = '#4a9eff';
    toggleIcon.style.fontSize = '10px';
    toggleIcon.style.width = '14px';
    toggleIcon.style.textAlign = 'center';
    
    const titleLabel = createLabelWithRequired(param.displayName || 'Size', param.required, param.description);
    titleLabel.style.color = '#e0e0e0';
    titleLabel.style.fontSize = '12px';
    titleLabel.style.fontWeight = '500';
    
    const valuePreview = document.createElement('span');
    valuePreview.className = 'wavespeed-size-preview';
    valuePreview.textContent = `${currentWidth}*${currentHeight}`;
    valuePreview.style.marginLeft = 'auto';
    valuePreview.style.color = '#888';
    valuePreview.style.fontSize = '11px';
    valuePreview.style.fontFamily = 'monospace';
    
    header.appendChild(toggleIcon);
    header.appendChild(titleLabel);
    header.appendChild(valuePreview);
    
    // Collapsible content area
    const content = document.createElement('div');
    content.className = 'wavespeed-size-content';
    content.style.display = 'none';
    content.style.flexDirection = 'column';
    content.style.gap = '8px';
    content.style.padding = '10px';
    content.style.backgroundColor = '#2a2a2a';
    content.style.border = '1px solid #444';
    content.style.borderTop = 'none';
    content.style.borderRadius = '0 0 4px 4px';
    
    // Ratio buttons row
    const ratioRow = document.createElement('div');
    ratioRow.className = 'wavespeed-size-ratios';
    ratioRow.style.display = 'flex';
    ratioRow.style.flexWrap = 'wrap';
    ratioRow.style.gap = '4px';
    
    const ratioButtons = [];
    SIZE_RATIO_PRESETS.forEach(preset => {
        const btn = document.createElement('button');
        btn.className = 'wavespeed-ratio-btn';
        btn.dataset.ratio = preset.label;
        btn.innerHTML = `<span class="ratio-icon" style="font-size:10px;opacity:0.7;">${preset.icon}</span><span class="ratio-label" style="font-weight:500;">${preset.label}</span>`;
        btn.title = `${preset.width} × ${preset.height}`;
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.gap = '4px';
        btn.style.padding = '4px 8px';
        btn.style.backgroundColor = preset.label === currentRatio ? '#4a9eff' : '#2a2a2a';
        btn.style.color = preset.label === currentRatio ? 'white' : '#e0e0e0';
        btn.style.border = '1px solid ' + (preset.label === currentRatio ? '#4a9eff' : '#444');
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '11px';
        btn.style.transition = 'all 0.2s ease';
        
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectRatio(preset);
        });
        
        btn.addEventListener('mousedown', (e) => e.stopPropagation());
        
        ratioButtons.push(btn);
        ratioRow.appendChild(btn);
    });
    
    // Width/Height input row
    const inputRow = document.createElement('div');
    inputRow.className = 'wavespeed-size-inputs';
    inputRow.style.display = 'flex';
    inputRow.style.alignItems = 'flex-end';
    inputRow.style.gap = '8px';
    
    // Width
    const widthGroup = document.createElement('div');
    widthGroup.style.display = 'flex';
    widthGroup.style.flexDirection = 'column';
    widthGroup.style.gap = '4px';
    widthGroup.style.flex = '1';
    
    const widthLabel = document.createElement('label');
    widthLabel.textContent = 'Width';
    widthLabel.style.color = '#888';
    widthLabel.style.fontSize = '11px';
    
    const widthInput = document.createElement('input');
    widthInput.type = 'number';
    widthInput.className = 'wavespeed-size-input';
    widthInput.value = currentWidth;
    widthInput.min = minSize;
    widthInput.max = maxSize;
    widthInput.step = 8;
    widthInput.style.width = '100%';
    widthInput.style.padding = '6px 10px';
    widthInput.style.backgroundColor = '#2a2a2a';
    widthInput.style.color = '#e0e0e0';
    widthInput.style.border = '1px solid #444';
    widthInput.style.borderRadius = '4px';
    widthInput.style.fontSize = '13px';
    widthInput.style.fontFamily = 'monospace';
    widthInput.style.textAlign = 'center';
    widthInput.style.boxSizing = 'border-box';
    
    widthGroup.appendChild(widthLabel);
    widthGroup.appendChild(widthInput);
    
    // Swap button
    const swapBtn = document.createElement('button');
    swapBtn.className = 'wavespeed-size-swap';
    swapBtn.innerHTML = '⇄';
    swapBtn.title = 'Swap width and height';
    swapBtn.style.padding = '6px 10px';
    swapBtn.style.backgroundColor = '#2a2a2a';
    swapBtn.style.color = '#e0e0e0';
    swapBtn.style.border = '1px solid #444';
    swapBtn.style.borderRadius = '4px';
    swapBtn.style.cursor = 'pointer';
    swapBtn.style.fontSize = '14px';
    swapBtn.style.transition = 'all 0.2s ease';
    
    swapBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        swapDimensions();
    });
    swapBtn.addEventListener('mousedown', (e) => e.stopPropagation());
    
    // Height
    const heightGroup = document.createElement('div');
    heightGroup.style.display = 'flex';
    heightGroup.style.flexDirection = 'column';
    heightGroup.style.gap = '4px';
    heightGroup.style.flex = '1';
    
    const heightLabel = document.createElement('label');
    heightLabel.textContent = 'Height';
    heightLabel.style.color = '#888';
    heightLabel.style.fontSize = '11px';
    
    const heightInput = document.createElement('input');
    heightInput.type = 'number';
    heightInput.className = 'wavespeed-size-input';
    heightInput.value = currentHeight;
    heightInput.min = minSize;
    heightInput.max = maxSize;
    heightInput.step = 8;
    heightInput.style.width = '100%';
    heightInput.style.padding = '6px 10px';
    heightInput.style.backgroundColor = '#2a2a2a';
    heightInput.style.color = '#e0e0e0';
    heightInput.style.border = '1px solid #444';
    heightInput.style.borderRadius = '4px';
    heightInput.style.fontSize = '13px';
    heightInput.style.fontFamily = 'monospace';
    heightInput.style.textAlign = 'center';
    heightInput.style.boxSizing = 'border-box';
    
    heightGroup.appendChild(heightLabel);
    heightGroup.appendChild(heightInput);
    
    inputRow.appendChild(widthGroup);
    inputRow.appendChild(swapBtn);
    inputRow.appendChild(heightGroup);
    
    // Info row
    const infoRow = document.createElement('div');
    infoRow.className = 'wavespeed-size-info';
    infoRow.style.display = 'flex';
    infoRow.style.justifyContent = 'space-between';
    infoRow.style.alignItems = 'center';
    infoRow.style.fontSize = '11px';
    infoRow.style.color = '#888';
    
    const sizeDisplay = document.createElement('span');
    sizeDisplay.className = 'wavespeed-size-display';
    sizeDisplay.textContent = `${currentWidth} × ${currentHeight} px`;
    sizeDisplay.style.color = '#4a9eff';
    sizeDisplay.style.fontWeight = '500';
    
    const rangeInfo = document.createElement('span');
    rangeInfo.className = 'wavespeed-size-range';
    rangeInfo.textContent = `Range: ${minSize} - ${maxSize}`;
    rangeInfo.style.color = '#666';
    
    infoRow.appendChild(sizeDisplay);
    infoRow.appendChild(rangeInfo);
    
    // Assemble content area
    content.appendChild(ratioRow);
    content.appendChild(inputRow);
    content.appendChild(infoRow);
    
    // Assemble container
    container.appendChild(header);
    container.appendChild(content);
    
    // Event handler functions
    function toggleExpand() {
        isExpanded = !isExpanded;
        content.style.display = isExpanded ? 'flex' : 'none';
        toggleIcon.innerHTML = isExpanded ? '●' : '○';
        header.style.borderRadius = isExpanded ? '4px 4px 0 0' : '4px';
        
        // Force recalculate node size
        // Use requestAnimationFrame to ensure DOM update is complete before calculating
        requestAnimationFrame(() => {
            const newSize = node.computeSize();
            node.setSize(newSize);
            if (node.graph) {
                node.graph.setDirtyCanvas(true, true);
            }
        });
    }
    
    function selectRatio(preset) {
        currentRatio = preset.label;
        currentWidth = preset.width;
        currentHeight = preset.height;
        
        widthInput.value = currentWidth;
        heightInput.value = currentHeight;
        
        // Update button state
        ratioButtons.forEach(btn => {
            const isActive = btn.dataset.ratio === preset.label;
            btn.style.backgroundColor = isActive ? '#4a9eff' : '#2a2a2a';
            btn.style.color = isActive ? 'white' : '#e0e0e0';
            btn.style.borderColor = isActive ? '#4a9eff' : '#444';
        });
        
        updateDisplay();
        notifyChange();
    }
    
    function swapDimensions() {
        const temp = currentWidth;
        currentWidth = currentHeight;
        currentHeight = temp;
        
        widthInput.value = currentWidth;
        heightInput.value = currentHeight;
        
        updateRatioButtons();
        updateDisplay();
        notifyChange();
    }
    
    function onInputChange() {
        currentWidth = parseInt(widthInput.value) || minSize;
        currentHeight = parseInt(heightInput.value) || minSize;
        
        updateRatioButtons();
        updateDisplay();
    }
    
    function validateAndNotify() {
        // Validate range
        currentWidth = Math.max(minSize, Math.min(maxSize, currentWidth));
        currentHeight = Math.max(minSize, Math.min(maxSize, currentHeight));
        
        // Align to multiples of 8
        currentWidth = Math.round(currentWidth / 8) * 8;
        currentHeight = Math.round(currentHeight / 8) * 8;
        
        widthInput.value = currentWidth;
        heightInput.value = currentHeight;
        
        updateDisplay();
        notifyChange();
    }
    
    function updateRatioButtons() {
        const ratio = currentWidth / currentHeight;
        let matchedRatio = null;
        
        for (const preset of SIZE_RATIO_PRESETS) {
            const presetRatio = preset.width / preset.height;
            if (Math.abs(ratio - presetRatio) < 0.01) {
                matchedRatio = preset.label;
                break;
            }
        }
        
        currentRatio = matchedRatio;
        ratioButtons.forEach(btn => {
            const isActive = btn.dataset.ratio === matchedRatio;
            btn.style.backgroundColor = isActive ? '#4a9eff' : '#2a2a2a';
            btn.style.color = isActive ? 'white' : '#e0e0e0';
            btn.style.borderColor = isActive ? '#4a9eff' : '#444';
        });
    }
    
    function updateDisplay() {
        sizeDisplay.textContent = `${currentWidth} × ${currentHeight} px`;
        valuePreview.textContent = `${currentWidth}*${currentHeight}`;
    }
    
    function notifyChange() {
        const value = `${currentWidth}*${currentHeight}`;
        node.wavespeedState.parameterValues[param.name] = value;
        updateRequestJson(node);
    }
    
    // Event listeners
    header.addEventListener('click', toggleExpand);
    header.addEventListener('mousedown', (e) => e.stopPropagation());
    
    widthInput.addEventListener('input', onInputChange);
    heightInput.addEventListener('input', onInputChange);
    widthInput.addEventListener('blur', validateAndNotify);
    heightInput.addEventListener('blur', validateAndNotify);
    widthInput.addEventListener('click', (e) => e.stopPropagation());
    heightInput.addEventListener('click', (e) => e.stopPropagation());
    widthInput.addEventListener('mousedown', (e) => e.stopPropagation());
    heightInput.addEventListener('mousedown', (e) => e.stopPropagation());
    
    // Create widget
    const widget = node.addDOMWidget(param.name, 'div', container);
    widget._wavespeed_dynamic = true;
    widget._wavespeed_param = param.name;
    
    // Custom computeSize method, return correct height based on expanded state
    const originalComputeSize = widget.computeSize ? widget.computeSize.bind(widget) : null;
    widget.computeSize = function() {
        // Collapsed state: only header height (~36px)
        // Expanded state: header + content height (~150px)
        const collapsedHeight = 40;
        const expandedHeight = 160;
        const height = isExpanded ? expandedHeight : collapsedHeight;
        return [node.size[0] - 20, height];
    };
    
    // Define value property
    try {
        Object.defineProperty(widget, 'value', {
            get() {
                return `${currentWidth}*${currentHeight}`;
            },
            set(val) {
                if (!val) return;
                const match = val.match(/(\d+)\s*[*x×]\s*(\d+)/i);
                if (match) {
                    currentWidth = parseInt(match[1]);
                    currentHeight = parseInt(match[2]);
                    widthInput.value = currentWidth;
                    heightInput.value = currentHeight;
                    updateRatioButtons();
                    updateDisplay();
                }
            },
            enumerable: true,
            configurable: true
        });
    } catch (e) {
        console.warn('[WaveSpeed] Could not define value property for size widget:', e.message);
    }
    
    // Initialize parameter value
    node.wavespeedState.parameterValues[param.name] = `${currentWidth}*${currentHeight}`;
    
    return widget;
}

// Check if parameter is a size parameter (only match specific size param names, not resolution)
function isSizeParameter(paramName) {
    const lowerName = paramName.toLowerCase();
    // Only match explicit size parameters, not resolution
    return lowerName === 'size' || 
           lowerName === 'image_size' || 
           lowerName === 'output_size';
    // Removed 'resolution' and endsWith('_size') matching
}

// Check if parameter is a prompt parameter (needs multiline textarea)
function isPromptParameter(paramName) {
    const lowerName = paramName.toLowerCase();
    return lowerName === 'prompt' || 
           lowerName === 'negative_prompt' ||
           lowerName === 'text' ||
           lowerName === 'caption' ||
           lowerName === 'description' ||
           lowerName.includes('prompt') ||
           lowerName.includes('text');
}

// Check if parameter is a seed parameter
function isSeedParameter(paramName) {
    const lowerName = paramName.toLowerCase();
    return lowerName === 'seed' || 
           lowerName === 'random_seed' ||
           lowerName === 'noise_seed';
}

// Seed control modes
const SEED_MODES = {
    FIXED: 'fixed',
    INCREMENT: 'increment',
    DECREMENT: 'decrement',
    RANDOM: 'randomize'
};

// Generate random seed
function generateRandomSeed() {
    // Generate a large random integer (0 to 2^32-1)
    return Math.floor(Math.random() * 4294967295);
}

// Create array title widget (only display title, no input slot)
export function createArrayTitleWidget(node, param) {
    const container = document.createElement('div');
    container.className = 'wavespeed-array-title-widget';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '2px';
    container.style.marginBottom = '2px';
    container.style.paddingTop = '4px';
    
    const titleText = document.createElement('span');
    titleText.textContent = param.parentArrayName || param.displayName;
    titleText.style.color = '#4a9eff';
    titleText.style.fontSize = '12px';
    titleText.style.fontWeight = '600';
    titleText.style.textTransform = 'capitalize';
    container.appendChild(titleText);
    
    // Add required marker
    if (param.parentRequired) {
        const requiredMark = document.createElement('span');
        requiredMark.textContent = '*';
        requiredMark.style.color = '#ff6b6b';
        requiredMark.style.fontSize = '14px';
        requiredMark.style.fontWeight = 'normal';
        requiredMark.style.marginLeft = '1px';
        requiredMark.style.lineHeight = '1';
        container.appendChild(requiredMark);
    }
    
    // Add description tooltip
    if (param.parentDescription) {
        const infoIcon = createInfoTooltip(param.parentDescription);
        container.appendChild(infoIcon);
    }
    
    const widget = node.addDOMWidget(param.name, 'div', container);
    widget._wavespeed_dynamic = true;
    widget._wavespeed_array_title = true;
    
    // Title widget has fixed height
    widget.computeSize = function() {
        return [node.size[0] - 20, 26];
    };
    
    return widget;
}

// Create Seed widget (with fixed/random control)
export function createSeedWidget(node, param) {
    const container = document.createElement('div');
    container.className = 'wavespeed-seed-widget';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '4px';
    container.style.marginBottom = '4px';
    
    // Current value and mode
    let currentValue = param.default !== undefined ? Math.round(param.default) : generateRandomSeed();
    let currentMode = SEED_MODES.FIXED;
    const min = param.min !== undefined ? param.min : 0;
    const max = param.max !== undefined ? param.max : 4294967295;
    
    // Label row
    const labelRow = document.createElement('div');
    labelRow.style.display = 'flex';
    labelRow.style.alignItems = 'center';
    labelRow.style.justifyContent = 'space-between';
    
    const label = createLabelWithRequired(param.displayName || 'Seed', param.required, param.description);
    label.style.color = '#4a9eff';
    label.style.fontSize = '12px';
    label.style.fontWeight = '600';
    
    labelRow.appendChild(label);
    
    // Input row
    const inputRow = document.createElement('div');
    inputRow.style.display = 'flex';
    inputRow.style.alignItems = 'center';
    inputRow.style.gap = '4px';
    
    // Seed input box
    const seedInput = document.createElement('input');
    seedInput.type = 'number';
    seedInput.value = currentValue;
    seedInput.min = min;
    seedInput.max = max;
    seedInput.step = 1;
    seedInput.style.flex = '1';
    seedInput.style.padding = '6px 10px';
    seedInput.style.backgroundColor = '#2a2a2a';
    seedInput.style.color = '#e0e0e0';
    seedInput.style.border = '1px solid #444';
    seedInput.style.borderRadius = '4px';
    seedInput.style.fontSize = '13px';
    seedInput.style.fontFamily = 'monospace';
    seedInput.style.boxSizing = 'border-box';
    
    // Prevent event bubbling
    seedInput.addEventListener('mousedown', (e) => e.stopPropagation());
    seedInput.addEventListener('click', (e) => e.stopPropagation());
    seedInput.addEventListener('wheel', (e) => e.stopPropagation());
    
    // Input event
    seedInput.addEventListener('input', () => {
        let value = parseInt(seedInput.value);
        if (isNaN(value)) value = 0;
        value = Math.max(min, Math.min(max, Math.round(value)));
        currentValue = value;
        node.wavespeedState.parameterValues[param.name] = value;
        updateRequestJson(node);
    });
    
    seedInput.addEventListener('blur', () => {
        seedInput.value = currentValue;
    });
    
    // Mode selection dropdown
    const modeSelect = document.createElement('select');
    modeSelect.style.padding = '6px 8px';
    modeSelect.style.backgroundColor = '#2a2a2a';
    modeSelect.style.color = '#e0e0e0';
    modeSelect.style.border = '1px solid #444';
    modeSelect.style.borderRadius = '4px';
    modeSelect.style.fontSize = '11px';
    modeSelect.style.cursor = 'pointer';
    modeSelect.style.minWidth = '90px';
    
    const modes = [
        { value: SEED_MODES.FIXED, label: '🔒 fixed' },
        { value: SEED_MODES.INCREMENT, label: '📈 increment' },
        { value: SEED_MODES.DECREMENT, label: '📉 decrement' },
        { value: SEED_MODES.RANDOM, label: '🎲 randomize' }
    ];
    
    modes.forEach(mode => {
        const option = document.createElement('option');
        option.value = mode.value;
        option.textContent = mode.label;
        modeSelect.appendChild(option);
    });
    
    modeSelect.value = currentMode;
    
    modeSelect.addEventListener('mousedown', (e) => e.stopPropagation());
    modeSelect.addEventListener('change', () => {
        currentMode = modeSelect.value;
        // If switching to random mode, immediately generate new random seed
        if (currentMode === SEED_MODES.RANDOM) {
            currentValue = generateRandomSeed();
            seedInput.value = currentValue;
            node.wavespeedState.parameterValues[param.name] = currentValue;
            updateRequestJson(node);
        }
    });
    
    // Random button
    const randomBtn = document.createElement('button');
    randomBtn.textContent = '🎲';
    randomBtn.title = 'Generate random seed';
    randomBtn.style.padding = '6px 10px';
    randomBtn.style.backgroundColor = '#4a9eff';
    randomBtn.style.color = 'white';
    randomBtn.style.border = 'none';
    randomBtn.style.borderRadius = '4px';
    randomBtn.style.cursor = 'pointer';
    randomBtn.style.fontSize = '14px';
    randomBtn.style.transition = 'background-color 0.2s ease';
    
    randomBtn.addEventListener('mousedown', (e) => e.stopPropagation());
    randomBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentValue = generateRandomSeed();
        seedInput.value = currentValue;
        node.wavespeedState.parameterValues[param.name] = currentValue;
        updateRequestJson(node);
    });
    
    randomBtn.addEventListener('mouseenter', () => {
        randomBtn.style.backgroundColor = '#3a8eef';
    });
    randomBtn.addEventListener('mouseleave', () => {
        randomBtn.style.backgroundColor = '#4a9eff';
    });
    
    inputRow.appendChild(seedInput);
    inputRow.appendChild(modeSelect);
    inputRow.appendChild(randomBtn);
    
    container.appendChild(labelRow);
    container.appendChild(inputRow);
    
    // Create widget
    const widget = node.addDOMWidget(param.name, 'div', container);
    widget._wavespeed_dynamic = true;
    widget._wavespeed_param = param.name;
    widget._wavespeed_seed = true;
    
    // Save seed control state
    widget._seedMode = currentMode;
    widget._seedInput = seedInput;
    widget._modeSelect = modeSelect;
    
    // Custom computeSize
    widget.computeSize = function() {
        return [node.size[0] - 20, 60];
    };
    
    // Define value property
    try {
        Object.defineProperty(widget, 'value', {
            get() {
                return currentValue;
            },
            set(val) {
                if (val !== undefined && val !== null) {
                    currentValue = Math.round(val);
                    seedInput.value = currentValue;
                }
            },
            enumerable: true,
            configurable: true
        });
    } catch (e) {
        console.warn('[WaveSpeed] Could not define value property for seed widget:', e.message);
    }
    
    // Update seed based on mode before execution
    widget.beforeExecute = function() {
        const mode = modeSelect.value;
        switch (mode) {
            case SEED_MODES.INCREMENT:
                currentValue = Math.min(max, currentValue + 1);
                break;
            case SEED_MODES.DECREMENT:
                currentValue = Math.max(min, currentValue - 1);
                break;
            case SEED_MODES.RANDOM:
                currentValue = generateRandomSeed();
                break;
            case SEED_MODES.FIXED:
            default:
                // Keep unchanged
                break;
        }
        seedInput.value = currentValue;
        node.wavespeedState.parameterValues[param.name] = currentValue;
        updateRequestJson(node);
    };
    
    // Initialize parameter value
    node.wavespeedState.parameterValues[param.name] = currentValue;
    
    // Register to node's beforeExecute callback list
    if (!node._seedWidgets) {
        node._seedWidgets = [];
    }
    node._seedWidgets.push(widget);
    
    return widget;
}

// Create multiline textarea widget
export function createPromptWidget(node, param) {
    const container = document.createElement('div');
    container.className = 'wavespeed-prompt-widget';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '4px';
    container.style.marginBottom = '4px';
    
    // Label (with required marker and description tooltip)
    const label = createLabelWithRequired(param.displayName || param.name, param.required, param.description);
    label.style.color = '#4a9eff';
    label.style.fontSize = '12px';
    label.style.fontWeight = '600';
    
    // Multiline textarea
    const textarea = document.createElement('textarea');
    textarea.value = param.default || '';
    textarea.placeholder = `Enter ${param.displayName || param.name}...`;
    textarea.style.width = '100%';
    textarea.style.minHeight = '80px';
    textarea.style.padding = '8px 10px';
    textarea.style.backgroundColor = '#2a2a2a';
    textarea.style.color = '#e0e0e0';
    textarea.style.border = '1px solid #444';
    textarea.style.borderRadius = '4px';
    textarea.style.resize = 'vertical';
    textarea.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    textarea.style.fontSize = '13px';
    textarea.style.lineHeight = '1.4';
    textarea.style.boxSizing = 'border-box';
    
    // Prevent event bubbling
    textarea.addEventListener('mousedown', (e) => e.stopPropagation());
    textarea.addEventListener('click', (e) => e.stopPropagation());
    textarea.addEventListener('wheel', (e) => e.stopPropagation());
    
    // Input event
    textarea.addEventListener('input', () => {
        node.wavespeedState.parameterValues[param.name] = textarea.value;
        updateRequestJson(node);
    });
    
    container.appendChild(label);
    container.appendChild(textarea);
    
    // Create widget
    const widget = node.addDOMWidget(param.name, 'div', container);
    widget._wavespeed_dynamic = true;
    widget._wavespeed_param = param.name;
    widget.inputEl = textarea;
    
    // Custom computeSize
    widget.computeSize = function() {
        const height = textarea.offsetHeight + 30; // label + padding
        return [node.size[0] - 20, Math.max(height, 110)];
    };
    
    // Define value property
    try {
        Object.defineProperty(widget, 'value', {
            get() {
                return textarea.value;
            },
            set(val) {
                textarea.value = val || '';
            },
            enumerable: true,
            configurable: true
        });
    } catch (e) {
        console.warn('[WaveSpeed] Could not define value property for prompt widget:', e.message);
    }
    
    // Initialize parameter value
    node.wavespeedState.parameterValues[param.name] = textarea.value || param.default || '';
    
    return widget;
}

// Create LoRA scale control
export function createLoraScaleControl(initialScale = 1.0, onChange) {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '8px';
    container.style.flex = '1';

    const label = document.createElement('span');
    label.textContent = 'Scale:';
    label.style.color = '#e0e0e0';
    label.style.fontSize = '11px';
    label.style.whiteSpace = 'nowrap';
    label.style.minWidth = '40px';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '2';
    slider.step = '0.1';
    slider.value = initialScale.toFixed(1);
    slider.style.flex = '1';
    slider.style.minWidth = '80px';
    slider.style.cursor = 'pointer';

    slider.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });
    slider.addEventListener('touchstart', (e) => {
        e.stopPropagation();
    });

    const valueInput = document.createElement('input');
    valueInput.type = 'number';
    valueInput.min = '0';
    valueInput.max = '2';
    valueInput.step = '0.1';
    valueInput.value = initialScale.toFixed(1);
    valueInput.style.width = '45px';
    valueInput.style.padding = '2px 4px';
    valueInput.style.backgroundColor = '#2a2a2a';
    valueInput.style.color = '#e0e0e0';
    valueInput.style.border = '1px solid #444';
    valueInput.style.borderRadius = '3px';
    valueInput.style.fontSize = '11px';
    valueInput.style.textAlign = 'right';
    valueInput.style.fontFamily = 'monospace';

    valueInput.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });
    valueInput.addEventListener('touchstart', (e) => {
        e.stopPropagation();
    });

    const updateValue = (value) => {
        value = parseFloat(value);
        if (isNaN(value)) value = 1.0;
        if (value < 0) value = 0;
        if (value > 2) value = 2;
        value = Math.round(value * 10) / 10;
        slider.value = value;
        valueInput.value = value.toFixed(1);
        if (onChange) onChange(value);
    };

    slider.addEventListener('input', () => {
        updateValue(slider.value);
    });

    valueInput.addEventListener('input', () => {
        let value = parseFloat(valueInput.value);
        if (isNaN(value)) return;
        if (value < 0) {
            valueInput.value = 0;
            value = 0;
        }
        if (value > 2) {
            valueInput.value = 2;
            value = 2;
        }
        slider.value = value;
        if (onChange) onChange(value);
    });

    valueInput.addEventListener('blur', () => {
        updateValue(valueInput.value);
    });

    container.appendChild(label);
    container.appendChild(slider);
    container.appendChild(valueInput);

    return container;
}

// Intercept slider input to prevent node dragging
export function interceptSliderInput(widget, min, max, type, defaultValue) {
    const inputEl = widget.inputEl || widget.element;
    if (!inputEl) return;

    inputEl.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });
    inputEl.addEventListener('touchstart', (e) => {
        e.stopPropagation();
    });

    const numberInput = inputEl.parentElement?.querySelector('input[type="number"]');
    if (!numberInput) return;

    numberInput.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });

    numberInput.addEventListener('input', () => {
        let value = parseFloat(numberInput.value);
        if (isNaN(value)) return;

        if (type === 'INT') {
            value = Math.round(value);
        } else if (type === 'FLOAT') {
            value = Math.round(value * 10) / 10;
        }

        if (value < min) {
            numberInput.value = min;
            value = min;
        }
        if (value > max) {
            numberInput.value = max;
            value = max;
        }

        widget.value = value;
        if (widget.callback) widget.callback(value);
    });

    numberInput.addEventListener('blur', () => {
        let value = parseFloat(numberInput.value);
        if (isNaN(value)) value = defaultValue;

        if (type === 'INT') {
            value = Math.round(value);
        } else if (type === 'FLOAT') {
            value = Math.round(value * 10) / 10;
        }

        if (value < min) value = min;
        if (value > max) value = max;

        numberInput.value = type === 'INT' ? value : value.toFixed(1);
        widget.value = value;
        if (widget.callback) widget.callback(value);
    });
}

// Create media widget UI
export function createMediaWidgetUI(node, param, mediaType, displayName, widgetName) {
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'wavespeed-media-widget';
    widgetContainer.style.display = 'flex';
    widgetContainer.style.flexDirection = 'column'; // Use column layout to support title
    widgetContainer.style.gap = '2px';
    widgetContainer.style.marginBottom = '4px';
    widgetContainer.style.position = 'relative';
    widgetContainer.style.overflow = 'visible';
    
    // If expanded array item, add sub-item styles
    if (param.isExpandedArrayItem) {
        widgetContainer.classList.add('wavespeed-expanded-array-item');
        widgetContainer.style.marginLeft = '12px';
        widgetContainer.style.paddingLeft = '0';
        widgetContainer.style.marginBottom = '2px';
        widgetContainer.style.paddingTop = '0';
        widgetContainer.style.paddingBottom = '0';
    }

    const inputRow = document.createElement('div');
    inputRow.className = 'wavespeed-media-input-row';
    inputRow.style.display = 'flex';
    inputRow.style.alignItems = 'center';
    inputRow.style.gap = '4px';
    inputRow.style.flex = '1';

    // For non-array media parameters, add title row (with required marker and description tooltip)
    if (!param.isExpandedArrayItem) {
        const titleRow = document.createElement('div');
        titleRow.className = 'wavespeed-media-title-row';
        titleRow.style.display = 'flex';
        titleRow.style.alignItems = 'center';
        titleRow.style.marginBottom = '4px';
        
        const titleLabel = createLabelWithRequired(displayName, param.required, param.description);
        titleLabel.style.color = '#4a9eff';
        titleLabel.style.fontSize = '12px';
        titleLabel.style.fontWeight = '600';
        
        titleRow.appendChild(titleLabel);
        widgetContainer.appendChild(titleRow);
    }

    const widgetLabel = document.createElement('label');
    // For array items, show index instead of full name
    if (param.isExpandedArrayItem) {
        widgetLabel.textContent = `[${param.arrayIndex}]`;
        widgetLabel.className = 'wavespeed-array-item-label';
        widgetLabel.style.color = '#888';
        widgetLabel.style.fontSize = '11px';
        widgetLabel.style.minWidth = '24px';
        widgetLabel.style.fontFamily = 'monospace';
    }
    widgetLabel.style.whiteSpace = 'nowrap';

    const textarea = document.createElement('textarea');
    textarea.value = param.default || '';
    textarea.placeholder = param.isExpandedArrayItem ? `Enter ${mediaType}...` : `Enter ${displayName.toLowerCase()}...`;
    textarea.style.flex = '1';
    textarea.style.minHeight = '32px';
    textarea.style.height = '32px';
    textarea.style.maxHeight = '32px';
    textarea.style.padding = '6px 8px';
    textarea.style.backgroundColor = '#2a2a2a';
    textarea.style.color = '#e0e0e0';
    textarea.style.border = '1px solid #444';
    textarea.style.borderRadius = '4px';
    textarea.style.resize = 'none';
    textarea.style.overflow = 'hidden';
    textarea.style.whiteSpace = 'nowrap';
    textarea.style.fontFamily = 'monospace';
    textarea.style.fontSize = '11px';
    textarea.style.lineHeight = '20px';
    textarea.style.boxSizing = 'border-box';
    textarea.rows = 1;

    // Preview container - placed next to input box
    const previewContainer = document.createElement('div');
    previewContainer.className = 'wavespeed-preview-container';
    previewContainer.style.display = 'flex';
    previewContainer.style.alignItems = 'center';
    previewContainer.style.gap = '2px';
    previewContainer.style.minWidth = '0';
    previewContainer.style.flexShrink = '0';

    let currentPreview = null;
    let isUploadedFile = false;

    const clearPreview = () => {
        if (currentPreview) {
            currentPreview.remove();
            currentPreview = null;
        }
        previewContainer.innerHTML = '';
        isUploadedFile = false;
        textarea.disabled = false;
        textarea.style.opacity = '1';
        textarea.style.cursor = 'text';
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.style.opacity = '1';
            uploadBtn.style.cursor = 'pointer';
        }
    };

    const lockTextarea = () => {
        textarea.disabled = true;
        textarea.style.opacity = '0.5';
        textarea.style.cursor = 'not-allowed';
    };

    const lockUploadBtn = () => {
        if (uploadBtn) {
            uploadBtn.disabled = true;
            uploadBtn.style.opacity = '0.5';
            uploadBtn.style.cursor = 'not-allowed';
        }
    };

    let uploadBtn = null;
    if (mediaType !== 'lora') {
        uploadBtn = createUploadButton(async (file) => {
            const loadingPreview = createLoadingPreview(file.name);
            previewContainer.innerHTML = '';
            previewContainer.appendChild(loadingPreview);

            try {
                const result = await uploadToWaveSpeed(file, 'local_file', file.name);
                loadingPreview.remove();

                if (result.success) {
                    isUploadedFile = true;
                    textarea.value = result.url;
                    lockTextarea();

                    node.wavespeedState.parameterValues[param.name] = result.url;
                    updateRequestJson(node);

                    const preview = createFilePreview(result.url, mediaType, () => {
                        textarea.value = '';
                        node.wavespeedState.parameterValues[param.name] = '';
                        updateRequestJson(node);
                        clearPreview();
                    });
                    previewContainer.innerHTML = '';
                    previewContainer.appendChild(preview);
                    currentPreview = preview;
                } else {
                    const errorPreview = createErrorPreview(result.error);
                    previewContainer.innerHTML = '';
                    previewContainer.appendChild(errorPreview);
                    setTimeout(() => {
                        errorPreview.remove();
                        clearPreview();
                    }, 3000);
                }
            } catch (error) {
                loadingPreview.remove();
                const errorPreview = createErrorPreview(error.message);
                previewContainer.innerHTML = '';
                previewContainer.appendChild(errorPreview);
                setTimeout(() => {
                    errorPreview.remove();
                    clearPreview();
                }, 3000);
            }
        }, mediaType);
    } else {
        const scaleControl = createLoraScaleControl(1.0, (scale) => {
            textarea.dataset.loraScale = scale;
        });
        inputRow.appendChild(widgetLabel);
        inputRow.appendChild(textarea);
        inputRow.appendChild(scaleControl);
    }

    if (mediaType !== 'lora') {
        // Only add label to inputRow for array items
        if (param.isExpandedArrayItem) {
            inputRow.appendChild(widgetLabel);
        }
        inputRow.appendChild(textarea);
        inputRow.appendChild(previewContainer); // Preview placed next to input box
        if (uploadBtn) {
            inputRow.appendChild(uploadBtn);
        }
    }

    widgetContainer.appendChild(inputRow);

    const handleUrlInput = () => {
        if (isUploadedFile) return;

        const urlValue = textarea.value.trim();
        if (currentPreview) {
            currentPreview.remove();
            currentPreview = null;
        }

        if (!urlValue) {
            previewContainer.innerHTML = '';
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.style.opacity = '1';
                uploadBtn.style.cursor = 'pointer';
            }
            node.wavespeedState.parameterValues[param.name] = '';
            updateRequestJson(node);
            return;
        }

        lockUploadBtn();
        node.wavespeedState.parameterValues[param.name] = urlValue;
        updateRequestJson(node);

        const preview = createFilePreview(urlValue, mediaType, () => {
            textarea.value = '';
            node.wavespeedState.parameterValues[param.name] = '';
            updateRequestJson(node);
            clearPreview();
        });
        previewContainer.innerHTML = '';
        previewContainer.appendChild(preview);
        currentPreview = preview;
    };

    textarea.addEventListener('input', handleUrlInput);

    const widget = node.addDOMWidget(widgetName, 'div', widgetContainer);
    widget.inputEl = textarea;
    widget.uploadBtn = uploadBtn;
    widget.previewContainer = previewContainer;
    widget._wavespeed_param = param.name;
    widget._wavespeed_dynamic = true;
    
    // Set computeSize - height needs to match actual DOM height for correct slot positioning
    widget.computeSize = function() {
        let height;
        if (param.isExpandedArrayItem) {
            // Array items uniform height to avoid slot position confusion
            height = 44;
        } else {
            // Non-array media parameters
            height = 64;
        }
        return [node.size[0] - 20, height];
    };

    try {
        Object.defineProperty(widget, 'value', {
            get() {
                return textarea.value;
            },
            set(val) {
                textarea.value = val || '';
                textarea.dispatchEvent(new Event('input'));
            },
            enumerable: true,
            configurable: true
        });
    } catch (e) {
        console.warn('[WaveSpeed] Could not define value property, using direct assignment:', e.message);
        widget.value = param.default || '';
    }

    node.wavespeedState.parameterValues[param.name] = textarea.value || param.default || '';

    widget.restoreValue = function(newValue) {
        if (typeof newValue === 'string') {
            textarea.value = newValue;
            node.wavespeedState.parameterValues[param.name] = newValue;
            textarea.dispatchEvent(new Event('input'));
        }
    };

    return { widget, textarea };
}

// Create parameter widget
export function createParameterWidget(node, param) {
    const paramName = param.name;
    
    // Check if array title (no input slot, only display title)
    if (param.type === 'ARRAY_TITLE' || param.isArrayTitle) {
        return createArrayTitleWidget(node, param);
    }
    
    // Check if size parameter
    if (isSizeParameter(paramName)) {
        return createSizeWidget(node, param);
    }
    
    // Check if parameter is a prompt parameter (needs multiline textarea)
    if (isPromptParameter(paramName) && param.type === "STRING") {
        return createPromptWidget(node, param);
    }
    
    // Prioritize mediaType already set in parameter object (for expanded array items)
    // Otherwise determine by parameter name
    const mediaType = param.mediaType || getMediaType(paramName, getOriginalApiType(param));
    const isMediaParam = mediaType !== 'file';

    let widget = null;
    const widgetName = paramName;

    // Check if parameter is a seed parameter
    const isSeedParam = isSeedParameter(paramName);

    if (isMediaParam) {
        // Media parameters use DOM widget
        const { widget: mediaWidget } = createMediaWidgetUI(node, param, mediaType, param.displayName, widgetName);
        widget = mediaWidget;
    } else if (isSeedParam && param.type === "INT") {
        // Seed parameters use special seed widget with fixed/random control
        widget = createSeedWidget(node, param);
    } else if (param.type === "COMBO") {
        widget = node.addWidget("combo", widgetName, param.default || param.options[0],
            (value) => {
                node.wavespeedState.parameterValues[param.name] = value;
                updateRequestJson(node);
            },
            { values: param.options || [] }
        );
    } else if (param.type === "INT") {
        const defaultValue = param.default !== undefined ? Math.round(param.default) : 0;
        const min = param.min !== undefined ? param.min : 0;
        const max = param.max !== undefined ? param.max : 999999999;
        const useSlider = param.uiComponent === 'slider';

        widget = node.addWidget(useSlider ? "slider" : "number", widgetName, defaultValue,
            (value) => {
                value = typeof value === 'string' ? parseInt(value) : Math.round(value);
                if (isNaN(value)) value = defaultValue;
                value = Math.max(min, Math.min(max, Math.round(value)));
                node.wavespeedState.parameterValues[param.name] = value;
                updateRequestJson(node);
            },
            { min: min, max: max, step: 1, precision: 0 }
        );

        if (useSlider) {
            interceptSliderInput(widget, min, max, 'INT', defaultValue);
        }
    } else if (param.type === "FLOAT") {
        const defaultValue = param.default !== undefined ? param.default : 0.0;
        const min = param.min !== undefined ? param.min : 0.0;
        const max = param.max !== undefined ? param.max : 10.0;
        const step = param.step !== undefined ? param.step : 0.1;
        const useSlider = param.uiComponent === 'slider';

        widget = node.addWidget(useSlider ? "slider" : "number", widgetName, defaultValue,
            (value) => {
                value = typeof value === 'string' ? parseFloat(value) : value;
                if (isNaN(value)) value = defaultValue;
                value = Math.max(min, Math.min(max, Math.round(value * 10) / 10));
                node.wavespeedState.parameterValues[param.name] = value;
                updateRequestJson(node);
            },
            { min: min, max: max, step: step }
        );

        if (useSlider) {
            interceptSliderInput(widget, min, max, 'FLOAT', defaultValue);
        }
    } else if (param.type === "BOOLEAN") {
        widget = node.addWidget("toggle", widgetName, param.default || false,
            (value) => {
                node.wavespeedState.parameterValues[param.name] = value;
                updateRequestJson(node);
            },
            {}
        );
    } else {
        widget = node.addWidget("text", widgetName, param.default || "",
            (value) => {
                node.wavespeedState.parameterValues[param.name] = value;
                updateRequestJson(node);
            },
            {}
        );
    }

    if (widget) {
        widget._wavespeed_dynamic = true;
        widget._wavespeed_param = param.name;
        
        // Initialize parameter value
        node.wavespeedState.parameterValues[param.name] = widget.value !== undefined ? widget.value : (param.default || "");
    }

    return widget;
}

// Update hidden widget value
export function updateHiddenWidget(node, name, value) {
    if (name === 'model_id' && node.modelIdWidget) {
        node.modelIdWidget.value = value;
    } else if (name === 'request_json' && node.requestJsonWidget) {
        node.requestJsonWidget.value = value;
    } else if (name === 'param_map' && node.paramMapWidget) {
        node.paramMapWidget.value = value;
    }
}

// Update request JSON
export function updateRequestJson(node) {
    const values = {};
    const parameters = node.wavespeedState.parameters || [];

    for (const param of parameters) {
        const paramName = param.name;
        
        // Skip array parameters
        if (param.isArray) {
            continue;
        }

        // Check if there is a connection
        const inputSlot = node.inputs?.find(inp => inp.name === paramName);
        const hasConnection = inputSlot && inputSlot.link != null;
        const mediaType = getMediaType(paramName, getOriginalApiType(param));
        const isMediaParam = mediaType !== 'file';

        if (hasConnection && isMediaParam) {
            continue;
        } else {
            if (node.wavespeedState.parameterValues[paramName] !== undefined) {
                values[paramName] = node.wavespeedState.parameterValues[paramName];
            }
        }
    }

    // Type conversion
    for (const paramName in values) {
        let value = values[paramName];
        const param = node.wavespeedState.parameters.find(p => p.name === paramName);
        if (param) {
            if (param.type === "INT" || param.type === "FLOAT") {
                value = typeof value === 'string' ? parseFloat(value) : value;
                if (isNaN(value)) value = 0;
            } else if (param.type === "BOOLEAN") {
                value = Boolean(value);
            }
            values[paramName] = value;
        }
    }

    const jsonString = JSON.stringify(values);
    updateHiddenWidget(node, 'request_json', jsonString);

    // Update parameter mapping
    const paramTypeMap = {};
    for (const param of parameters) {
        let backendType = "string";
        if (param.type === "INT" || param.type === "FLOAT") {
            backendType = "number";
        } else if (param.type === "BOOLEAN") {
            backendType = "boolean";
        } else if (param.type === "COMBO") {
            backendType = "string";
        }

        const paramInfo = { type: backendType };

        if (param.type === "COMBO" && param.options && Array.isArray(param.options)) {
            paramInfo.options = param.options;
        }

        if (param.isArray) {
            paramInfo.isArray = true;
            paramInfo.itemType = backendType;
        }

        paramTypeMap[param.name] = paramInfo;
    }
    
    const paramMapString = JSON.stringify(paramTypeMap);
    updateHiddenWidget(node, 'param_map', paramMapString);
}