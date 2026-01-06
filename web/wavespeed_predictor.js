/**
 * WaveSpeed AI Predictor Node - Modular refactored version
 * 
 * Uses modular function organization, maintaining simplicity of direct node operations
 * Removes MVC architecture complexity, provides better code organization and maintainability
 */

import { app } from "../../../scripts/app.js";
import { FuzzyModelSelector } from "./predictor/FuzzyModelSelector.js";
import { updateRequestJson } from "./predictor/widgets.js";

// Register extension
app.registerExtension({
    name: "WaveSpeedAIPredictor",

    // Modify before node definition registration to prevent ComfyUI from auto-creating input slots
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "WaveSpeedAIPredictor") {
            return;
        }
        
        console.log('[WaveSpeed Predictor] beforeRegisterNodeDef - modifying node definition');
        
        // Save original onNodeCreated
        const originalOnNodeCreated = nodeType.prototype.onNodeCreated;
        
        nodeType.prototype.onNodeCreated = function() {
            // Call original method
            if (originalOnNodeCreated) {
                originalOnNodeCreated.apply(this, arguments);
            }
            
            // Check if restoring from workflow
            const isRestoring = !!this._wavespeed_savedData;
            
            // Only clear auto-created input slots in non-restore scenarios
            if (!isRestoring && this.inputs && this.inputs.length > 0) {
                console.log('[WaveSpeed Predictor] onNodeCreated - clearing auto-created inputs:', this.inputs.map(i => i.name));
                this.inputs = [];
            }
        };
    },

    async nodeCreated(node) {
        if (node.comfyClass !== "WaveSpeedAIPredictor") {
            return;
        }

        console.log('[WaveSpeed Predictor] Creating node with modular architecture');

        // Check if restoring from workflow (if _wavespeed_savedData exists, it's a restore scenario)
        const isRestoring = !!node._wavespeed_savedData;
        
        // Only clear input slots in non-restore scenarios
        // In restore scenario, input slots are already created in configure and need to be kept to restore connections
        if (!isRestoring && node.inputs && node.inputs.length > 0) {
            console.log('[WaveSpeed Predictor] Clearing auto-created inputs:', node.inputs.map(i => i.name));
            node.inputs = [];
        } else if (isRestoring) {
            console.log('[WaveSpeed Predictor] Restoring mode - keeping pre-created inputs:', node.inputs?.length || 0);
        }

        // Override computeSize method
        node.computeSize = function() {
            const visibleInputs = this.inputs?.filter(inp => !inp.hidden) || [];
            const visibleOutputs = this.outputs?.filter(out => !out.hidden) || [];

            const inputHeight = visibleInputs.length * LiteGraph.NODE_SLOT_HEIGHT;
            const outputHeight = visibleOutputs.length * LiteGraph.NODE_SLOT_HEIGHT;
            
            // Skip hidden widgets and base widget when calculating widget height
            // Only count widgets that have associated inputs (for correct input slot positioning)
            const widgetHeight = this.widgets?.reduce((h, w) => {
                // Skip hidden widgets
                if (w.type === "hidden" || w._wavespeed_hidden) {
                    return h;
                }
                // Skip base widget (wavespeed_main) - it doesn't have an input slot
                if (w._wavespeed_base) {
                    return h;
                }
                const wh = w.computeSize ? w.computeSize()[1] : LiteGraph.NODE_WIDGET_HEIGHT;
                return h + wh;
            }, 0) || 0;

            // Add base widget height separately (it's displayed but doesn't affect input positions)
            const baseWidgetHeight = this.widgets?.find(w => w._wavespeed_base)?.computeSize?.()?.[1] || 0;

            const maxSlotHeight = Math.max(inputHeight, outputHeight);
            // Use sum of widgets height (excluding base) + base widget height + input slot height
            const totalHeight = widgetHeight + baseWidgetHeight + Math.max(maxSlotHeight, 0) + 30;

            const width = 800;
            const clampedHeight = Math.max(500, Math.min(totalHeight, 1200));

            return [width, clampedHeight];
        };

        // Override widget's getY method to ensure input slots align correctly
        // ComfyUI calculates input positions by iterating through widgets and summing heights
        // We need to ensure only widgets with inputs are counted in position calculation
        const originalGetY = node.getY;
        if (typeof originalGetY === 'function') {
            // Store original for potential use
            node._originalGetY = originalGetY;
        }
        
        // Override onDrawBackground to apply label offset for input slot positioning
        // For widgets with vertical layout (label above input), we offset the input slot
        // to align with the actual input element rather than the widget top
        const originalOnDrawBackground = node.onDrawBackground;
        node.onDrawBackground = function(ctx) {
            if (originalOnDrawBackground) {
                originalOnDrawBackground.call(this, ctx);
            }

            // Apply label offset to input slot positions
            if (this.inputs && this.widgets) {
                for (const input of this.inputs) {
                    if (input.widget && input._wavespeed_label_offset) {
                        // Get widget's current Y position (calculated by LiteGraph)
                        const widgetY = input.widget.y || 0;
                        const offsetY = widgetY + input._wavespeed_label_offset;

                        // Set input slot position
                        if (!input.pos || !Array.isArray(input.pos)) {
                            input.pos = [0, 0];
                        }
                        input.pos[1] = offsetY;
                    }
                }
            }
        };

        // Force initial size
        node.size = [800, 500];

        // Initialize node state
        node.wavespeedState = {
            modelId: "",
            apiPath: "",
            category: "",
            categoryList: [],
            modelList: [],
            parameters: [],
            parameterValues: {},
            isUpdatingCategory: false,
            isUpdatingModel: false,
            lastCategoryValue: "",
            lastModelValue: "",
            requestSequence: 0
        };

        // Array input management
        node._arrayInputCounts = {};

        // Delayed initialization - wait for ComfyUI to complete auto widget creation
        setTimeout(() => {
            initializePredictorWidgets(node);
        }, 200);

        // Configure workflow save/restore support
        configureWorkflowSupport(node);

        console.log('[WaveSpeed Predictor] Node creation completed');
    }
});

