"""
WaveSpeed AI Audio Preview Node

Displays audio files from HTTP URLs in a formatted preview with playback controls.
"""


class WaveSpeedAIPreviewAudio:
    """
    WaveSpeed AI Audio Preview Node

    Displays audio files from HTTP URLs with audio player controls.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "Audio_URL": ("STRING", {
                    "default": "",
                    "multiline": False,
                    "forceInput": True,
                    "tooltip": "Audio URL from WaveSpeed AI Generate node (.mp3, .wav, .m4a, .flac, etc.)"
                }),
            }
        }

    OUTPUT_NODE = True
    RETURN_TYPES = ()
    RETURN_NAMES = ()

    CATEGORY = "WaveSpeedAI"
    FUNCTION = "preview_audio"

    def preview_audio(self, Audio_URL):
        """
        Preview audio from HTTP URL

        Args:
            Audio_URL: HTTP URL of audio file from WaveSpeed AI

        Returns:
            UI message with audio URL for frontend display
        """
        result = {
            "ui": {},
            "result": ()
        }

        # Validate audio URL
        if not Audio_URL or not Audio_URL.strip():
            print("[WaveSpeed Preview Audio] No audio URL provided")
            return result

        audio_url = Audio_URL.strip()
        print(f"[WaveSpeed Preview Audio] Audio URL: {audio_url}")

        # Return audio URL for display in frontend (as array to match other preview nodes)
        result["ui"]["audio_url"] = [audio_url]

        return result

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        # Always re-execute to show latest audio
        return float("nan")


NODE_CLASS_MAPPINGS = {
    "WaveSpeedAI Preview Audio": WaveSpeedAIPreviewAudio,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "WaveSpeedAI Preview Audio": "WaveSpeedAI Preview Audio ⚡",
}
