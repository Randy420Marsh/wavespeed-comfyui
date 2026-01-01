/**
 * WaveSpeed AI Audio Preview Node - Frontend
 *
 * Displays audio with HTML5 audio player
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

function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

app.registerExtension({
    name: "WaveSpeedAIPreviewAudio",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "WaveSpeedAI Preview Audio") {
            return;
        }

        // Handle onExecuted - Display audio when backend returns URL
        chainCallback(nodeType.prototype, "onExecuted", function (message) {
            console.log('[WaveSpeed Preview Audio] onExecuted:', message);

            if (!message || !message.audio_url || !message.audio_url[0]) {
                console.log('[WaveSpeed Preview Audio] No audio URL in message');
                return;
            }

            // Extract URL from array (matches other preview nodes format)
            const audioUrl = message.audio_url[0];
            console.log('[WaveSpeed Preview Audio] Audio URL:', audioUrl);

            // Remove old audio widget if exists
            const existingAudioIdx = this.widgets?.findIndex(w => w.name === 'audio_preview');
            if (existingAudioIdx > -1) {
                this.widgets.splice(existingAudioIdx, 1);
            }

            // Create container
            const container = document.createElement('div');
            container.style.width = '100%';
            container.style.padding = '15px';
            container.style.boxSizing = 'border-box';
            container.style.backgroundColor = '#1a1a1a';
            container.style.borderRadius = '8px';

            // Create label
            const label = document.createElement('div');
            label.textContent = '🎵 Audio Player';
            label.style.marginBottom = '15px';
            label.style.fontWeight = 'bold';
            label.style.color = '#e0e0e0';
            label.style.fontSize = '16px';
            container.appendChild(label);

            // Create audio player container
            const playerContainer = document.createElement('div');
            playerContainer.style.width = '100%';
            playerContainer.style.backgroundColor = '#2a2a2a';
            playerContainer.style.borderRadius = '8px';
            playerContainer.style.padding = '20px';

            // Create audio element
            const audio = document.createElement('audio');
            audio.src = audioUrl;
            audio.controls = true;
            audio.preload = 'metadata';
            audio.style.width = '100%';
            audio.style.height = '40px';
            audio.style.marginBottom = '15px';

            // Detect file format
            const fileExt = audioUrl.toLowerCase().split('?')[0].split('.').pop();

            // Create info section
            const infoSection = document.createElement('div');
            infoSection.style.display = 'flex';
            infoSection.style.justifyContent = 'space-between';
            infoSection.style.alignItems = 'center';
            infoSection.style.marginTop = '10px';
            infoSection.style.fontSize = '14px';
            infoSection.style.color = '#999';

            // Format info
            const formatInfo = document.createElement('div');
            formatInfo.textContent = `Format: ${fileExt.toUpperCase()}`;
            formatInfo.style.fontWeight = '500';

            // Duration info
            const durationInfo = document.createElement('div');
            durationInfo.textContent = 'Duration: Loading...';

            // Update duration when metadata loads
            audio.addEventListener('loadedmetadata', () => {
                durationInfo.textContent = `Duration: ${formatDuration(audio.duration)}`;
            });

            // Error handling
            audio.addEventListener('error', (e) => {
                console.error('[WaveSpeed Preview Audio] Audio loading error:', e);
                durationInfo.textContent = 'Error loading audio';
                durationInfo.style.color = '#ff6b6b';
            });

            infoSection.appendChild(formatInfo);
            infoSection.appendChild(durationInfo);

            // Assemble player
            playerContainer.appendChild(audio);
            playerContainer.appendChild(infoSection);
            container.appendChild(playerContainer);

            // Add download button
            const downloadBtn = document.createElement('a');
            downloadBtn.href = audioUrl;
            downloadBtn.download = `audio.${fileExt}`;
            downloadBtn.target = '_blank';
            downloadBtn.textContent = '⬇ Download Audio';
            downloadBtn.style.display = 'inline-block';
            downloadBtn.style.marginTop = '15px';
            downloadBtn.style.padding = '10px 20px';
            downloadBtn.style.backgroundColor = '#4a9eff';
            downloadBtn.style.color = 'white';
            downloadBtn.style.textDecoration = 'none';
            downloadBtn.style.borderRadius = '4px';
            downloadBtn.style.fontWeight = 'bold';
            downloadBtn.style.fontSize = '14px';
            downloadBtn.style.cursor = 'pointer';
            downloadBtn.style.transition = 'background-color 0.3s';

            downloadBtn.addEventListener('mouseenter', () => {
                downloadBtn.style.backgroundColor = '#3a8eef';
            });
            downloadBtn.addEventListener('mouseleave', () => {
                downloadBtn.style.backgroundColor = '#4a9eff';
            });

            container.appendChild(downloadBtn);

            // Add URL display
            const urlDisplay = document.createElement('div');
            urlDisplay.style.marginTop = '15px';
            urlDisplay.style.padding = '10px';
            urlDisplay.style.backgroundColor = '#252525';
            urlDisplay.style.borderRadius = '4px';
            urlDisplay.style.fontSize = '12px';
            urlDisplay.style.color = '#666';
            urlDisplay.style.wordBreak = 'break-all';
            urlDisplay.style.fontFamily = 'monospace';
            urlDisplay.textContent = `URL: ${audioUrl}`;
            container.appendChild(urlDisplay);

            // Add DOM widget
            const widget = this.addDOMWidget('audio_preview', 'div', container);
            widget.computeSize = () => [600, 300];

            // Update node size
            this.size[0] = 600;
            this.size[1] = Math.max(350, 300 + 50);

            this.setDirtyCanvas(true, true);
        });
    },
});