// Initialize Predictor widgets
async function initializePredictorWidgets(node) {
    console.log('[WaveSpeed Predictor] initializePredictorWidgets started for node:', node.id);

    try {
        // Key step: first clear ComfyUI auto-created widgets (from Python backend hidden parameters)
        console.log('[WaveSpeed Predictor] Current widgets before cleanup:', node.widgets?.map(w => w.name));
        
        // Clear all existing widgets
        node.widgets = [];
        
        // Clear ComfyUI auto-created hidden parameter input slots
        const hiddenParamNames = ['model_id', 'request_json', 'param_map'];
        if (node.inputs) {
            for (let i = node.inputs.length - 1; i >= 0; i--) {
                const input = node.inputs[i];
                if (hiddenParamNames.includes(input.name)) {
                    console.log('[WaveSpeed Predictor] Removing hidden input slot:', input.name);
                    node.removeInput(i);
                }
            }
        }
        
        console.log('[WaveSpeed Predictor] Widgets and hidden inputs cleared');

        // CRITICAL: Also clear any auto-created input slots from ComfyUI
        // This fixes the issue where inputs appear on top after refresh
        // Keep only inputs that are explicitly marked as _wavespeed_dynamic (from configure restore)
        if (node.inputs && node.inputs.length > 0) {
            // Filter to keep only dynamic inputs (created in configure for workflow restore)
            const dynamicInputs = node.inputs.filter(inp => inp._wavespeed_dynamic);

            // If we have dynamic inputs, we're in restore mode - keep them
            // Otherwise, clear all inputs (this handles the fresh load case)
            if (dynamicInputs.length === 0) {
                console.log('[WaveSpeed Predictor] Clearing all auto-created inputs:', node.inputs.map(i => i.name));
                node.inputs = [];
            } else {
                // In restore mode, only keep dynamic inputs
                console.log('[WaveSpeed Predictor] Keeping dynamic inputs for restore:', dynamicInputs.map(i => i.name));
                node.inputs = dynamicInputs;
            }
        }

        // Dynamically import API module
        let apiModule;
        try {
            apiModule = await import('./predictor/api.js');
            console.log('[WaveSpeed Predictor] API module imported');
        } catch (e) {
            console.error('[WaveSpeed Predictor] Failed to import API module:', e);
            return;
        }

        // Dynamically import utils module
        let utilsModule;
        try {
            utilsModule = await import('./predictor/utils.js');
            console.log('[WaveSpeed Predictor] Utils module imported');
        } catch (e) {
            console.error('[WaveSpeed Predictor] Failed to import utils module:', e);
            return;
        }

        // Create basic UI
        await createBasicUI(node, apiModule, utilsModule);

        console.log('[WaveSpeed Predictor] initializePredictorWidgets finished.');
        
    } catch (error) {
        console.error('[WaveSpeed Predictor] Error in initializePredictorWidgets:', error);
    }
}

