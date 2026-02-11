import cv2
import numpy as np
import time
from collections import defaultdict, deque
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Response
from ultralytics import YOLO
import json
import asyncio
import traceback

router = APIRouter()

# Load YOLO model once
# Ensure best.pt is reachable. Using relative path assuming run from backend root.
try:
    model = YOLO("app/routers/best.pt", task="detect")
except Exception:
    # Fallback if running from a different directory or file structure varies
    model = YOLO("best.pt", task="detect")

# Vision API Configuration
import os
import base64
import io
from PIL import Image
from openai import AsyncOpenAI
# OpenRouter / NVIDIA Nemotron configuration
vision_api_key = os.getenv("OPENROUTER_API_KEY", "")
vision_base_url = "https://openrouter.ai/api/v1"

# Initialize client for OpenRouter
vision_client = AsyncOpenAI(
    api_key=vision_api_key,
    base_url=vision_base_url,
    default_headers={
        "HTTP-Referer": "http://localhost:5173", # Required by some OpenRouter partners
        "X-Title": "PeasyApp",
    }
)

# Model configuration: Using Google Gemma 3 27B (Largest/Smartest Free Vision Model)
VISION_MODEL = "google/gemma-3-27b-it:free"

# Stage 1: Visual Description (Forces the model to LOOK at features)
STAGE1_DESCRIBE_PROMPT = """You are a PC hardware visual analyst. 
Describe the physical characteristics of the computer component in the image with extreme precision.

Look for and describe:
1. **Silhouettes**: Shape of the shroud, dimensions.
2. **Fans**: Number of fans, fan blade pattern, presence of center-hub logos.
3. **Connectors**: PCIe pins, power cables (6/8/12/16-pin), I/O port layout.
4. **Logos & Text**: Any text on stickers, PCB, or heat sink (e.g., 'ROG', 'TUF', 'OC', 'Gaming').
5. **Color & Materials**: Heatsink color, backplate design, RGB elements.

Do NOT provide a product name yet. Just provide a detailed physical description."""

# Stage 2: Product Identification (The Brain)
STAGE2_IDENTIFY_PROMPT = """You are a PC hardware expert. 
Based on the image provided AND the visual description below, identify the EXACT computer component model.

VISUAL DESCRIPTION:
{description}

TASKS:
1. Identify the component TYPE (e.g. GPU, RAM, Motherboard).
2. Identify the BRAND and SUB-BRAND.
3. Identify the EXACT MODEL NAME (e.g. 'ROG STRIX RTX 4080 SUPER').

Return the result strictly in JSON format:
{{
  "component_type": "",
  "brand": "",
  "sub_brand": "",
  "model": "",
  "confidence": 0.0,
  "evidence": {{
    "visual_description_used": "{description_summary}",
    "key_identifying_feature": "e.g. triple fan pattern with ROG logo"
  }},
  "notes": "Summarize why you identified it this way"
}}"""

def resize_image(image_bytes: bytes, max_size=1024) -> bytes:
    """Resize image to max_size for high-resolution OCR tasks"""
    img = Image.open(io.BytesIO(image_bytes))
    img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    
    output = io.BytesIO()
    img.save(output, format='JPEG', quality=85)
    return output.getvalue()

def crop_to_bbox(image_bytes: bytes, bbox: list) -> bytes:
    """Crop image to bounding box region"""
    img = Image.open(io.BytesIO(image_bytes))
    x1, y1, x2, y2 = [int(coord) for coord in bbox]
    cropped = img.crop((x1, y1, x2, y2))
    
    output = io.BytesIO()
    cropped.save(output, format='JPEG', quality=85)
    return output.getvalue()

