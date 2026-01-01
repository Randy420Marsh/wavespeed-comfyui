/**
 * WaveSpeed Predictor - API calls and cache management module
 */

import { api } from "../../../../scripts/api.js";

// Global cache management
const GLOBAL_CACHE = {
    cacheExpiry: 5 * 60 * 1000,
    stats: { hits: 0, misses: 0, lastUpdate: Date.now() },

    get categories() {
        try {
            const cached = localStorage.getItem('wavespeed_categories');
            if (cached) {
                const data = JSON.parse(cached);
                this.stats.hits++;
                return data.value;
            }
        } catch (e) {}
        this.stats.misses++;
        return null;
    },

    set categories(value) {
        try {
            localStorage.setItem('wavespeed_categories', JSON.stringify({
                value: value,
                timestamp: Date.now()
            }));
            this.stats.lastUpdate = Date.now();
        } catch (e) {}
    },

    getModelsByCategory(category) {
        try {
            const cached = localStorage.getItem(`wavespeed_models_${category}`);
            if (cached) {
                const data = JSON.parse(cached);
                this.stats.hits++;
                return data.value;
            }
        } catch (e) {}
        this.stats.misses++;
        return null;
    },

    setModelsByCategory(category, value) {
        try {
            localStorage.setItem(`wavespeed_models_${category}`, JSON.stringify({
                value: value,
                timestamp: Date.now()
            }));
            this.stats.lastUpdate = Date.now();
        } catch (e) {}
    },

    getModelDetail(modelId) {
        try {
            const cached = localStorage.getItem(`wavespeed_model_${modelId}`);
            if (cached) {
                const data = JSON.parse(cached);
                this.stats.hits++;
                return data.value;
            }
        } catch (e) {}
        this.stats.misses++;
        return null;
    },

    setModelDetail(modelId, value) {
        try {
            localStorage.setItem(`wavespeed_model_${modelId}`, JSON.stringify({
                value: value,
                timestamp: Date.now()
            }));
            this.stats.lastUpdate = Date.now();
        } catch (e) {}
    },

    clearAll() {
        try {
            const keys = Object.keys(localStorage);
            for (const key of keys) {
                if (key.startsWith('wavespeed_')) {
                    localStorage.removeItem(key);
                }
            }
            this.stats = { hits: 0, misses: 0, lastUpdate: Date.now() };
        } catch (e) {
            console.error("[WaveSpeed] Failed to clear cache:", e);
        }
    },

    getCacheStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(1) : 0;
        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            total: total,
            hitRate: `${hitRate}%`,
            lastUpdate: new Date(this.stats.lastUpdate).toLocaleString()
        };
    }
};

// API call functions
export async function fetchWaveSpeedAPI(endpoint) {
    try {
        const response = await api.fetchApi(endpoint);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`[WaveSpeed] Error fetching ${endpoint}:`, error);
        throw error;
    }
}

export async function getModelCategories() {
    try {
        const result = await fetchWaveSpeedAPI("/wavespeed/api/categories");
        if (result && result.success && result.data) {
            return result.data;
        } else {
            console.error("[WaveSpeed] Invalid categories response:", result);
            return [];
        }
    } catch (error) {
        console.error("[WaveSpeed] Failed to get categories:", error);
        return [];
    }
}

export async function getModelsByCategory(category) {
    try {
        const result = await fetchWaveSpeedAPI(`/wavespeed/api/models/${category}`);
        if (result && result.success && result.data) {
            return result.data;
        } else {
            console.error("[WaveSpeed] Invalid models response:", result);
            return [];
        }
    } catch (error) {
        console.error("[WaveSpeed] Failed to get models:", error);
        return [];
    }
}

export async function getModelDetail(modelId) {
    try {
        const result = await fetchWaveSpeedAPI(`/wavespeed/api/model?model_id=${encodeURIComponent(modelId)}`);
        if (result && result.success && result.data) {
            return result.data;
        } else {
            console.error("[WaveSpeed] Invalid model detail response:", result);
            return null;
        }
    } catch (error) {
        console.error("[WaveSpeed] Failed to get model detail:", error);
        return null;
    }
}

// Cached version of API calls
export async function getCachedCategories() {
    const cached = GLOBAL_CACHE.categories;
    if (cached !== null && cached !== undefined) {
        return cached;
    }
    const categories = await getModelCategories();
    GLOBAL_CACHE.categories = categories;
    return categories;
}

export async function getCachedModelsByCategory(category) {
    const cached = GLOBAL_CACHE.getModelsByCategory(category);
    if (cached !== null && cached !== undefined) {
        return cached;
    }
    const models = await getModelsByCategory(category);
    GLOBAL_CACHE.setModelsByCategory(category, models);
    return models;
}

export async function getCachedModelDetail(modelId) {
    const cached = GLOBAL_CACHE.getModelDetail(modelId);
    if (cached !== null && cached !== undefined) {
        return cached;
    }
    const detail = await getModelDetail(modelId);
    if (detail) {
        GLOBAL_CACHE.setModelDetail(modelId, detail);
    }
    return detail;
}

// Shared preload Promise
let SHARED_PRELOAD_PROMISE = null;

export async function preloadAllModels(onProgress) {
    if (SHARED_PRELOAD_PROMISE) {
        return SHARED_PRELOAD_PROMISE;
    }

    SHARED_PRELOAD_PROMISE = (async () => {
        try {
            // 1. Load all categories
            const categories = await getCachedCategories();
            if (onProgress) onProgress({ step: 'categories', current: categories.length, total: categories.length });

            // 2. Load models for all categories
            const allModelsPromises = categories.map(cat => getCachedModelsByCategory(cat.value));
            const allModels = await Promise.all(allModelsPromises);

            const totalModels = allModels.reduce((sum, models) => sum + models.length, 0);
            if (onProgress) onProgress({ step: 'models', current: totalModels, total: totalModels });

            // 3. Build global model list
            const flatModels = [];
            categories.forEach((cat, idx) => {
                allModels[idx].forEach(model => {
                    flatModels.push({
                        ...model,
                        categoryName: cat.name,
                        categoryValue: cat.value
                    });
                });
            });

            return {
                categories,
                modelsByCategory: allModels,
                flatModels
            };

        } catch (error) {
            console.error("[Preload] Failed to preload models:", error);
            SHARED_PRELOAD_PROMISE = null;
            return null;
        }
    })();

    const result = await SHARED_PRELOAD_PROMISE;
    return result;
}

export async function refreshAllModels(onProgress) {
    GLOBAL_CACHE.clearAll();
    SHARED_PRELOAD_PROMISE = null;
    return await preloadAllModels(onProgress);
}

export { GLOBAL_CACHE };