// Create basic UI
async function createBasicUI(node, apiModule, utilsModule) {
    try {
        console.log('[WaveSpeed Predictor] Creating basic UI...');

        // Preload model data
        const preloadContainer = document.createElement('div');
        preloadContainer.textContent = '⏳ Loading models...';
        preloadContainer.style.padding = '10px';
        preloadContainer.style.color = '#4a9eff';
        preloadContainer.style.textAlign = 'center';

        node.addDOMWidget('preload_indicator', 'div', preloadContainer, { serialize: false });

        try {
            const preloadData = await apiModule.preloadAllModels((progress) => {
                if (progress.step === 'categories') {
                    preloadContainer.textContent = `⏳ Loaded ${progress.current} categories...`;
                } else if (progress.step === 'models') {
                    preloadContainer.textContent = `⏳ Loaded ${progress.total} models...`;
                }
            });

            if (preloadData) {
                node.wavespeedState.categoryList = preloadData.categories;
                node.wavespeedState.allModels = preloadData.flatModels;
                node.wavespeedState.modelsByCategory = preloadData.modelsByCategory;

                // Critical log: Show all categories and their model counts
                console.log('[WaveSpeed] === Models Loaded ===');
                console.log(`[WaveSpeed] Total: ${preloadData.flatModels.length} models, ${preloadData.categories.length} categories`);
                preloadData.categories.forEach((cat, idx) => {
                    const models = preloadData.modelsByCategory[idx] || [];
                    console.log(`[WaveSpeed] ${cat.name} (${cat.value}): ${models.length} models`);
                    if (models.length > 0) {
                        const samples = models.slice(0, 3).map(m => m.name || m.value).join(', ');
                        console.log(`[WaveSpeed]   Examples: ${samples}${models.length > 3 ? '...' : ''}`);
                    }
                });
                console.log('[WaveSpeed] ====================');
            }
        } catch (error) {
            console.error('[WaveSpeed Predictor] Preload failed:', error);
            preloadContainer.textContent = '❌ Failed to load models';
        }

        // Remove loading indicator
        if (node.widgets) {
            const tempIdx = node.widgets.findIndex(w => w.name === 'preload_indicator');
            if (tempIdx > -1) {
                node.widgets.splice(tempIdx, 1);
            }
        }
        if (preloadContainer.parentNode) {
            preloadContainer.parentNode.removeChild(preloadContainer);
        }

        // Create main container - contains all UI elements
        const mainContainer = document.createElement('div');
        mainContainer.className = 'wavespeed-main-container';
        mainContainer.style.display = 'flex';
        mainContainer.style.flexDirection = 'column';
        mainContainer.style.gap = '6px';
        mainContainer.style.padding = '6px';

        // 1. Header: title + refresh button
        const header = document.createElement('div');
        header.className = 'wavespeed-header';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.padding = '4px 6px';
        header.style.backgroundColor = '#1a1a1a';
        header.style.borderRadius = '4px';
        header.style.border = '1px solid #333';

        const title = document.createElement('span');
        title.className = 'wavespeed-title';
        title.textContent = 'WaveSpeed AI Models';
        title.style.color = '#4a9eff';
        title.style.fontSize = '12px';
        title.style.fontWeight = '600';

        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'wavespeed-refresh-btn';
        refreshBtn.innerHTML = '🔄';
        refreshBtn.title = 'Refresh models';
        refreshBtn.style.padding = '2px 6px';
        refreshBtn.style.backgroundColor = 'transparent';
        refreshBtn.style.color = '#888';
        refreshBtn.style.border = 'none';
        refreshBtn.style.borderRadius = '3px';
        refreshBtn.style.cursor = 'pointer';
        refreshBtn.style.fontSize = '12px';

        refreshBtn.onclick = async () => {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '⏳';
            
            try {
                const newData = await apiModule.refreshAllModels();
                if (newData) {
                    node.wavespeedState.categoryList = newData.categories;
                    node.wavespeedState.allModels = newData.flatModels;
                    node.wavespeedState.modelsByCategory = newData.modelsByCategory;
                    // Update category tabs
                    updateCategoryTabsUI(node, utilsModule);
                    // Update model list
                    await utilsModule.filterModels(node);
                }
                refreshBtn.innerHTML = '✓';
            } catch (error) {
                console.error('[WaveSpeed Predictor] Refresh failed:', error);
                refreshBtn.innerHTML = '❌';
            }

            setTimeout(() => {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '🔄';
            }, 2000);
        };

        header.appendChild(title);
        header.appendChild(refreshBtn);
        mainContainer.appendChild(header);

        // 2. Category tabs
        const categoryTabsContainer = document.createElement('div');
        categoryTabsContainer.className = 'wavespeed-tabs-container';
        categoryTabsContainer.style.margin = '4px 0';
        categoryTabsContainer.style.padding = '4px 0';

        const tabsWrapper = document.createElement('div');
        tabsWrapper.className = 'wavespeed-tabs-wrapper';
        tabsWrapper.style.display = 'flex';
        tabsWrapper.style.flexWrap = 'wrap';
        tabsWrapper.style.gap = '4px';
        tabsWrapper.style.justifyContent = 'flex-start';

        // Add "All" tab
        const allTab = createCategoryTabButton('All', 'all', true, node, utilsModule, tabsWrapper);
        tabsWrapper.appendChild(allTab);

        // Add category tabs
        if (node.wavespeedState.categoryList && node.wavespeedState.categoryList.length > 0) {
            for (const category of node.wavespeedState.categoryList) {
                const tab = createCategoryTabButton(category.name, category.value, false, node, utilsModule, tabsWrapper);
                tabsWrapper.appendChild(tab);
            }
        }

        categoryTabsContainer.appendChild(tabsWrapper);
        mainContainer.appendChild(categoryTabsContainer);
        
        // Save reference for later updates
        node._categoryTabsWrapper = tabsWrapper;

        // 3. Model selector - use FuzzyModelSelector
        const modelSelectorContainer = document.createElement('div');
        modelSelectorContainer.className = 'wavespeed-model-selector';
        modelSelectorContainer.style.margin = '2px 0';

        // Create FuzzyModelSelector instance
        const fuzzySelector = new FuzzyModelSelector(async (selectedModelDisplay) => {
            console.log('[WaveSpeed Predictor] Model selected via FuzzySelector:', selectedModelDisplay);
            if (selectedModelDisplay && selectedModelDisplay !== "Select a model...") {
                // Show loading overlay
                utilsModule.showLoadingOverlay(node);

                try {
                    await loadModelParameters(node, selectedModelDisplay, apiModule);
                } finally {
                    // Hide loading overlay
                    utilsModule.hideLoadingOverlay(node);
                }
            }
        });

        const selectorElement = fuzzySelector.create();
        modelSelectorContainer.appendChild(selectorElement);
        mainContainer.appendChild(modelSelectorContainer);

        // Save FuzzyModelSelector reference
        node._fuzzyModelSelector = fuzzySelector;

        // Add main container as single DOM widget (serialize: false to prevent ComfyUI auto-serialization)
        const mainWidget = node.addDOMWidget('wavespeed_main', 'div', mainContainer, { serialize: false });

        // CRITICAL FIX: Set all flags explicitly
        mainWidget._wavespeed_base = true;
        mainWidget._wavespeed_no_input = true;  // Base widget has no input slot
        mainWidget._wavespeed_dynamic = false;  // Base widget is not dynamic
        mainWidget._wavespeed_hidden = false;   // Not hidden (just type='hidden' for positioning)

        // CRITICAL FIX: Set type to 'hidden' to prevent LiteGraph from including it in input position calculation
        // The base widget is a UI container that should not participate in input slot positioning
        // Setting type='hidden' makes LiteGraph skip it when calculating input positions,
        // while the DOM element still renders normally because DOM widgets render independently
        mainWidget.type = 'hidden';

        node._mainContainer = mainContainer;

        // Custom computeSize method
        // Use fixed height: header(40) + tabs(3 rows ~100) + selector(45) + padding(15) = 200
        mainWidget.computeSize = function() {
            return [node.size[0] - 20, 200];
        };

        // Create hidden widgets (for backend communication)
        // Use same pattern as wavespeed_generate_node.js
        const modelIdWidget = node.addWidget("text", "model_id", "", () => {}, {});
        modelIdWidget.type = "hidden";
        modelIdWidget._wavespeed_hidden = true;
        modelIdWidget.computeSize = () => [0, 0];
        modelIdWidget.draw = () => {}; // Do not draw
        // Ensure widget type is correctly set
        const modelIdIdx = node.widgets.indexOf(modelIdWidget);
        if (modelIdIdx >= 0) {
            node.widgets[modelIdIdx].type = "hidden";
        }
        
        const requestJsonWidget = node.addWidget("text", "request_json", "{}", () => {}, {});
        requestJsonWidget.type = "hidden";
        requestJsonWidget._wavespeed_hidden = true;
        requestJsonWidget.computeSize = () => [0, 0];
        requestJsonWidget.draw = () => {}; // Do not draw
        const requestJsonIdx = node.widgets.indexOf(requestJsonWidget);
        if (requestJsonIdx >= 0) {
            node.widgets[requestJsonIdx].type = "hidden";
        }

        const paramMapWidget = node.addWidget("text", "param_map", "{}", () => {}, {});
        paramMapWidget.type = "hidden";
        paramMapWidget._wavespeed_hidden = true;
        paramMapWidget.computeSize = () => [0, 0];
        paramMapWidget.draw = () => {}; // Do not draw
        const paramMapIdx = node.widgets.indexOf(paramMapWidget);
        if (paramMapIdx >= 0) {
            node.widgets[paramMapIdx].type = "hidden";
        }
        
        // Store references
        node.modelIdWidget = modelIdWidget;
        node.requestJsonWidget = requestJsonWidget;
        node.paramMapWidget = paramMapWidget;
        
        console.log('[WaveSpeed Predictor] Hidden widgets created:', {
            modelIdWidget: !!modelIdWidget,
            requestJsonWidget: !!requestJsonWidget,
            paramMapWidget: !!paramMapWidget
        });
        
        // Override onExecute preprocessing to ensure hidden parameters are passed
        const originalOnExecute = node.onExecute;
        node.onExecute = function() {
            // Update seed widgets before execution (based on mode: fixed/increment/decrement/random)
            if (this._seedWidgets && this._seedWidgets.length > 0) {
                for (const seedWidget of this._seedWidgets) {
                    if (seedWidget.beforeExecute) {
                        seedWidget.beforeExecute();
                    }
                }
            }
            
            // Ensure hidden parameter values are set
            console.log('[WaveSpeed Predictor] onExecute - model_id:', node.modelIdWidget?.value);
            console.log('[WaveSpeed Predictor] onExecute - request_json:', node.requestJsonWidget?.value);
            console.log('[WaveSpeed Predictor] onExecute - param_map:', node.paramMapWidget?.value);
            
            if (originalOnExecute) {
                return originalOnExecute.call(this);
            }
        };

        // Initial model filtering and update FuzzyModelSelector
        await utilsModule.filterModels(node);

        // Check if workflow data needs to be restored
        if (node._wavespeed_savedData) {
            console.log('[WaveSpeed Predictor] Restoring saved workflow data...');
            await restoreWorkflowData(node, apiModule);
        }

        // Configure connection change handlers
        const inputsModule = await import('./predictor/inputs.js');
        inputsModule.configureConnectionHandlers(node);

        console.log('[WaveSpeed Predictor] Basic UI created successfully');

    } catch (error) {
        console.error('[WaveSpeed Predictor] Error creating basic UI:', error);
    }
}