async def call_vision_api(image_bytes: bytes, bbox: list = None, quantity: int = 1) -> dict:
    """Call Vision API (NVIDIA/OpenRouter) with optimized image and retry logic"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Optimize image: crop if bbox provided, then resize
            if bbox:
                image_bytes_processed = crop_to_bbox(image_bytes, bbox)
            else:
                image_bytes_processed = image_bytes
            image_bytes_processed = resize_image(image_bytes_processed)
            
            # Encode to base64
            b64_image = base64.b64encode(image_bytes_processed).decode()
            
            # Call Vision API (Attempt {attempt+1})
            
            # STAGE 1: Describe
            describe_response = await vision_client.chat.completions.create(
                model=VISION_MODEL,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": STAGE1_DESCRIBE_PROMPT},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"}}
                    ]
                }],
                max_tokens=400,
                temperature=0.3
            )
            visual_description = describe_response.choices[0].message.content
            print(f"DEBUG: Stage 1 Description: {visual_description[:200]}...")

            # STAGE 2: Identify (Using description + original image for context)
            prompt_stage2 = STAGE2_IDENTIFY_PROMPT.format(
                description=visual_description,
                description_summary=visual_description[:100] + "..."
            )
            if quantity > 1:
                prompt_stage2 += f"\n\nNOTE: The user has indicated there are {quantity} of this component in their build. Please identify this component accordingly."
            
            response = await vision_client.chat.completions.create(
                model=VISION_MODEL,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt_stage2},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"}}
                    ]
                }],
                max_tokens=600,
                temperature=0.1 # Very low temp for JSON consistency
            )
            
            content = response.choices[0].message.content
            print(f"DEBUG (Attempt {attempt+1}): Stage 2 Content: '{content}'")
            
            if not content:
                if attempt < max_retries - 1:
                    print(f"RETRY: Empty content on attempt {attempt+1}, retrying...")
                    await asyncio.sleep(1) # Simple backoff
                    continue
                return {"error": "Empty response from Vision API after retries", "raw_response": str(response)}

            # Try to parse directly first
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                import re
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    try:
                        return json.loads(json_match.group())
                    except json.JSONDecodeError:
                        pass
                
                return {
                    "error": "Failed to parse JSON from response",
                    "raw_content": content,
                    "component_type": "unknown",
                    "brand": "unknown",
                    "model": "unknown",
                    "confidence": 0.0
                }
                
        except Exception as e:
            error_str = str(e).lower()
            if "429" in error_str or "rate limit" in error_str:
                if attempt < max_retries - 1:
                    wait_time = 10  # Long wait for rate limits
                    print(f"RATE LIMIT (429): Waiting {wait_time}s before retry {attempt+2}...")
                    await asyncio.sleep(wait_time)
                    continue
            
            if attempt < max_retries - 1:
                print(f"RETRY: Exception on attempt {attempt+1}: {e}")
                await asyncio.sleep(2)
                continue
            import traceback
            traceback.print_exc()
            return {
                "error": str(e),
                "component_type": "unknown",
                "brand": "unknown",
                "model": "unknown",
                "confidence": 0.0
            }
    return {"error": "Maximum retries exceeded"}


class ComponentTracker:
    def __init__(self, mode="standard"):
        self.mode = mode
        # Gap-Tolerant Counters
        self.accumulated_counts = defaultdict(int) # Total frames seen
        self.gap_counts = defaultdict(int)         # Consecutive missing frames
        
        # Locked components storage
        self.locked_components = {}
        
        # Snapshot storage (for Vision API)
        # Standard: {class_name: frame_bytes}
        # Advanced: {class_name: [frame_bytes, ...]}
        self.locked_snapshots = {} if mode == "standard" else defaultdict(list)
        self.locked_bboxes = {} if mode == "standard" else defaultdict(list)
        
        # Thresholds
        self.MIN_AVG_CONF = 0.60 # Slightly lower to catch blurry frames better
        self.LOCK_THRESHOLD = 30 # ~3 seconds of accumulation
        self.MAX_GAP_TOLERANCE = 10 # ~1 second tolerance for interruptions

    def process_frame(self, frame_bytes: bytes):
        # Decode image
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            return {"error": "Failed to decode frame"}

        # Run detection ONLY (No Tracking)
        results = model.predict(
            frame,
            verbose=False,
            conf=0.5
        )

        current_objects = []
        detected_classes_this_frame = set()

        for r in results:
            if r.boxes is None:
                continue

            boxes = r.boxes.xyxy.cpu().numpy()
            confidences = r.boxes.conf.cpu().numpy()
            classes = r.boxes.cls.cpu().numpy()

            for box, conf, cls in zip(boxes, confidences, classes):
                confidence = float(conf)
                class_name = model.names[int(cls)]
                
                # Only consider high confidence
                if confidence >= self.MIN_AVG_CONF:
                    detected_classes_this_frame.add(class_name)

                # Determine status
                is_locked = class_name in self.locked_components
                status = "LOCKED" if is_locked else "SEARCHING"
                
                current_objects.append({
                    "id": str(class_name),
                    "class": class_name,
                    "prob": confidence,
                    "box": [float(x) for x in box],
                    "status": status
                })

        # --- Gap-Tolerant Logic ---
        
        # 1. Handle Present Classes
        for cls_name in detected_classes_this_frame:
            # Increment accumulator
            self.accumulated_counts[cls_name] += 1
            # Reset gap counter because we saw it
            self.gap_counts[cls_name] = 0
            
            # Check for Lock
            if self.accumulated_counts[cls_name] >= self.LOCK_THRESHOLD:
                if cls_name not in self.locked_components:
                    # Capture snapshot for Vision API
                    if self.mode == "standard":
                        self.locked_snapshots[cls_name] = frame_bytes
                    else:
                        self.locked_snapshots[cls_name].append(frame_bytes)
                    
                    # Find and store bounding box for this class
                    for obj in current_objects:
                        if obj["class"] == cls_name:
                            if self.mode == "standard":
                                self.locked_bboxes[cls_name] = obj["box"]
                            else:
                                self.locked_bboxes[cls_name].append(obj["box"])
                            break
                    
                    self.locked_components[cls_name] = {
                        "class": cls_name,
                        "time": time.time()
                    }
        # 2. Handle Missing Classes (that have some progress)
        # We check all classes that have ever been seen (in accumulated_counts)
        for cls_name in list(self.accumulated_counts.keys()):
            if cls_name not in detected_classes_this_frame:
                # Increment gap
                self.gap_counts[cls_name] += 1
                
                # Check tolerance
                if self.gap_counts[cls_name] > self.MAX_GAP_TOLERANCE:
                    # Too long of a break? Reset progress.
                    self.accumulated_counts[cls_name] = 0
                    self.gap_counts[cls_name] = 0
                    
        return {
            "objects": current_objects,
            "locked_count": len(self.locked_components), # Total unique items found ever
            "locked_items": list(self.locked_components.keys())
        }

# Global tracker instance (shared across requests)
global_tracker = None

@router.websocket("/ws/identify")
async def websocket_endpoint(websocket: WebSocket, mode: str = "standard"):
    global global_tracker
    await websocket.accept()
    tracker = ComponentTracker(mode=mode)
    global_tracker = tracker  # Store for REST endpoint access
    try:
        while True:
            data = await websocket.receive_bytes()
            result = tracker.process_frame(data)
            await websocket.send_json(result)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except:
            pass

@router.post("/identify-details")
async def identify_details(component_type: str, quantity: int = 1, instance: int = None):
    """Get detailed identification for a locked component using Vision API"""
    if not global_tracker:
        return {"error": "No active tracking session"}
    
    # Handle Advanced Mode (instance provided)
    if instance is not None and global_tracker.mode == "advanced":
        snapshots = global_tracker.locked_snapshots.get(component_type, [])
        bboxes = global_tracker.locked_bboxes.get(component_type, [])
        
        if instance >= len(snapshots):
            return {"error": f"Instance {instance} not found for {component_type}"}
        
        snapshot = snapshots[instance]
        bbox = bboxes[instance] if instance < len(bboxes) else None
    else:
        # Standard Mode
        snapshot = global_tracker.locked_snapshots.get(component_type)
        bbox = global_tracker.locked_bboxes.get(component_type)
    
    if not snapshot:
        return {"error": f"No snapshot found for {component_type}"}
    
    # Call Vision API with optimized image and quantity
    result = await call_vision_api(snapshot, bbox, quantity=quantity)
    result["yolo_class"] = component_type  # Include original YOLO classification
    
    return result

@router.post("/add-instance")
async def add_instance(component_type: str):
    """Allow re-scanning a component to add another instance (Advanced mode)"""
    global global_tracker
    if not global_tracker or global_tracker.mode != "advanced":
        return {"error": "Only available in Advanced mode with active session"}
    
    # Reset progress for this class to allow it to be locked again
    # We remove it from locked_components so the locker logic triggers again
    if component_type in global_tracker.locked_components:
        del global_tracker.locked_components[component_type]
    
    global_tracker.accumulated_counts[component_type] = 0
    global_tracker.gap_counts[component_type] = 0
    
    return {"status": "ready_to_scan", "component": component_type}
@router.get("/snapshot/{component_type}")
async def get_snapshot(component_type: str, instance: int = None):
    """Retrieve the captured snapshot for a component"""
    if not global_tracker:
        return {"error": "No active tracking session"}
    
    if instance is not None and global_tracker.mode == "advanced":
        snapshots = global_tracker.locked_snapshots.get(component_type, [])
        if instance >= len(snapshots):
            return {"error": f"Instance {instance} not found for {component_type}"}
        image_bytes = snapshots[instance]
    else:
        image_bytes = global_tracker.locked_snapshots.get(component_type)
        
    if not image_bytes:
        return {"error": f"No snapshot found for {component_type}"}
        
    return Response(content=image_bytes, media_type="image/jpeg")
