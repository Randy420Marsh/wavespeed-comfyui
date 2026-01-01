/**
 * WaveSpeed Predictor - Parameter parsing and processing module
 */

// Format display name
export function formatDisplayName(propName) {
    return propName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Map JSON Schema type to ComfyUI type
export function mapJsonSchemaType(prop) {
    if (prop.enum && prop.enum.length > 0) {
        return "COMBO";
    }

    switch (prop.type) {
        case 'integer':
            return "INT";
        case 'number':
            return "FLOAT";
        case 'boolean':
            return "BOOLEAN";
        case 'string':
            return "STRING";
        case 'array':
            return "STRING";
        default:
            return "STRING";
    }
}

// Clean default value
export function cleanDefaultValue(defaultValue, propName) {
    if (defaultValue === undefined || defaultValue === null) {
        return defaultValue;
    }

    const paramName = propName.toLowerCase();

    if (paramName.includes('image') || paramName.includes('video') ||
        paramName.includes('audio') || paramName.includes('url')) {
        return '';
    }

    if (paramName.includes('prompt') || paramName.includes('text') ||
        paramName.includes('description')) {
        return '';
    }

    return defaultValue;
}

// Get original API type
export function getOriginalApiType(param) {
    if (param.originalType) {
        return param.originalType;
    }
    switch (param.type) {
        case 'STRING':
            return 'string';
        case 'INT':
            return 'integer';
        case 'FLOAT':
            return 'number';
        case 'BOOLEAN':
            return 'boolean';
        default:
            return 'string';
    }
}

// Check if parameter is an array type
export function isArrayParameter(paramName, apiType) {
    if (apiType !== 'string' && apiType !== 'array') {
        return false;
    }
    const lowerName = paramName.toLowerCase();
    return lowerName.endsWith('images') || lowerName.endsWith('image_urls') ||
           lowerName.endsWith('videos') || lowerName.endsWith('video_urls') ||
           lowerName.endsWith('audios') || lowerName.endsWith('audio_urls') ||
           lowerName.endsWith('loras') || lowerName.endsWith('lora_urls');
}

// Get media type
export function getMediaType(paramName, apiType) {
    if (apiType && apiType !== 'string' && apiType !== 'array') {
        return 'file';
    }

    const lowerName = paramName.toLowerCase();

    // Check plural forms (array types)
    if (lowerName.endsWith('images') || lowerName.endsWith('image_urls')) return 'image';
    if (lowerName.endsWith('videos') || lowerName.endsWith('video_urls')) return 'video';
    if (lowerName.endsWith('audios') || lowerName.endsWith('audio_urls')) return 'audio';
    if (lowerName.endsWith('loras') || lowerName.endsWith('lora_urls')) return 'lora';

    // Check singular forms
    if (lowerName.endsWith('image') || lowerName.endsWith('image_url')) return 'image';
    if (lowerName.endsWith('video') || lowerName.endsWith('video_url')) return 'video';
    if (lowerName.endsWith('audio') || lowerName.endsWith('audio_url')) return 'audio';
    if (lowerName.endsWith('lora') || lowerName.endsWith('lora_url')) return 'lora';

    return 'file';
}

// Parse model parameters
export function parseModelParameters(inputSchema) {
    if (!inputSchema?.properties) {
        return [];
    }

    const parameters = [];
    const properties = inputSchema.properties;
    const required = inputSchema.required || [];
    const order = inputSchema['x-order-properties'] || Object.keys(properties);

    for (const propName of order) {
        if (!properties[propName]) continue;

        const prop = properties[propName];
        if (prop.disabled || prop.hidden) continue;

        const param = {
            name: propName,
            displayName: formatDisplayName(propName),
            type: mapJsonSchemaType(prop),
            required: required.includes(propName),
            default: cleanDefaultValue(prop.default, propName),
            description: prop.description || "",
            isArray: prop.type === 'array',
            originalType: prop.type,
            uiComponent: prop['x-ui-component'],
        };

        if (prop.enum && prop.enum.length > 0) {
            param.options = prop.enum;
        }

        // Save min/max/step info
        if (prop.type === 'integer' || prop.type === 'number') {
            param.min = prop.minimum;
            param.max = prop.maximum;
            param.step = prop.step || (prop.type === 'integer' ? 1 : 0.01);
        }

        // Extract maxItems info
        if (prop.type === 'array' || isArrayParameter(propName, prop.type)) {
            const apiMaxItems = prop.maxItems || 5;
            param.maxItems = Math.min(apiMaxItems, 5);
            console.log(`[WaveSpeed] Array parameter "${propName}": API maxItems = ${prop.maxItems}, Limited to = ${param.maxItems}`);
        }

        parameters.push(param);
    }

    return parameters;
}

// Get ComfyUI input type
export function getComfyInputType(param) {
    const typeMap = {
        'STRING': 'STRING',
        'INT': 'INT',
        'FLOAT': 'FLOAT',
        'BOOLEAN': 'BOOLEAN',
        'LORA_WEIGHT': 'WAVESPEED_LORAS',
    };

    if (param.isArray) {
        return '*';
    }

    return typeMap[param.type] || '*';
}

// Detect file input type
export function detectFileType(name) {
    const lowerName = name.toLowerCase();

    // Check plural forms (arrays)
    if (lowerName.endsWith('images') || lowerName.endsWith('image_urls')) {
        return { accept: 'image/*', type: 'file-array' };
    }
    if (lowerName.endsWith('videos') || lowerName.endsWith('video_urls')) {
        return { accept: 'video/*', type: 'file-array' };
    }
    if (lowerName.endsWith('audios') || lowerName.endsWith('audio_urls')) {
        return { accept: 'audio/*', type: 'file-array' };
    }

    // Check singular forms
    if (lowerName.endsWith('image') || lowerName.endsWith('image_url')) {
        return { accept: 'image/*', type: 'file' };
    }
    if (lowerName.endsWith('video') || lowerName.endsWith('video_url')) {
        return { accept: 'video/*', type: 'file' };
    }
    if (lowerName.endsWith('audio') || lowerName.endsWith('audio_url')) {
        return { accept: 'audio/*', type: 'file' };
    }

    return null;
}