// Create category tab button
function createCategoryTabButton(name, value, isActive, node, utilsModule, tabsWrapper) {
    const tab = document.createElement('button');
    tab.className = 'wavespeed-tab';
    tab.textContent = name;
    tab.dataset.value = value;
    tab.style.padding = '4px 8px';
    tab.style.borderRadius = '3px';
    tab.style.border = '1px solid #444';
    tab.style.cursor = 'pointer';
    tab.style.fontSize = '11px';
    tab.style.minHeight = '22px';
    tab.style.lineHeight = '1.2';
    tab.style.whiteSpace = 'nowrap';
    tab.style.transition = 'all 0.2s ease';

    if (isActive) {
        tab.classList.add('active');
        tab.style.backgroundColor = '#4a9eff';
        tab.style.color = 'white';
        tab.style.borderColor = '#4a9eff';
        node.wavespeedState.currentCategory = value;
    } else {
        tab.style.backgroundColor = '#2a2a2a';
        tab.style.color = '#e0e0e0';
    }

    tab.onclick = async () => {
        // Update all tab styles
        tabsWrapper.querySelectorAll('button').forEach(btn => {
            btn.classList.remove('active');
            btn.style.backgroundColor = '#2a2a2a';
            btn.style.color = '#e0e0e0';
            btn.style.borderColor = '#444';
        });

        tab.classList.add('active');
        tab.style.backgroundColor = '#4a9eff';
        tab.style.color = 'white';
        tab.style.borderColor = '#4a9eff';

        node.wavespeedState.currentCategory = value;
        await utilsModule.filterModels(node);
    };

    return tab;
}

