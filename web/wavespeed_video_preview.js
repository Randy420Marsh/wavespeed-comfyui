/**
 * WaveSpeed AI Video Preview Node - Frontend
 *
 * Simple video preview using DOM widget
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
    name: "WaveSpeedAIPreviewVideo",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "WaveSpeedAI Preview Video") {
            return;
        }

        // Handle onExecuted - Display video when backend returns URL
        chainCallback(nodeType.prototype, "onExecuted", function (message) {
            console.log('[WaveSpeed Preview Video] onExecuted:', message);

            if (!message || !message.video_url || !message.video_url[0]) {
                console.log('[WaveSpeed Preview Video] No video URL in message');
                return;
            }

            const videoUrl = message.video_url[0];
            console.log('[WaveSpeed Preview Video] Video URL:', videoUrl);

            // Remove old video widget if exists
            const existingVideoIdx = this.widgets?.findIndex(w => w.name === 'video_preview');
            if (existingVideoIdx > -1) {
                this.widgets.splice(existingVideoIdx, 1);
            }

            // Create container
            const container = document.createElement('div');
            container.style.width = '100%';
            container.style.padding = '10px';
            container.style.boxSizing = 'border-box';

            // Create video element
            const video = document.createElement('video');
            video.src = videoUrl;
            video.controls = true;
            video.loop = true;
            video.muted = true;
            video.autoplay = true;
            video.style.width = '100%';
            video.style.maxWidth = '768px';
            video.style.borderRadius = '8px';

            // Click to unmute
            video.addEventListener('click', () => {
                if (video.muted) {
                    video.muted = false;
                }
            });

            container.appendChild(video);

            // Add download button
            const downloadBtn = document.createElement('a');
            downloadBtn.href = videoUrl;
            downloadBtn.download = `wavespeed_video_${Date.now()}.mp4`;
            downloadBtn.target = '_blank';
            downloadBtn.textContent = '⬇ Download Video';
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

            // Add DOM widget
            const widget = this.addDOMWidget('video_preview', 'div', container);
            widget.computeSize = () => [768, 500]; // Width, Height (increased for button)

            // Update node size
            this.size[0] = 768;
            this.size[1] = Math.max(550, 500 + 50);

            this.setDirtyCanvas(true, true);
        });
    },
});
