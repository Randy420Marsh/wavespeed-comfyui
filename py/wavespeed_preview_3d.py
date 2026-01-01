"""
WaveSpeed AI 3D Model Preview Node

Displays 3D models from HTTP URLs (GLB, GLTF, OBJ, etc.) in a formatted preview.
This is different from ComfyUI's official Preview3D which expects local file paths.
"""


class WaveSpeedAIPreview3DModel:
    """
    WaveSpeed AI 3D Model Preview Node

    Displays 3D model files from HTTP URLs with interactive 3D viewer.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "Model_3D_URL": ("STRING", {
                    "default": "",
                    "multiline": False,
                    "forceInput": True,
                    "tooltip": "3D Model URL from WaveSpeed AI Generate node (.glb, .gltf, .obj, .ply, etc.)"
                }),
            }
        }

    OUTPUT_NODE = True
    RETURN_TYPES = ()
    RETURN_NAMES = ()

    CATEGORY = "WaveSpeedAI"
    FUNCTION = "preview_3d"

    def preview_3d(self, Model_3D_URL):
        """
        Preview 3D model from HTTP URL

        Args:
            Model_3D_URL: HTTP URL of 3D Model from WaveSpeed AI

        Returns:
            UI message with 3D model URL for frontend display
        """
        result = {
            "ui": {},
            "result": ()
        }

        # Validate 3D model URL
        if not Model_3D_URL or not Model_3D_URL.strip():
            print("[WaveSpeed Preview 3D] No 3D model URL provided")
            return result

        model_3d_url = Model_3D_URL.strip()
        print(f"[WaveSpeed Preview 3D] 3D Model URL: {model_3d_url}")

        # Return 3D model URL for display in frontend
        # Note: This is different from ComfyUI's Preview3D which expects local paths
        # Return as array to match Video Preview format
        result["ui"]["model_3d_url"] = [model_3d_url]

        return result

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        # Always re-execute to show latest 3D model
        return float("nan")


NODE_CLASS_MAPPINGS = {
    "WaveSpeedAI Preview 3D Model": WaveSpeedAIPreview3DModel,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "WaveSpeedAI Preview 3D Model": "WaveSpeedAI Preview 3D Model ⚡",
}