// Update category tabsUI
function updateCategoryTabsUI(node, utilsModule) {
    const tabsWrapper = node._categoryTabsWrapper;
    if (!tabsWrapper) return;

    // Clear existing tabs
    tabsWrapper.innerHTML = '';

    // Re-add "All" tab
    const allTab = createCategoryTabButton('All', 'all', node.wavespeedState.currentCategory === 'all', node, utilsModule, tabsWrapper);
    tabsWrapper.appendChild(allTab);

    // Add category tabs
    if (node.wavespeedState.categoryList && node.wavespeedState.categoryList.length > 0) {
        for (const category of node.wavespeedState.categoryList) {
            const isActive = node.wavespeedState.currentCategory === category.value;
            const tab = createCategoryTabButton(category.name, category.value, isActive, node, utilsModule, tabsWrapper);
            tabsWrapper.appendChild(tab);
        }
    }
}

// Load model parameters
async function loadModelParameters(node, modelValue, apiModule, isRestoring = false) {
    try {
        console.log('[WaveSpeed Predictor] Loading model parameters for:', modelValue, 'isRestoring:', isRestoring);
        
        // Parse model ID
        let modelId = modelValue;
        if (modelValue.includes(' > ')) {
            modelId = modelValue.split(' > ')[1];
        }

        // Find model data from allModels
        const modelData = node.wavespeedState.allModels?.find(m => m.name === modelId || m.value === modelId);
        const actualModelId = modelData?.value || modelId;

        // Get model details
        const modelDetail = await apiModule.getCachedModelDetail(actualModelId);
        if (!modelDetail?.input_schema) {
            console.log('[WaveSpeed Predictor] No input schema found for model:', actualModelId);
            return;
        }

        // Dynamically import parameters module
        const parametersModule = await import('./predictor/parameters.js');
        const widgetsModule = await import('./predictor/widgets.js');
        const parameters = parametersModule.parseModelParameters(modelDetail.input_schema);
        
        console.log('[WaveSpeed Predictor] Parsed parameters:', parameters.length);

        // Save to node state
        node.wavespeedState.modelId = actualModelId;
        node.wavespeedState.parameters = parameters;

        // Only reset parameter values in non-restore mode
        if (!isRestoring) {
            node.wavespeedState.parameterValues = {};
        }

        // Update hidden widgets
        const apiPath = modelDetail.api_path || `/api/v3/${actualModelId}`;
        if (node.modelIdWidget) {
            node.modelIdWidget.value = apiPath;
        }

        // Clear old dynamic widgets (keep base widgets and hidden widgets)
        if (node.widgets) {
            const beforeCount = node.widgets.length;

            // CRITICAL: In restore mode, preserve widget values before deletion
            // LiteGraph has already restored standard widgets in originalConfigure
            // Save their values to parameterValues before deleting
            if (isRestoring) {
                console.log('[🔍 Preserve] Starting to preserve widget values...');
                for (const widget of node.widgets) {
                    if (widget._wavespeed_dynamic && widget._wavespeed_param) {
                        const currentValue = widget.value;
                        if (currentValue !== undefined) {
                            node.wavespeedState.parameterValues[widget._wavespeed_param] = currentValue;
                            console.log(`[🔍 Preserve] ${widget._wavespeed_param}: ${JSON.stringify(currentValue)}`);
                        }
                    }
                }
                console.log('[🔍 Preserve] Final parameterValues:', Object.keys(node.wavespeedState.parameterValues).length);
            }

            // Only clean up tooltips that are mounted to body (not managed by Vue)
            const bodyTooltips = document.querySelectorAll('.wavespeed-tooltip');
            bodyTooltips.forEach(t => t.remove());

            // Filter widgets array to remove dynamic widgets
            node.widgets = node.widgets.filter(w =>
                w._wavespeed_base ||
                w._wavespeed_hidden ||
                w.type === "hidden" ||
                w.name === 'model_id' ||
                w.name === 'request_json' ||
                w.name === 'param_map'
            );
            console.log(`[WaveSpeed Predictor] Filtered widgets: ${beforeCount} -> ${node.widgets.length}`);
        }

        // In restore mode, keep existing input slots (they were created in configure)
        // In non-restore mode, clear old dynamic input slots
        if (!isRestoring && node.inputs) {
            const inputsToKeep = [];
            for (const input of node.inputs) {
                // Keep non-dynamic inputs (if any exist)
                if (!input._wavespeed_dynamic) {
                    inputsToKeep.push(input);
                }
            }

            // Direct replacement - this clears LiteGraph's internal cache
            node.inputs = inputsToKeep;
            console.log('[WaveSpeed Predictor] Cleared dynamic inputs, kept:', inputsToKeep.length);
        }
        
        // Clear seed widgets list
        node._seedWidgets = [];

        // Expand array parameters to independent parameters
        const expandedParams = [];
        const arrayParamGroups = {};

        for (const param of parameters) {
            const originalType = parametersModule.getOriginalApiType(param);
            const isArray = param.isArray || parametersModule.isArrayParameter(param.name, originalType);

            if (isArray) {
                // Expand array parameter to multiple independent parameters
                const maxItems = Math.min(param.maxItems || 5, 5);
                const singularName = param.name.endsWith('s') ? param.name.slice(0, -1) : param.name;
                const mediaType = parametersModule.getMediaType(param.name, originalType);

                console.log(`[WaveSpeed Predictor] Expanding array param ${param.name}: maxItems=${maxItems}`);

                arrayParamGroups[param.name] = {
                    originalParam: param,
                    expandedNames: [],
                    maxItems: maxItems,
                    mediaType: mediaType
                };

                // First add a title parameter (no input slot)
                const titleParam = {
                    name: `${param.name}_title`,
                    displayName: param.name,
                    isArrayTitle: true,
                    parentArrayName: param.name,
                    parentRequired: param.required,
                    parentDescription: param.description,
                    type: 'ARRAY_TITLE'
                };
                expandedParams.push(titleParam);

                for (let i = 0; i < maxItems; i++) {
                    const expandedName = `${singularName}_${i}`;
                    const expandedParam = {
                        ...param,
                        name: expandedName,
                        displayName: `${param.displayName || param.name} [${i}]`,
                        isArray: false,
                        isExpandedArrayItem: true,
                        parentArrayName: param.name,
                        parentRequired: param.required,  // Pass parent parameter required
                        parentDescription: param.description,  // Pass parent parameter description
                        arrayIndex: i,
                        mediaType: mediaType,
                        type: 'STRING',
                        default: ''
                    };
                    expandedParams.push(expandedParam);
                    arrayParamGroups[param.name].expandedNames.push(expandedName);
                }
            } else {
                expandedParams.push(param);
            }
        }

        // Save array parameter group info
        node._arrayParamGroups = arrayParamGroups;

        console.log(`[WaveSpeed Predictor] Total expanded parameters: ${expandedParams.length}`);

        // Create input slot and widget for each expanded parameter
        // REFERENCE: Standard pattern from setupSingleMediaParameters (inputs.js:55-108)
        // Key: Create input FIRST, then widget, then associate immediately
        // This ensures inputs array is stable before ComfyUI calculates positions
        
        for (const param of expandedParams) {
            try {
                // Array title does not create input slot
                if (param.isArrayTitle || param.type === 'ARRAY_TITLE') {
                    // Only create widget, no input slot (similar to standard pattern but for title)
                    const widget = widgetsModule.createParameterWidget(node, param);
                    if (widget) {
                        // CRITICAL FIX: Set all flags explicitly for array title
                        widget._wavespeed_dynamic = true;
                        widget._wavespeed_no_input = true;  // Array title has no input slot
                        widget._wavespeed_base = false;
                        widget._wavespeed_hidden = false;
                        // console.log('[WaveSpeed Predictor] Created array title widget for:', param.name);
                    }
                    continue;
                }
                
                // STEP 1: Create input slot FIRST (standard pattern: input before widget)
                let input = null;
                if (isRestoring) {
                    // In restore mode, check if input already exists
                    const existingIdx = node.inputs?.findIndex(inp => inp.name === param.name);
                    if (existingIdx >= 0) {
                        input = node.inputs[existingIdx];
                        console.log('[WaveSpeed Predictor] Reusing existing input slot:', param.name);
                    }
                }
                
                // If not exists, create new input slot
                if (!input) {
                    const inputType = '*'; // Use wildcard type to accept any connection
                    input = node.addInput(param.name, inputType);
                }
                
                if (!input) {
                    console.warn('[WaveSpeed Predictor] Failed to create input for:', param.name);
                    continue;
                }
                
                // Set input properties
                input._wavespeed_dynamic = true;
                input._wavespeed_param = param.name;
                
                // Mark expanded array items
                if (param.isExpandedArrayItem) {
                    input._wavespeed_expanded_array_item = true;
                    input._wavespeed_parent_array = param.parentArrayName;
                    input._wavespeed_array_index = param.arrayIndex;
                }
                
                // console.log('[WaveSpeed Predictor] Created input for:', param.name);

                // STEP 2: Create widget (standard pattern: widget after input)
                const widget = widgetsModule.createParameterWidget(node, param);
                if (!widget) {
                    console.warn('[WaveSpeed Predictor] Failed to create widget for:', param.name);
                    // Input was created but widget failed - this is unusual but we continue
                    continue;
                }
                
                // CRITICAL FIX: Set all widget flags explicitly to avoid undefined values
                widget._wavespeed_dynamic = true;
                widget._wavespeed_no_input = false;  // This widget HAS an input
                widget._wavespeed_base = false;
                widget._wavespeed_hidden = false;

                // console.log('[WaveSpeed Predictor] Created widget for:', param.name);

                // STEP 3: Associate input and widget IMMEDIATELY (standard pattern)
                // This matches the pattern in setupSingleMediaParameters (inputs.js:79-82)

                input.widget = widget;
                widget.linkedInput = input;

                // console.log('[WaveSpeed Predictor] Associated widget and input for:', param.name);
                
            } catch (error) {
                console.error('[WaveSpeed Predictor] Error creating parameter:', param.name, error);
            }
        }

        // Update request JSON
        widgetsModule.updateRequestJson(node);

        console.log('[WaveSpeed Predictor] Model parameters loaded successfully');

    } catch (error) {
        console.error('[WaveSpeed Predictor] Error loading model parameters:', error);
    }
}

