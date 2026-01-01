/**
 * WaveSpeed AI Text Preview Node - Frontend
 *
 * Displays text content in a formatted, readable preview.
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

function createTextElement(text) {
    const textEl = document.createElement('div');
    textEl.style.width = '100%';
    textEl.style.padding = '15px';
    textEl.style.backgroundColor = '#1e1e1e';
    textEl.style.color = '#e0e0e0';
    textEl.style.borderRadius = '8px';
    textEl.style.fontFamily = 'monospace';
    textEl.style.fontSize = '14px';
    textEl.style.lineHeight = '1.6';
    textEl.style.whiteSpace = 'pre-wrap';
    textEl.style.wordWrap = 'break-word';
    textEl.style.maxHeight = '400px';
    textEl.style.overflowY = 'auto';
    textEl.textContent = text;
    return textEl;
}

app.registerExtension({
    name: "WaveSpeedAIPreviewText",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "WaveSpeedAI Preview Text") {
            return;
        }

        // Handle onExecuted - Display text when backend returns content
        chainCallback(nodeType.prototype, "onExecuted", function (message) {
            console.log('[WaveSpeed Preview Text] onExecuted:', message);

            if (!message || !message.text_content || !message.text_content[0]) {
                console.log('[WaveSpeed Preview Text] No text content in message');
                return;
            }

            // Extract text from array (matches other preview nodes format)
            const textContent = message.text_content[0];

            // Remove old text widget if exists
            const existingTextIdx = this.widgets?.findIndex(w => w.name === 'text_preview');
            if (existingTextIdx > -1) {
                this.widgets.splice(existingTextIdx, 1);
            }

            // Create container
            const container = document.createElement('div');
            container.style.width = '100%';
            container.style.padding = '10px';
            container.style.boxSizing = 'border-box';

            // Create label
            const label = document.createElement('div');
            label.textContent = '📝 Text Output';
            label.style.marginBottom = '10px';
            label.style.fontWeight = 'bold';
            label.style.color = '#e0e0e0';
            label.style.fontSize = '16px';
            container.appendChild(label);

            // Create text element
            const textEl = createTextElement(textContent);
            container.appendChild(textEl);

            // Add download button
            const downloadBtn = document.createElement('button');
            downloadBtn.textContent = '💾 Download Text';
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

            downloadBtn.onclick = () => {
                // Create Blob
                const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });

                // Create download link
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `wavespeed_text_${Date.now()}.txt`;
                a.click();

                // Cleanup
                URL.revokeObjectURL(url);

                console.log('[WaveSpeed Preview Text] Text downloaded');
            };

            container.appendChild(downloadBtn);

            // Add DOM widget
            const widget = this.addDOMWidget('text_preview', 'div', container);

            // Calculate height based on content (max 400px)
            const contentHeight = Math.min(textEl.scrollHeight, 400);
            const totalHeight = contentHeight + 80; // content + padding + label
            widget.computeSize = () => [768, totalHeight];

            // Update node size
            this.size[0] = 768;
            this.size[1] = Math.max(totalHeight + 50, 200);

            this.setDirtyCanvas(true, true);
        });
    },
});
