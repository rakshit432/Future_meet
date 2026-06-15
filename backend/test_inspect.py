from vision_agents.plugins.gemini import Realtime
import inspect
print(inspect.signature(Realtime.__init__))
module = inspect.getmodule(Realtime)
for key, value in module.__dict__.items():
    if "MODEL" in key or "model" in key:
        print(f"{key}: {value}")