// Configure workflow save/restore support
function configureWorkflowSupport(node) {
    // Override serialize method to save state
    const originalSerialize = node.serialize;
    node.serialize = function() {
        const data = originalSerialize ? originalSerialize.call(this) : {};

        // Save WaveSpeed state
        data.wavespeed = {
            modelId: this.wavespeedState?.modelId || "",
            apiPath: this.wavespeedState?.apiPath || "",
            category: this.wavespeedState?.currentCategory || "all",
            parameterValues: this.wavespeedState?.parameterValues || {},
            requestJsonValue: this.requestJsonWidget?.value || "{}"
        };

        // Save input slot info for connection restore
        if (this.inputs && this.inputs.length > 0) {
            data.wavespeed.savedInputs = this.inputs
                .filter(inp => inp._wavespeed_dynamic)
                .map(inp => ({
                    name: inp.name,
                    type: inp.type,
                    isExpandedArrayItem: inp._wavespeed_expanded_array_item,
                    parentArray: inp._wavespeed_parent_array,
                    arrayIndex: inp._wavespeed_array_index
                }));
        }

        console.log('[WaveSpeed Predictor] Serializing state:', {
            modelId: data.wavespeed.modelId,
            category: data.wavespeed.category,
            paramCount: Object.keys(data.wavespeed.parameterValues).length,
            inputCount: data.wavespeed.savedInputs?.length || 0
        });

        return data;
    };
    
    // Override configure method to restore state
    const originalConfigure = node.configure;
    node.configure = function(data) {
        // Create input slots before calling original configure
        // So ComfyUI can correctly restore connections
        if (data.wavespeed && data.wavespeed.savedInputs) {
            console.log('[WaveSpeed Predictor] Pre-creating inputs for connection restore:', 
                data.wavespeed.savedInputs.length);
            
            // Clear existing dynamic inputs
            if (this.inputs) {
                this.inputs = this.inputs.filter(inp => !inp._wavespeed_dynamic);
            }
            
            // Create saved input slots
            for (const savedInput of data.wavespeed.savedInputs) {
                const input = this.addInput(savedInput.name, savedInput.type || '*');
                if (input) {
                    input._wavespeed_dynamic = true;
                    input._wavespeed_param = savedInput.name;
                    if (savedInput.isExpandedArrayItem) {
                        input._wavespeed_expanded_array_item = true;
                        input._wavespeed_parent_array = savedInput.parentArray;
                        input._wavespeed_array_index = savedInput.arrayIndex;
                    }
                }
            }
        }
        
        if (originalConfigure) {
            originalConfigure.call(this, data);
        }
        
        // Store workflow data for restore
        if (data.wavespeed) {
            this._wavespeed_savedData = data.wavespeed;
            console.log('[WaveSpeed Predictor] Saved workflow data for restoration:', {
                modelId: data.wavespeed.modelId,
                category: data.wavespeed.category
            });
        }
    };
}

