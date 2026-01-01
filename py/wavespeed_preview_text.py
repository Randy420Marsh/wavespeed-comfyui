"""
WaveSpeed AI Text Preview Node

Displays text content in a formatted, readable preview.
"""


class WaveSpeedAIPreviewText:
    """
    WaveSpeed AI Text Preview Node

    Displays text content with formatted preview.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "Text": ("STRING", {
                    "default": "",
                    "multiline": True,
                    "forceInput": True,
                    "tooltip": "Text content from WaveSpeed AI Generate node"
                }),
            }
        }

    OUTPUT_NODE = True
    RETURN_TYPES = ()
    RETURN_NAMES = ()

    CATEGORY = "WaveSpeedAI"
    FUNCTION = "preview_text"

    def preview_text(self, Text):
        """
        Preview text content

        Args:
            Text: Text content from WaveSpeed AI

        Returns:
            UI message with text content for frontend display
        """
        result = {
            "ui": {},
            "result": ()
        }

        # Validate text content
        if not Text or not Text.strip():
            print("[WaveSpeed Preview Text] No text content provided")
            return result

        text_content = Text.strip()
        print(f"[WaveSpeed Preview Text] Text: {text_content[:100]}...")

        # Return text content for display in frontend (as array to match other preview nodes)
        result["ui"]["text_content"] = [text_content]

        return result

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        # Always re-execute to show latest text
        return float("nan")


NODE_CLASS_MAPPINGS = {
    "WaveSpeedAI Preview Text": WaveSpeedAIPreviewText,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "WaveSpeedAI Preview Text": "WaveSpeedAI Preview Text ⚡",
}
