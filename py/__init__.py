from .nodes import WanImage2VideoNode, WanText2VideoNode, WanLoras, FluxLoras, FluxText2Image, FluxImage2Image, MinimaxImage2VideoNode,PreviewVideo, WaveSpeedAIAPIClient
from .nodes import WaveSpeedAIAPIClient, WanText2VideoNode, WanImage2VideoNode, FluxText2Image, FluxImage2Image, WanLoras, FluxLoras, MinimaxImage2VideoNode, PreviewVideo

NODE_CLASS_MAPPINGS = {
    'WaveSpeedAI Client': WaveSpeedAIAPIClient,
    'WaveSpeedAI Wan Text2Video': WanText2VideoNode,
    'WaveSpeedAI Wan Image2Video': WanImage2VideoNode,
    'WaveSpeedAI Flux Text2Image': FluxText2Image,
    'WaveSpeedAI Flux Image2Image': FluxImage2Image,
    'WaveSpeedAI Wan Loras': WanLoras,
    'WaveSpeedAI Flux Loras': FluxLoras,
    'WaveSpeedAI Minimax Image2Video': MinimaxImage2VideoNode,
    'WaveSpeedAI Preview Video': PreviewVideo,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    'WaveSpeedAI Client': 'WaveSpeedAI WaveSpeedAI Client',
    'WaveSpeedAI Wan Text2Video': 'WaveSpeedAI Wan Text2Video',
    'WaveSpeedAI Wan Image2Video': 'WaveSpeedAI Wan Image2Video',
    'WaveSpeedAI Flux Text2Image': 'WaveSpeedAI Flux Text2Image',
    'WaveSpeedAI Flux Image2Image': 'WaveSpeedAI Flux Image2Image',
    'WaveSpeedAI Wan Loras': 'WaveSpeedAI Wan Loras',
    'WaveSpeedAI Flux Loras': 'WaveSpeedAI Flux Loras',
    'WaveSpeedAI Minimax Image2Video': 'WaveSpeedAI Minimax Image2Video',
    'WaveSpeedAI Preview Video': 'WaveSpeedAI Preview Video',
}
