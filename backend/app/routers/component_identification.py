import cv2
import numpy as np
import time
from collections import defaultdict, deque
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ultralytics import YOLO
import json

router = APIRouter()

# Load YOLO model once
# Ensure best.pt is reachable. Using relative path assuming run from backend root.
try:
    model = YOLO("app/routers/best.pt", task="detect")
except Exception:
    # Fallback if running from a different directory or file structure varies
    model = YOLO("best.pt", task="detect")

class ComponentTracker:
    def __init__(self):
        # Gap-Tolerant Counters
        self.accumulated_counts = defaultdict(int) # Total frames seen
        self.gap_counts = defaultdict(int)         # Consecutive missing frames
        
        # Locked components storage
        self.locked_components = {}
        
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

@router.websocket("/ws/identify")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    tracker = ComponentTracker()
    try:
        while True:
            data = await websocket.receive_bytes()
            result = tracker.process_frame(data)
            await websocket.send_json(result)
    except WebSocketDisconnect:
        # print("Client disconnected")
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except:
            pass
