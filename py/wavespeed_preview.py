"""
WaveSpeed AI Universal Preview Node

Automatically detects input type (image/video/audio/3D/text) and displays appropriate preview.
Supports URL detection via Content-Type when extension is missing.
Outputs tensor for compatibility with ComfyUI native nodes.
"""

import re
import io
import requests
import torch
import numpy as np
from PIL import Image
import tempfile
import os
import cv2
from .wavespeed_api.utils import imageurl2tensor


class WaveSpeedAIPreview:
    """
    WaveSpeed AI Universal Preview Node

    Automatically detects and previews any media type from WaveSpeed AI Generate node.
    Supports: Image, Video, Audio, 3D Model, Text
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "media_input": ("*", {
                    "forceInput": True,
                    "tooltip": "Connect output from WaveSpeed AI Generate node"
                }),
            }
        }

    OUTPUT_NODE = True
    RETURN_TYPES = ("*",)
    RETURN_NAMES = ("tensor",)

    CATEGORY = "WaveSpeedAI"
    FUNCTION = "preview_universal"

    def preview_universal(self, media_input):
        """
        Universal preview function that auto-detects media type

        Args:
            media_input: Can be URL string, list of URLs, or text content

        Returns:
            UI message with media data for frontend display + tensor output
        """
        result = {
            "ui": {},
            "result": (None,)  # Default: no tensor output
        }

        # Handle None or empty input
        if media_input is None or media_input == '':
            print("[WaveSpeed Preview] No input provided")
            return result

        print(f"[WaveSpeed Preview] Input type: {type(media_input).__name__}")
        print(f"[WaveSpeed Preview] Input value: {media_input if not isinstance(media_input, (list, dict)) else f'{type(media_input).__name__}[{len(media_input)}]'}")

        output_tensor = None  # Will hold the output tensor

        # Case 1: List of URLs (multiple images)
        if isinstance(media_input, list):
            # Filter out non-string items
            url_list = [item for item in media_input if isinstance(item, str) and item.strip()]

            if not url_list:
                print("[WaveSpeed Preview] Empty list provided")
                return result

            # Check if all items are image URLs
            all_images = all(self._is_image_url(url) for url in url_list)

            if all_images and len(url_list) > 1:
                # Multiple images - show gallery
                print(f"[WaveSpeed Preview] Detected image gallery: {len(url_list)} images")
                result["ui"]["media_data"] = [{
                    "type": "image_gallery",
                    "urls": url_list
                }]
                # Convert to tensor
                output_tensor = imageurl2tensor(url_list)
            else:
                # Single item or mixed types - use first item
                media_input = url_list[0]
                print(f"[WaveSpeed Preview] Using first item from list: {media_input}")
                # Continue to URL detection below

        # Case 2: String (URL or text)
        if isinstance(media_input, str):
            media_input = media_input.strip()

            # Check if it's a URL
            if media_input.startswith(('http://', 'https://')):
                # Detect media type from URL
                media_type = self._detect_media_type_from_url(media_input)

                print(f"[WaveSpeed Preview] Detected media type: {media_type}")
                print(f"[WaveSpeed Preview] URL: {media_input}")

                result["ui"]["media_data"] = [{
                    "type": media_type,
                    "url": media_input
                }]

                # Convert to tensor based on media type
                if media_type == "image":
                    output_tensor = imageurl2tensor([media_input])
                elif media_type == "video":
                    output_tensor = self._videourl2tensor(media_input)
            else:
                # Plain text content
                print(f"[WaveSpeed Preview] Detected text content: {len(media_input)} characters")
                result["ui"]["media_data"] = [{
                    "type": "text",
                    "content": media_input
                }]

        # Case 3: Other types (convert to text)
        elif not isinstance(media_input, list):
            text_content = str(media_input)
            print(f"[WaveSpeed Preview] Converting to text: {type(media_input).__name__}")
            result["ui"]["media_data"] = [{
                "type": "text",
                "content": text_content
            }]

        # Set output tensor
        result["result"] = (output_tensor,)

        return result

    def _detect_media_type_from_url(self, url):
        """
        Detect media type from URL
        Priority: Extension check → Content-Type check → Fallback to text

        Args:
            url: Media URL

        Returns:
            Media type: 'image', 'video', 'audio', '3d', or 'text'
        """
        url_lower = url.lower()

        # Check by file extension first (fast)
        if self._is_video_url(url):
            return 'video'
        elif self._is_image_url(url):
            return 'image'
        elif self._is_audio_url(url):
            return 'audio'
        elif self._is_3d_model_url(url):
            return '3d'

        # No extension found - try Content-Type detection
        print(f"[WaveSpeed Preview] No extension detected, checking Content-Type...")
        content_type = self._get_content_type(url)

        if content_type:
            print(f"[WaveSpeed Preview] Content-Type: {content_type}")

            if content_type.startswith('video/'):
                return 'video'
            elif content_type.startswith('image/'):
                return 'image'
            elif content_type.startswith('audio/'):
                return 'audio'
            elif content_type.startswith('model/') or 'gltf' in content_type or 'glb' in content_type:
                return '3d'
            elif content_type.startswith('text/'):
                return 'text'

        # Fallback: treat as text/unknown
        print(f"[WaveSpeed Preview] Could not detect type, treating as text")
        return 'text'

    def _get_content_type(self, url):
        """
        Get Content-Type from URL via HTTP HEAD request

        Args:
            url: Media URL

        Returns:
            Content-Type string or None
        """
        try:
            import requests
            response = requests.head(url, timeout=5, allow_redirects=True)
            content_type = response.headers.get('Content-Type', '').lower()
            return content_type
        except Exception as e:
            print(f"[WaveSpeed Preview] Failed to get Content-Type: {e}")
            return None

    @staticmethod
    def _is_video_url(url):
        """Check if URL is a video"""
        if not isinstance(url, str):
            return False
        url_lower = url.lower()
        return any(ext in url_lower for ext in ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv'])

    @staticmethod
    def _is_image_url(url):
        """Check if URL is an image"""
        if not isinstance(url, str):
            return False
        url_lower = url.lower()
        return any(ext in url_lower for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'])

    @staticmethod
    def _is_audio_url(url):
        """Check if URL is audio"""
        if not isinstance(url, str):
            return False
        url_lower = url.lower()
        return any(ext in url_lower for ext in ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.aac'])

    @staticmethod
    def _is_3d_model_url(url):
        """Check if URL is a 3D model"""
        if not isinstance(url, str):
            return False
        url_lower = url.lower()
        return any(ext in url_lower for ext in ['.glb', '.gltf', '.obj', '.ply', '.fbx', '.stl', '.dae', '.3ds'])

    def _videourl2tensor(self, video_url):
        """
        Convert video URL to tensor

        Args:
            video_url: Video URL string

        Returns:
            torch.Tensor: Video tensor in shape (batch, frames, height, width, channels)
        """
        try:
            # Download video to temporary file
            print(f"[WaveSpeed Preview] Downloading video from {video_url}")
            response = requests.get(video_url, stream=True, timeout=30)
            response.raise_for_status()

            # Create temporary file
            with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as temp_file:
                temp_path = temp_file.name
                for chunk in response.iter_content(chunk_size=8192):
                    temp_file.write(chunk)

            # Read video with cv2
            cap = cv2.VideoCapture(temp_path)
            frames = []

            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                # Convert BGR to RGB
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frames.append(frame_rgb)

            cap.release()

            # Clean up temporary file
            try:
                os.unlink(temp_path)
            except:
                pass

            if not frames:
                print("[WaveSpeed Preview] No frames extracted from video")
                return None

            print(f"[WaveSpeed Preview] Extracted {len(frames)} frames from video")

            # Convert to tensor: (frames, height, width, channels) -> (batch=1, frames, height, width, channels)
            frames_array = np.array(frames, dtype=np.float32) / 255.0
            video_tensor = torch.from_numpy(frames_array).unsqueeze(0)

            return video_tensor

        except Exception as e:
            print(f"[WaveSpeed Preview] Failed to convert video URL to tensor: {e}")
            return None

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        # Always re-execute to show latest media
        return float("nan")


NODE_CLASS_MAPPINGS = {
    "WaveSpeedAI Preview": WaveSpeedAIPreview,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "WaveSpeedAI Preview": "WaveSpeedAI Preview ⚡",
}
