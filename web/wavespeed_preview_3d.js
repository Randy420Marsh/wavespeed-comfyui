/**
 * WaveSpeed AI 3D Model Preview Node - Frontend
 *
 * Displays 3D models from HTTP URLs using Three.js GLTFLoader
 */

import { app } from '../../../scripts/app.js';

function chainCallback(object, property, callback) {
    if (object == undefined) {
        console.error("Tried to add callback to non-existent object");
        return;
    }
    if (property in object) {
        const callback_orig = object[property];
        object[property] = function () {
            const r = callback_orig.apply(this, arguments);
            callback.apply(this, arguments);
            return r;
        };
    } else {
        object[property] = callback;
    }
}

app.registerExtension({
    name: "WaveSpeedAIPreview3DModel",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "WaveSpeedAI Preview 3D Model") {
            return;
        }

        // Handle onExecuted - Display 3D model when backend returns URL
        chainCallback(nodeType.prototype, "onExecuted", function (message) {
            console.log('[WaveSpeed Preview 3D] onExecuted:', message);

            if (!message || !message.model_3d_url || !message.model_3d_url[0]) {
                console.log('[WaveSpeed Preview 3D] No 3D model URL in message');
                return;
            }

            // Extract URL from array (matches Video Preview format)
            const model3dUrl = message.model_3d_url[0];
            console.log('[WaveSpeed Preview 3D] 3D Model URL:', model3dUrl);

            // Remove old 3D viewer widget if exists
            const existing3DIdx = this.widgets?.findIndex(w => w.name === '3d_preview');
            if (existing3DIdx > -1) {
                this.widgets.splice(existing3DIdx, 1);
            }

            // Create container
            const container = document.createElement('div');
            container.style.width = '100%';
            container.style.padding = '10px';
            container.style.boxSizing = 'border-box';
            container.style.backgroundColor = '#1a1a1a';
            container.style.borderRadius = '8px';

            // Create label
            const label = document.createElement('div');
            label.textContent = '🎨 3D Model Preview';
            label.style.marginBottom = '10px';
            label.style.fontWeight = 'bold';
            label.style.color = '#e0e0e0';
            label.style.fontSize = '16px';
            container.appendChild(label);

            // Create iframe container for 3D viewer
            // Using iframe to load model-viewer web component
            const viewerContainer = document.createElement('div');
            viewerContainer.style.width = '100%';
            viewerContainer.style.height = '500px';
            viewerContainer.style.backgroundColor = '#2a2a2a';
            viewerContainer.style.borderRadius = '4px';
            viewerContainer.style.display = 'flex';
            viewerContainer.style.alignItems = 'center';
            viewerContainer.style.justifyContent = 'center';
            viewerContainer.style.position = 'relative';

            // Check file extension
            const fileExt = model3dUrl.toLowerCase().split('?')[0].split('.').pop();

            if (fileExt === 'glb' || fileExt === 'gltf') {
                // Create model-viewer element for GLB/GLTF
                const modelViewer = document.createElement('model-viewer');
                modelViewer.setAttribute('src', model3dUrl);
                modelViewer.setAttribute('alt', '3D Model');
                modelViewer.setAttribute('auto-rotate', '');
                modelViewer.setAttribute('camera-controls', '');
                modelViewer.setAttribute('shadow-intensity', '1');
                modelViewer.setAttribute('style', 'width: 100%; height: 100%; background-color: #2a2a2a;');

                // Add loading indicator
                const loadingText = document.createElement('div');
                loadingText.textContent = 'Loading 3D model...';
                loadingText.style.color = '#888';
                loadingText.style.position = 'absolute';
                loadingText.style.top = '50%';
                loadingText.style.left = '50%';
                loadingText.style.transform = 'translate(-50%, -50%)';
                viewerContainer.appendChild(loadingText);

                modelViewer.addEventListener('load', () => {
                    loadingText.remove();
                });

                modelViewer.addEventListener('error', (e) => {
                    console.error('[WaveSpeed Preview 3D] Model loading error:', e);
                    loadingText.textContent = 'Error loading 3D model';
                    loadingText.style.color = '#ff6b6b';
                });

                viewerContainer.appendChild(modelViewer);

                // Load model-viewer script if not already loaded
                if (!window.customElements.get('model-viewer')) {
                    const script = document.createElement('script');
                    script.type = 'module';
                    script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
                    document.head.appendChild(script);
                }
            } else {
                // For other formats (OBJ, PLY, etc.), show download link
                const infoText = document.createElement('div');
                infoText.style.color = '#e0e0e0';
                infoText.style.textAlign = 'center';
                infoText.style.padding = '20px';
                infoText.innerHTML = `
                    <p style="margin-bottom: 15px;">3D Model (${fileExt.toUpperCase()}) ready</p>
                    <a href="${model3dUrl}"
                       target="_blank"
                       download
                       style="
                           display: inline-block;
                           padding: 10px 20px;
                           background-color: #4a9eff;
                           color: white;
                           text-decoration: none;
                           border-radius: 4px;
                           font-weight: bold;
                       ">
                        Download ${fileExt.toUpperCase()} Model
                    </a>
                `;
                viewerContainer.appendChild(infoText);
            }

            container.appendChild(viewerContainer);

            // Add download button for all formats
            const downloadBtn = document.createElement('button');
            downloadBtn.textContent = `💾 Download ${fileExt.toUpperCase()} Model`;
            downloadBtn.style.marginTop = '15px';
            downloadBtn.style.padding = '10px 20px';
            downloadBtn.style.backgroundColor = '#4a9eff';
            downloadBtn.style.color = 'white';
            downloadBtn.style.border = 'none';
            downloadBtn.style.borderRadius = '4px';
            downloadBtn.style.cursor = 'pointer';
            downloadBtn.style.fontWeight = 'bold';
            downloadBtn.style.fontSize = '14px';
            downloadBtn.style.transition = 'background-color 0.3s';

            downloadBtn.addEventListener('mouseenter', () => {
                downloadBtn.style.backgroundColor = '#3a8eef';
            });
            downloadBtn.addEventListener('mouseleave', () => {
                downloadBtn.style.backgroundColor = '#4a9eff';
            });

            downloadBtn.onclick = async () => {
                try {
                    // Fetch the file
                    const response = await fetch(model3dUrl);
                    const blob = await response.blob();

                    // Create download link
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `wavespeed_3d_model_${Date.now()}.${fileExt}`;
                    a.click();

                    // Cleanup
                    URL.revokeObjectURL(url);

                    console.log('[WaveSpeed Preview 3D] Model downloaded');
                } catch (error) {
                    console.error('[WaveSpeed Preview 3D] Download failed:', error);
                    alert('Download failed. Please try opening the URL in a new tab.');
                }
            };

            container.appendChild(downloadBtn);

            // Add URL display
            const urlDisplay = document.createElement('div');
            urlDisplay.style.marginTop = '10px';
            urlDisplay.style.padding = '8px';
            urlDisplay.style.backgroundColor = '#252525';
            urlDisplay.style.borderRadius = '4px';
            urlDisplay.style.fontSize = '12px';
            urlDisplay.style.color = '#888';
            urlDisplay.style.wordBreak = 'break-all';
            urlDisplay.style.fontFamily = 'monospace';
            urlDisplay.textContent = `URL: ${model3dUrl}`;
            container.appendChild(urlDisplay);

            // Add DOM widget
            const widget = this.addDOMWidget('3d_preview', 'div', container);
            widget.computeSize = () => [800, 650];

            // Update node size
            this.size[0] = 800;
            this.size[1] = Math.max(700, 650 + 50);

            this.setDirtyCanvas(true, true);
        });
    },
});