// Restore workflow data
async function restoreWorkflowData(node, apiModule) {
    const saved = node._wavespeed_savedData;
    if (!saved || !saved.modelId) {
        console.log('[WaveSpeed Predictor] No saved workflow data to restore');
        return;
    }
    
    try {
        console.log('[WaveSpeed Predictor] Restoring workflow data:', {
            modelId: saved.modelId,
            category: saved.category
        });
        
        // 1. Restore category selection
        if (saved.category && node._categoryTabsWrapper) {
            node.wavespeedState.currentCategory = saved.category;
            
            // Update category tabs visual state
            const tabs = node._categoryTabsWrapper.querySelectorAll('button');
            tabs.forEach(tab => {
                const isActive = tab.dataset.value === saved.category;
                tab.classList.toggle('active', isActive);
                tab.style.backgroundColor = isActive ? '#4a9eff' : '#2a2a2a';
                tab.style.color = isActive ? 'white' : '#e0e0e0';
                tab.style.borderColor = isActive ? '#4a9eff' : '#444';
            });
        }
        
        // 2. Find and set model selector value
        let displayValue = saved.modelId;
        if (node._fuzzyModelSelector && node.wavespeedState.allModels) {
            const modelData = node.wavespeedState.allModels.find(m =>
                m.value === saved.modelId || m.name === saved.modelId
            );

            if (modelData) {
                displayValue = saved.category === 'all'
                    ? `${modelData.categoryName} > ${modelData.name}`
                    : modelData.name;

                // Set selector display value (without triggering callback)
                node._fuzzyModelSelector.setValueWithoutCallback(displayValue);
            }
        }

        // 3. CRITICAL: Restore parameterValues BEFORE loadModelParameters
        // So that when widgets are created, existing values won't be overwritten
        if (saved.parameterValues && Object.keys(saved.parameterValues).length > 0) {
            console.log('[WaveSpeed Predictor] Pre-loading parameter values:', Object.keys(saved.parameterValues));
            node.wavespeedState.parameterValues = { ...saved.parameterValues };
        }

        // 4. Load model parameters (use display value, loadModelParameters will parse actual modelId)
        // Pass isRestoring=true to keep existing input slots and preserve parameterValues
        await loadModelParameters(node, displayValue, apiModule, true);

        // 5. Update widgets with restored values (in case some weren't created with correct values)
        if (saved.parameterValues && Object.keys(saved.parameterValues).length > 0) {
            console.log('[WaveSpeed Predictor] Updating widgets with restored values');

            // Wait a short time to ensure widgets are created
            await new Promise(resolve => setTimeout(resolve, 100));

            for (const [paramName, paramValue] of Object.entries(saved.parameterValues)) {
                // Find and update widget
                const widget = node.widgets?.find(w => w._wavespeed_param === paramName);
                if (widget && widget.value !== paramValue) {
                    // Only update if value is different
                    if (widget.restoreValue && typeof widget.restoreValue === 'function') {
                        widget.restoreValue(paramValue);
                    } else {
                        try {
                            widget.value = paramValue;
                        } catch (e) {
                            console.warn(`[WaveSpeed Predictor] Could not set value for widget ${paramName}:`, e);
                        }
                    }
                }
            }

            // Update request JSON
            updateRequestJson(node);
        }

        // 6. Update node size
        node.setSize(node.computeSize());
        if (node.graph) {
            node.graph.setDirtyCanvas(true, true);
        }
        
        console.log('[WaveSpeed Predictor] Workflow data restored successfully');
        
    } catch (error) {
        console.error('[WaveSpeed Predictor] Error restoring workflow data:', error);
    } finally {
        // Clear saved data
        delete node._wavespeed_savedData;
    }
}

console.log('[WaveSpeed Predictor] Extension loaded');
