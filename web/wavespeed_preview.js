/**
 * WaveSpeed AI Universal Preview Node - Frontend
 *
 * Automatically detects and displays any media type: Image, Video, Audio, 3D, Text
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

// Utility: Format duration for audio
function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Render function: Video Preview
function renderVideoPreview(node, videoUrl) {
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.padding = '10px';
    container.style.boxSizing = 'border-box';
    container.style.overflow = 'hidden';
    container.style.position = 'relative';

    // Add download button (top right)
    const downloadBtn = document.createElement('a');
    downloadBtn.href = videoUrl;
    downloadBtn.download = `wavespeed_video_${Date.now()}.mp4`;
    downloadBtn.target = '_blank';
    downloadBtn.textContent = '⬇';
    downloadBtn.title = 'Download Video';
    downloadBtn.style.position = 'absolute';
    downloadBtn.style.top = '15px';
    downloadBtn.style.right = '15px';
    downloadBtn.style.width = '32px';
    downloadBtn.style.height = '32px';
    downloadBtn.style.display = 'flex';
    downloadBtn.style.alignItems = 'center';
    downloadBtn.style.justifyContent = 'center';
    downloadBtn.style.backgroundColor = 'rgba(74, 158, 255, 0.9)';
    downloadBtn.style.color = 'white';
    downloadBtn.style.textDecoration = 'none';
    downloadBtn.style.borderRadius = '6px';
    downloadBtn.style.fontSize = '16px';
    downloadBtn.style.cursor = 'pointer';
    downloadBtn.style.transition = 'background-color 0.2s, transform 0.2s';
    downloadBtn.style.zIndex = '10';
    downloadBtn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

    downloadBtn.addEventListener('mouseenter', () => {
        downloadBtn.style.backgroundColor = 'rgba(58, 142, 239, 1)';
        downloadBtn.style.transform = 'scale(1.1)';
    });
    downloadBtn.addEventListener('mouseleave', () => {
        downloadBtn.style.backgroundColor = 'rgba(74, 158, 255, 0.9)';
        downloadBtn.style.transform = 'scale(1)';
    });

    container.appendChild(downloadBtn);

    // Create video element
    const video = document.createElement('video');
    video.src = videoUrl;
    video.controls = true;
    video.loop = true;
    video.muted = true;
    video.autoplay = true;
    video.style.width = '100%';
    video.style.maxWidth = '100%';
    video.style.height = 'auto';
    video.style.borderRadius = '8px';
    video.style.display = 'block';

    // Click to unmute
    video.addEventListener('click', () => {
        if (video.muted) {
            video.muted = false;
        }
    });

    container.appendChild(video);

    // Add DOM widget
    const widget = node.addDOMWidget('preview', 'div', container);
    
    // Dynamic size calculation
    const nodeWidth = Math.max(node.size[0], 400);
    widget.computeSize = () => [nodeWidth - 20, 320];

    // Update node size - use current node width
    node.size[0] = Math.max(node.size[0], 400);
    node.size[1] = Math.max(370, node.size[1]);

    node.setDirtyCanvas(true, true);
}

// Render function: Image Preview
function renderImagePreview(node, imageUrl) {
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.padding = '10px';
    container.style.boxSizing = 'border-box';
    container.style.overflow = 'hidden';
    container.style.position = 'relative';

    // Add download button (top right)
    const downloadBtn = document.createElement('a');
    downloadBtn.href = imageUrl;
    downloadBtn.download = `wavespeed_image_${Date.now()}.png`;
    downloadBtn.target = '_blank';
    downloadBtn.textContent = '⬇';
    downloadBtn.title = 'Download Image';
    downloadBtn.style.position = 'absolute';
    downloadBtn.style.top = '15px';
    downloadBtn.style.right = '15px';
    downloadBtn.style.width = '32px';
    downloadBtn.style.height = '32px';
    downloadBtn.style.display = 'flex';
    downloadBtn.style.alignItems = 'center';
    downloadBtn.style.justifyContent = 'center';
    downloadBtn.style.backgroundColor = 'rgba(74, 158, 255, 0.9)';
    downloadBtn.style.color = 'white';
    downloadBtn.style.textDecoration = 'none';
    downloadBtn.style.borderRadius = '6px';
    downloadBtn.style.fontSize = '16px';
    downloadBtn.style.cursor = 'pointer';
    downloadBtn.style.transition = 'background-color 0.2s, transform 0.2s';
    downloadBtn.style.zIndex = '10';
    downloadBtn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

    downloadBtn.addEventListener('mouseenter', () => {
        downloadBtn.style.backgroundColor = 'rgba(58, 142, 239, 1)';
        downloadBtn.style.transform = 'scale(1.1)';
    });
    downloadBtn.addEventListener('mouseleave', () => {
        downloadBtn.style.backgroundColor = 'rgba(74, 158, 255, 0.9)';
        downloadBtn.style.transform = 'scale(1)';
    });

    container.appendChild(downloadBtn);

    // Create image element
    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.width = '100%';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.borderRadius = '8px';
    img.style.cursor = 'pointer';
    img.style.display = 'block';

    // Click to open in new tab
    img.addEventListener('click', () => {
        window.open(imageUrl, '_blank');
    });

    container.appendChild(img);

    // Add DOM widget
    const widget = node.addDOMWidget('preview', 'div', container);
    
    // Dynamic size calculation
    const nodeWidth = Math.max(node.size[0], 400);
    widget.computeSize = () => [nodeWidth - 20, 350];

    // Update node size - use current node width, don't force change
    node.size[0] = Math.max(node.size[0], 400);
    node.size[1] = Math.max(400, node.size[1]);

    node.setDirtyCanvas(true, true);
}

// Render function: Image Gallery
function renderImageGallery(node, imageUrls) {
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.padding = '10px';
    container.style.boxSizing = 'border-box';
    container.style.overflow = 'hidden';
    container.style.position = 'relative';

    // Current image index
    let currentIndex = 0;

    // Add download button (top right)
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '⬇';
    downloadBtn.title = 'Download Current Image';
    downloadBtn.style.position = 'absolute';
    downloadBtn.style.top = '15px';
    downloadBtn.style.right = '15px';
    downloadBtn.style.width = '32px';
    downloadBtn.style.height = '32px';
    downloadBtn.style.display = 'flex';
    downloadBtn.style.alignItems = 'center';
    downloadBtn.style.justifyContent = 'center';
    downloadBtn.style.backgroundColor = 'rgba(74, 158, 255, 0.9)';
    downloadBtn.style.color = 'white';
    downloadBtn.style.border = 'none';
    downloadBtn.style.borderRadius = '6px';
    downloadBtn.style.fontSize = '16px';
    downloadBtn.style.cursor = 'pointer';
    downloadBtn.style.transition = 'background-color 0.2s, transform 0.2s';
    downloadBtn.style.zIndex = '10';
    downloadBtn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

    downloadBtn.addEventListener('mouseenter', () => {
        downloadBtn.style.backgroundColor = 'rgba(58, 142, 239, 1)';
        downloadBtn.style.transform = 'scale(1.1)';
    });
    downloadBtn.addEventListener('mouseleave', () => {
        downloadBtn.style.backgroundColor = 'rgba(74, 158, 255, 0.9)';
        downloadBtn.style.transform = 'scale(1)';
    });

    downloadBtn.addEventListener('click', async () => {
        const url = imageUrls[currentIndex];
        const a = document.createElement('a');
        a.href = url;
        a.download = `wavespeed_image_${currentIndex + 1}_${Date.now()}.png`;
        a.target = '_blank';
        a.click();
    });

    container.appendChild(downloadBtn);

    // Create label
    const label = document.createElement('div');
    label.textContent = `🖼 Image Gallery (${imageUrls.length} images)`;
    label.style.marginBottom = '10px';
    label.style.fontWeight = 'bold';
    label.style.color = '#e0e0e0';
    label.style.fontSize = '16px';
    container.appendChild(label);

    // Create image display
    const imgContainer = document.createElement('div');
    imgContainer.style.position = 'relative';
    imgContainer.style.width = '100%';
    imgContainer.style.marginBottom = '10px';
    imgContainer.style.overflow = 'hidden';

    const img = document.createElement('img');
    img.src = imageUrls[currentIndex];
    img.style.width = '100%';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.borderRadius = '8px';
    img.style.cursor = 'pointer';
    img.style.display = 'block';

    // Click to open in new tab
    img.addEventListener('click', () => {
        window.open(imageUrls[currentIndex], '_blank');
    });

    imgContainer.appendChild(img);
    container.appendChild(imgContainer);

    // Create navigation controls
    if (imageUrls.length > 1) {
        const navContainer = document.createElement('div');
        navContainer.style.display = 'flex';
        navContainer.style.alignItems = 'center';
        navContainer.style.justifyContent = 'center';
        navContainer.style.gap = '15px';

        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '◀';
        prevBtn.style.padding = '8px 12px';
        prevBtn.style.backgroundColor = '#555';
        prevBtn.style.color = 'white';
        prevBtn.style.border = 'none';
        prevBtn.style.borderRadius = '4px';
        prevBtn.style.cursor = 'pointer';
        prevBtn.style.fontWeight = 'bold';

        // Index label
        const indexLabel = document.createElement('span');
        indexLabel.textContent = `${currentIndex + 1} / ${imageUrls.length}`;
        indexLabel.style.color = '#e0e0e0';
        indexLabel.style.fontWeight = 'bold';
        indexLabel.style.fontSize = '14px';

        prevBtn.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + imageUrls.length) % imageUrls.length;
            img.src = imageUrls[currentIndex];
            indexLabel.textContent = `${currentIndex + 1} / ${imageUrls.length}`;
        });

        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.textContent = '▶';
        nextBtn.style.padding = '8px 12px';
        nextBtn.style.backgroundColor = '#555';
        nextBtn.style.color = 'white';
        nextBtn.style.border = 'none';
        nextBtn.style.borderRadius = '4px';
        nextBtn.style.cursor = 'pointer';
        nextBtn.style.fontWeight = 'bold';

        nextBtn.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % imageUrls.length;
            img.src = imageUrls[currentIndex];
            indexLabel.textContent = `${currentIndex + 1} / ${imageUrls.length}`;
        });

        navContainer.appendChild(prevBtn);
        navContainer.appendChild(indexLabel);
        navContainer.appendChild(nextBtn);
        container.appendChild(navContainer);
    }

    // Add DOM widget
    const widget = node.addDOMWidget('preview', 'div', container);
    
    // Dynamic size calculation
    const nodeWidth = Math.max(node.size[0], 400);
    widget.computeSize = () => [nodeWidth - 20, 420];

    // Update node size
    node.size[0] = Math.max(node.size[0], 400);
    node.size[1] = Math.max(470, node.size[1]);

    node.setDirtyCanvas(true, true);
}

// Render function: Audio Preview
function renderAudioPreview(node, audioUrl) {
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.padding = '15px';
    container.style.boxSizing = 'border-box';
    container.style.backgroundColor = '#1a1a1a';
    container.style.borderRadius = '8px';
    container.style.position = 'relative';

    // Add download button (top right)
    const downloadBtn = document.createElement('a');
    const fileExt = audioUrl.toLowerCase().split('?')[0].split('.').pop();
    downloadBtn.href = audioUrl;
    downloadBtn.download = `audio.${fileExt}`;
    downloadBtn.target = '_blank';
    downloadBtn.textContent = '⬇';
    downloadBtn.title = 'Download Audio';
    downloadBtn.style.position = 'absolute';
    downloadBtn.style.top = '10px';
    downloadBtn.style.right = '10px';
    downloadBtn.style.width = '32px';
    downloadBtn.style.height = '32px';
    downloadBtn.style.display = 'flex';
    downloadBtn.style.alignItems = 'center';
    downloadBtn.style.justifyContent = 'center';
    downloadBtn.style.backgroundColor = 'rgba(74, 158, 255, 0.9)';
    downloadBtn.style.color = 'white';
    downloadBtn.style.textDecoration = 'none';
    downloadBtn.style.borderRadius = '6px';
    downloadBtn.style.fontSize = '16px';
    downloadBtn.style.cursor = 'pointer';
    downloadBtn.style.transition = 'background-color 0.2s, transform 0.2s';
    downloadBtn.style.zIndex = '10';
    downloadBtn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

    downloadBtn.addEventListener('mouseenter', () => {
        downloadBtn.style.backgroundColor = 'rgba(58, 142, 239, 1)';
        downloadBtn.style.transform = 'scale(1.1)';
    });
    downloadBtn.addEventListener('mouseleave', () => {
        downloadBtn.style.backgroundColor = 'rgba(74, 158, 255, 0.9)';
        downloadBtn.style.transform = 'scale(1)';
    });

    container.appendChild(downloadBtn);

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

    // Add DOM widget
    const widget = node.addDOMWidget('preview', 'div', container);
    widget.computeSize = () => [600, 200];

    // Update node size
    node.size[0] = 600;
    node.size[1] = Math.max(250, 200 + 50);

    node.setDirtyCanvas(true, true);
}

// Render function: 3D Model Preview
function render3DPreview(node, model3dUrl) {
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.padding = '10px';
    container.style.boxSizing = 'border-box';
    container.style.backgroundColor = '#1a1a1a';
    container.style.borderRadius = '8px';
    container.style.position = 'relative';

    // Check file extension
    const fileExt = model3dUrl.toLowerCase().split('?')[0].split('.').pop();

    // Add download button (top right)
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '⬇';
    downloadBtn.title = `Download ${fileExt.toUpperCase()} Model`;
    downloadBtn.style.position = 'absolute';
    downloadBtn.style.top = '15px';
    downloadBtn.style.right = '15px';
    downloadBtn.style.width = '32px';
    downloadBtn.style.height = '32px';
    downloadBtn.style.display = 'flex';
    downloadBtn.style.alignItems = 'center';
    downloadBtn.style.justifyContent = 'center';
    downloadBtn.style.backgroundColor = 'rgba(74, 158, 255, 0.9)';
    downloadBtn.style.color = 'white';
    downloadBtn.style.border = 'none';
    downloadBtn.style.borderRadius = '6px';
    downloadBtn.style.fontSize = '16px';
    downloadBtn.style.cursor = 'pointer';
    downloadBtn.style.transition = 'background-color 0.2s, transform 0.2s';
    downloadBtn.style.zIndex = '10';
    downloadBtn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

    downloadBtn.addEventListener('mouseenter', () => {
        downloadBtn.style.backgroundColor = 'rgba(58, 142, 239, 1)';
        downloadBtn.style.transform = 'scale(1.1)';
    });
    downloadBtn.addEventListener('mouseleave', () => {
        downloadBtn.style.backgroundColor = 'rgba(74, 158, 255, 0.9)';
        downloadBtn.style.transform = 'scale(1)';
    });

    downloadBtn.onclick = async () => {
        try {
            const response = await fetch(model3dUrl);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `wavespeed_3d_model_${Date.now()}.${fileExt}`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('[WaveSpeed Preview 3D] Download failed:', error);
            alert('Download failed. Please try opening the URL in a new tab.');
        }
    };

    container.appendChild(downloadBtn);

    // Create label
    const label = document.createElement('div');
    label.textContent = '🎨 3D Model Preview';
    label.style.marginBottom = '10px';
    label.style.fontWeight = 'bold';
    label.style.color = '#e0e0e0';
    label.style.fontSize = '16px';
    container.appendChild(label);

    // Create iframe container for 3D viewer
    const viewerContainer = document.createElement('div');
    viewerContainer.style.width = '100%';
    viewerContainer.style.height = '500px';
    viewerContainer.style.backgroundColor = '#2a2a2a';
    viewerContainer.style.borderRadius = '4px';
    viewerContainer.style.display = 'flex';
    viewerContainer.style.alignItems = 'center';
    viewerContainer.style.justifyContent = 'center';
    viewerContainer.style.position = 'relative';

    if (fileExt === 'glb' || fileExt === 'gltf') {
        const modelViewer = document.createElement('model-viewer');
        modelViewer.setAttribute('src', model3dUrl);
        modelViewer.setAttribute('alt', '3D Model');
        modelViewer.setAttribute('auto-rotate', '');
        modelViewer.setAttribute('camera-controls', '');
        modelViewer.setAttribute('shadow-intensity', '1');
        modelViewer.setAttribute('style', 'width: 100%; height: 100%; background-color: #2a2a2a;');

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

        if (!window.customElements.get('model-viewer')) {
            const script = document.createElement('script');
            script.type = 'module';
            script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
            document.head.appendChild(script);
        }
    } else {
        const infoText = document.createElement('div');
        infoText.style.color = '#e0e0e0';
        infoText.style.textAlign = 'center';
        infoText.style.padding = '20px';
        infoText.innerHTML = `<p>3D Model (${fileExt.toUpperCase()}) ready for download</p>`;
        viewerContainer.appendChild(infoText);
    }

    container.appendChild(viewerContainer);

    // Add DOM widget
    const widget = node.addDOMWidget('preview', 'div', container);
    widget.computeSize = () => [800, 580];

    // Update node size
    node.size[0] = 800;
    node.size[1] = Math.max(630, 580 + 50);

    node.setDirtyCanvas(true, true);
}

// Render function: Text Preview
function renderTextPreview(node, textContent) {
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.padding = '10px';
    container.style.boxSizing = 'border-box';
    container.style.position = 'relative';

    // Add download button (top right)
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '⬇';
    downloadBtn.title = 'Download Text';
    downloadBtn.style.position = 'absolute';
    downloadBtn.style.top = '15px';
    downloadBtn.style.right = '15px';
    downloadBtn.style.width = '32px';
    downloadBtn.style.height = '32px';
    downloadBtn.style.display = 'flex';
    downloadBtn.style.alignItems = 'center';
    downloadBtn.style.justifyContent = 'center';
    downloadBtn.style.backgroundColor = 'rgba(74, 158, 255, 0.9)';
    downloadBtn.style.color = 'white';
    downloadBtn.style.border = 'none';
    downloadBtn.style.borderRadius = '6px';
    downloadBtn.style.fontSize = '16px';
    downloadBtn.style.cursor = 'pointer';
    downloadBtn.style.transition = 'background-color 0.2s, transform 0.2s';
    downloadBtn.style.zIndex = '10';
    downloadBtn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

    downloadBtn.addEventListener('mouseenter', () => {
        downloadBtn.style.backgroundColor = 'rgba(58, 142, 239, 1)';
        downloadBtn.style.transform = 'scale(1.1)';
    });
    downloadBtn.addEventListener('mouseleave', () => {
        downloadBtn.style.backgroundColor = 'rgba(74, 158, 255, 0.9)';
        downloadBtn.style.transform = 'scale(1)';
    });

    downloadBtn.onclick = () => {
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wavespeed_text_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    container.appendChild(downloadBtn);

    // Create label
    const label = document.createElement('div');
    label.textContent = '📝 Text Output';
    label.style.marginBottom = '10px';
    label.style.fontWeight = 'bold';
    label.style.color = '#e0e0e0';
    label.style.fontSize = '16px';
    container.appendChild(label);

    // Create text element
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
    textEl.textContent = textContent;
    container.appendChild(textEl);

    // Add DOM widget
    const widget = node.addDOMWidget('preview', 'div', container);

    // Calculate height based on content (max 400px)
    const contentHeight = Math.min(textEl.scrollHeight, 400);
    const totalHeight = contentHeight + 60;
    widget.computeSize = () => [768, totalHeight];

    // Update node size
    node.size[0] = 768;
    node.size[1] = Math.max(totalHeight + 50, 200);

    node.setDirtyCanvas(true, true);
}

// Main extension registration
app.registerExtension({
    name: "WaveSpeedAIPreview",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "WaveSpeedAI Preview") {
            return;
        }

        // Handle onExecuted - Display media when backend returns data
        chainCallback(nodeType.prototype, "onExecuted", function (message) {
            console.log('[WaveSpeed Preview] onExecuted:', message);

            if (!message || !message.media_data || !message.media_data[0]) {
                console.log('[WaveSpeed Preview] No media data in message');
                return;
            }

            const mediaData = message.media_data[0];
            const mediaType = mediaData.type;

            console.log('[WaveSpeed Preview] Media type:', mediaType);

            // Remove old preview widget if exists
            const existingPreviewIdx = this.widgets?.findIndex(w => w.name === 'preview');
            if (existingPreviewIdx > -1) {
                this.widgets.splice(existingPreviewIdx, 1);
            }

            // Render based on media type
            switch (mediaType) {
                case 'video':
                    console.log('[WaveSpeed Preview] Rendering video:', mediaData.url);
                    renderVideoPreview(this, mediaData.url);
                    break;

                case 'image':
                    console.log('[WaveSpeed Preview] Rendering image:', mediaData.url);
                    renderImagePreview(this, mediaData.url);
                    break;

                case 'image_gallery':
                    console.log('[WaveSpeed Preview] Rendering image gallery:', mediaData.urls.length, 'images');
                    renderImageGallery(this, mediaData.urls);
                    break;

                case 'audio':
                    console.log('[WaveSpeed Preview] Rendering audio:', mediaData.url);
                    renderAudioPreview(this, mediaData.url);
                    break;

                case '3d':
                    console.log('[WaveSpeed Preview] Rendering 3D model:', mediaData.url);
                    render3DPreview(this, mediaData.url);
                    break;

                case 'text':
                    console.log('[WaveSpeed Preview] Rendering text:', mediaData.content.length, 'characters');
                    renderTextPreview(this, mediaData.content);
                    break;

                default:
                    console.warn('[WaveSpeed Preview] Unknown media type:', mediaType);
                    // Fallback to text
                    renderTextPreview(this, JSON.stringify(mediaData, null, 2));
                    break;
            }
        });
    },
});
