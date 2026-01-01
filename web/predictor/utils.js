/**
 * WaveSpeed Predictor - Common utility functions module
 */

// Check if there are dynamic connections (inline implementation to avoid circular dependency)
function hasDynamicConnections(node) {
    if (!node.inputs) return false;

    for (let i = 0; i < node.inputs.length; i++) {
        const input = node.inputs[i];
        if (input.name !== 'Client' && input.link != null) {
            return true;
        }
    }
    return false;
}

// Get list of connected input names (inline implementation)
function getConnectedInputNames(node) {
    if (!node.inputs) return [];

    const connected = [];
    for (let i = 0; i < node.inputs.length; i++) {
        const input = node.inputs[i];
        if (input.name !== 'Client' && input.link != null) {
            connected.push(input.name);
        }
    }
    return connected;
}

// Clear dynamic widgets and inputs
export function clearDynamicWidgets(node) {
    if (node.widgets) {
        // Keep base widgets: Category, Model, hidden widgets and non-dynamic widgets
        node.widgets = node.widgets.filter(w =>
            w._wavespeed_base ||
            w._wavespeed_hidden ||
            w.name === 'Category' ||
            w.name === 'Model' ||
            w.name === 'model_id' ||
            w.name === 'request_json' ||
            w.name === 'param_map' ||
            (!w._wavespeed_dynamic && !w.options?._wavespeed_array_controller && !w.options?._wavespeed_array_slot)
        );
    }

    // Clear array related data
    if (node._arrayInputCounts) {
        // Remove all array inputs
        for (const paramName in node._arrayInputCounts) {
            const count = node._arrayInputCounts[paramName];
            const singularName = paramName.endsWith('s') ? paramName.slice(0, -1) : paramName;

            // Remove inputs from back to front
            for (let i = count; i >= 1; i--) {
                const slotName = `${singularName}_${i}`;
                const inputIndex = node.findInputSlot(slotName);
                if (inputIndex !== -1) {
                    node.removeInput(inputIndex);
                }
            }
        }
        node._arrayInputCounts = {};
    }

    if (node.wavespeedState.arraySlotValues) {
        node.wavespeedState.arraySlotValues = {};
    }

    node.wavespeedState.parameters = [];
    node.wavespeedState.parameterValues = {};
}

// Filter models by category
export async function filterModels(node) {
    const currentCategory = node.wavespeedState.currentCategory || 'all';
    const allModels = node.wavespeedState.allModels || [];

    let filteredModels = allModels;

    // Filter by category
    if (currentCategory !== 'all') {
        filteredModels = filteredModels.filter(m => m.categoryValue === currentCategory);
    }

    // Update model list
    node.wavespeedState.modelList = filteredModels;

    // Update FuzzyModelSelector
    if (node._fuzzyModelSelector) {
        if (filteredModels.length > 0) {
            // Prepare model data for fuzzy search
            const models = filteredModels.map(m => ({
                modelId: m.value || m.modelId,
                displayName: currentCategory === 'all' ? `${m.categoryName} > ${m.name}` : m.name,
                categoryName: m.categoryName,
                name: m.name,
                originalModel: m
            }));
            
            node._fuzzyModelSelector.updateModels(models);
            // Don't auto-select first model, keep empty state
            node._fuzzyModelSelector.setValue("Select a model...");
        } else {
            node._fuzzyModelSelector.updateModels([]);
            node._fuzzyModelSelector.setValue("No models found");
            clearDynamicWidgets(node);
        }
    }
    // Compatible with old combo widget (if exists)
    else if (node.modelWidget) {
        if (filteredModels.length > 0) {
            // Display "category > model name" format
            const newValues = filteredModels.map(m =>
                currentCategory === 'all' ? `${m.categoryName} > ${m.name}` : m.name
            );
            node.modelWidget.options.values = newValues;
            node.modelWidget.value = newValues[0];

            // Skip callback if restoring from workflow
            const isRestoringWorkflow = node._wavespeed_savedData !== undefined;
            if (!isRestoringWorkflow && node.modelWidget.callback) {
                node.modelWidget.callback(newValues[0]);
            }
        } else {
            node.modelWidget.options.values = ["No models found"];
            node.modelWidget.value = "No models found";
            clearDynamicWidgets(node);
        }
    }

    node.setSize(node.computeSize());
    if (node.graph) {
        node.graph.setDirtyCanvas(true, true);
    }
}

// Update model widget visual state
export function updateModelWidgetState(node) {
    if (!node.modelWidget) return;

    const hasConnections = hasDynamicConnections(node);
    const connectedInputs = getConnectedInputNames(node);
    const inputsList = connectedInputs.join(', ');

    if (hasConnections) {
        const shortList = connectedInputs.slice(0, 2).join(', ');
        const more = connectedInputs.length > 2 ? `, +${connectedInputs.length - 2} more` : '';

        // Visual feedback
        node.modelWidget.label = `Model (🔒 ${shortList}${more})`;

        if (node.modelWidget.inputEl) {
            node.modelWidget.inputEl.title = `Cannot switch model while parameters are connected.\nDisconnect these first: ${inputsList}`;
            node.modelWidget.inputEl.style.opacity = '0.7';
        }
    } else {
        // Restore normal appearance
        node.modelWidget.label = 'Model';

        if (node.modelWidget.inputEl) {
            node.modelWidget.inputEl.title = '';
            node.modelWidget.inputEl.style.opacity = '1';
        }
    }
}

// Update category tabs
export async function updateCategoryTabs(node) {
    // This function is called on refresh to re-render tabs
    // Simplified implementation: trigger "All" tab click to re-filter
    node.wavespeedState.currentCategory = 'all';
    await filterModels(node);
}

// Delay execution function
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Debounce function
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function
export function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Deep clone object
export function deepClone(obj) {
    if (obj === null || typeof obj !== "object") {
        return obj;
    }
    
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
        return obj.map(item => deepClone(item));
    }
    
    if (typeof obj === "object") {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

// Generate unique ID
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Format file size
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Validate URL
export function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Get file extension
export function getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
}

// Capitalize first letter
export function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Camel case to snake case
export function camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Snake case to camel case
export function snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}