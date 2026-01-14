/**
 * WaveSpeed Predictor - Workflow save and restore module
 */

import { getCachedModelDetail } from './api.js';
import { parseModelParameters, getMediaType, getOriginalApiType } from './parameters.js';
import { updateDynamicInputs, setupSingleMediaParameters } from './inputs.js';
import { createParameterWidget, updateHiddenWidget, updateRequestJson } from './widgets.js';

// Restore workflow data
export async function restoreWorkflowData(node) {
    const saved = node._wavespeed_savedData;
    if (!saved) return;

    try {
        console.log('[WaveSpeed] Restoring workflow data:', {
            modelId: saved.modelId,
            arrayInputCounts: saved.arrayInputCounts
        });

        // 1. Restore basic state
        node.wavespeedState.modelId = saved.modelId || "";
        node.wavespeedState.apiPath = saved.apiPath || "";
        node.wavespeedState.category = saved.category || "";

        if (!saved.modelId) {
            console.warn('[WaveSpeed] No modelId in saved data, skipping restore');
            delete node._wavespeed_savedData;
            return;
        }

        // 2. Find matching model option and update Model widget
        let modelValue = saved.modelId;
        if (node.modelWidget?.options?.values) {
            const matchingOption = node.modelWidget.options.values.find(opt =>
                opt === saved.modelId || opt.endsWith(`> ${saved.modelId}`)
            );
            if (matchingOption) {
                modelValue = matchingOption;
            }
        }
        if (node.modelWidget) {
            node.modelWidget.value = modelValue;
            node.wavespeedState.lastModelValue = modelValue;
        }

        // 3. Load model details
        const modelDetail = await getCachedModelDetail(saved.modelId);
        if (!modelDetail?.input_schema) {
            console.error('[WaveSpeed] Failed to load model detail for workflow restore');
            delete node._wavespeed_savedData;
            return;
        }

        // 4. Update API path
        const apiPath = modelDetail.api_path || `/api/v3/${saved.modelId}`;
        node.wavespeedState.apiPath = apiPath;
        updateHiddenWidget(node, 'model_id', apiPath);

        // 5. Clear dynamic widgets (don't clear inputs - keep ComfyUI restored connections)
        if (node.widgets) {
            node.widgets = node.widgets.filter(w =>
                w._wavespeed_base ||
                w._wavespeed_hidden ||
                w.name === 'Category' ||
                w.name === 'Model' ||
                w.name === 'model_id' ||
                w.name === 'request_json' ||
                w.name === 'param_map'
            );
        }

        // 6. Parse parameters
        const parameters = parseModelParameters(modelDetail.input_schema);
        console.log('[WaveSpeed] Parsed parameters:', parameters.length);

        // Separate parameter types
        const arrayParams = parameters.filter(p => p.isArray);
        const normalParams = parameters.filter(p => !p.isArray);
        const mediaParams = normalParams.filter(p => {
            const mediaType = getMediaType(p.name, getOriginalApiType(p));
            return mediaType !== 'file';
        });
        const nonMediaParams = normalParams.filter(p => {
            const mediaType = getMediaType(p.name, getOriginalApiType(p));
            return mediaType === 'file';
        });

        console.log('[WaveSpeed DEBUG] Parameter classification:');
        console.log('  - arrayParams:', arrayParams.map(p => p.name));
        console.log('  - mediaParams:', mediaParams.map(p => p.name));
        console.log('  - nonMediaParams:', nonMediaParams.map(p => p.name));

        // 7. Create inputs (unified logic)
        console.log('[WaveSpeed DEBUG] Calling updateDynamicInputs with:', nonMediaParams.map(p => p.name));
        updateDynamicInputs(node, nonMediaParams);
        setupSingleMediaParameters(node, mediaParams);

        // 8. Create widgets for non-media parameters
        node.wavespeedState.parameters = parameters;
        for (const param of nonMediaParams) {
            try {
                createParameterWidget(node, param);
            } catch (error) {
                console.error(`[WaveSpeed] Error creating widget for ${param.name}:`, error);
            }
        }

        updateRequestJson(node);
        node.setSize(node.computeSize());

        // 9. Restore parameter values
        if (saved.requestJsonValue) {
            try {
                const requestJson = JSON.parse(saved.requestJsonValue);

                for (const [paramName, paramValue] of Object.entries(requestJson)) {
                    const widget = node.widgets?.find(w => w._wavespeed_param === paramName);
                    if (widget) {
                        if (widget.restoreValue && typeof widget.restoreValue === 'function') {
                            widget.restoreValue(paramValue);
                        } else {
                            widget.value = paramValue;
                        }
                        node.wavespeedState.parameterValues[paramName] = paramValue;
                    }
                }

                updateRequestJson(node);
            } catch (error) {
                console.error('[WaveSpeed] Error restoring parameter values:', error);
            }
        }

        console.log('[WaveSpeed] Workflow data restored successfully');
        delete node._wavespeed_savedData;

    } catch (error) {
        console.error('[WaveSpeed] Error restoring workflow data:', error);
        delete node._wavespeed_savedData;
    }
}

// Serialize node state
export function serializeNodeState(node) {
    const data = {};

    // Save WaveSpeed state (only save necessary user state)
    data.wavespeed = {
        modelId: node.wavespeedState?.modelId || "",
        apiPath: node.wavespeedState?.apiPath || "",
        category: node.wavespeedState?.category || "",
        arrayInputCounts: node._arrayInputCounts || {}
    };

    // Save current request_json value for parameter restoration
    if (node.requestJsonWidget) {
        data.wavespeed.requestJsonValue = node.requestJsonWidget.value;
    }

    console.log('[WaveSpeed] Serializing state:', data.wavespeed);
    return data;
}

// Configure node to support workflow restore
export function configureWorkflowSupport(node) {
    // Override configure method to support workflow restore
    const originalConfigure = node.configure;
    node.configure = function(data) {
        if (originalConfigure) {
            originalConfigure.call(this, data);
        }

        // Store workflow data for restoration
        if (data.wavespeed) {
            this._wavespeed_savedData = data.wavespeed;
            console.log('[WaveSpeed] Saved workflow data for restoration:', {
                modelId: data.wavespeed.modelId,
                arrayInputCounts: data.wavespeed.arrayInputCounts
            });

            // Create inputs immediately to prevent connection loss
            const arrayInputCounts = data.wavespeed.arrayInputCounts || {};
            if (Object.keys(arrayInputCounts).length > 0) {
                console.log('[WaveSpeed] Creating inputs immediately in configure()');

                // Clear existing inputs (except Client)
                this.inputs = this.inputs?.filter(inp => inp.name === 'Client') || [];

                // Create array inputs based on saved counts
                for (const [arrayParamName, count] of Object.entries(arrayInputCounts)) {
                    const singularName = arrayParamName.endsWith('s')
                        ? arrayParamName.slice(0, -1)
                        : arrayParamName;

                    console.log(`[WaveSpeed] Creating ${count} inputs for "${arrayParamName}"`);

                    for (let i = 1; i <= count; i++) {
                        const slotName = `${singularName}_${i}`;
                        this.addInput(slotName, '*');
                    }
                }

                console.log('[WaveSpeed] Inputs created in configure(), count:', this.inputs?.length);
            }
        }
    };

    // Override serialize method to save state
    const originalSerialize = node.serialize;
    node.serialize = function() {
        const data = originalSerialize ? originalSerialize.call(this) : {};
        const serializedData = serializeNodeState(this);
        Object.assign(data, serializedData);
        return data;
    };
}