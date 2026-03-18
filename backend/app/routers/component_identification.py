import io
import base64
import json
import time
import asyncio
import traceback
import os
import tempfile
import numpy as np
import cv2
import onnxruntime as ort
from PIL import Image

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Response, UploadFile, File

from app.services.tracker_service import ComponentTracker
from app.services.vision_service import call_vision_api

router = APIRouter()

DETECTION_CONFIDENCE = 0.25

# ─── ONNX Inference Engine ───────────────────────────────────────────────────
class ONNXDetector:
    def __init__(self, model_path=None):
        if model_path is None:
            # Dynamically find the model relative to this file
            base_dir = os.path.dirname(os.path.abspath(__file__))
            self.model_path = os.path.join(base_dir, "best.onnx")
        else:
            self.model_path = model_path
            
        self.session = None
        self.class_names = {0: 'CASE_FAN', 1: 'CPU', 2: 'CPU_COOLER', 3: 'GPU', 4: 'HDD', 5: 'MOTHERBOARD', 6: 'PC_CASE', 7: 'PSU', 8: 'RAM', 9: 'SSD'}
        self.load_model()

    def load_model(self):
        try:
            # Use CPU by default (lightweight)
            providers = ['CPUExecutionProvider']
            self.session = ort.InferenceSession(self.model_path, providers=providers)
            print(f"[ONNX] Model loaded successfully from {self.model_path}")
        except Exception as e:
            print(f"[ONNX] Fatal: Could not load model: {e}")

    def preprocess(self, img_bytes):
        # Convert bytes to numpy array
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None: return None, None, None
        
        # Convert BGR to RGB (YOLOv8 standard)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # YOLOv8 expects 640x640
        h, w = img.shape[:2]
        input_img = cv2.resize(img, (640, 640))
        input_img = input_img.transpose(2, 0, 1) # HWC to CHW
        input_img = input_img.astype(np.float32) / 255.0
        input_img = np.expand_dims(input_img, axis=0)
        return input_img, w, h

    def detect(self, img_bytes, confidence_threshold=0.25):
        if not self.session: return []
        
        input_tensor, orig_w, orig_h = self.preprocess(img_bytes)
        if input_tensor is None: return []

        outputs = self.session.run(None, {self.session.get_inputs()[0].name: input_tensor})
        
        # YOLOv8 Output shape: [1, 14, 8400] (4 box coords + 10 classes)
        output = outputs[0][0]
        
        # Check for [1, 14, 8400] (standard ultralytics export)
        if outputs[0].shape[1] < outputs[0].shape[2]:
             output = output.transpose() # Becomes [8400, 14]
        
        detections = []
        for row in output:
            classes_scores = row[4:]
            max_score = np.amax(classes_scores)
            
            if max_score >= confidence_threshold:
                class_id = np.argmax(classes_scores)
                
                # Box coordinates (center_x, center_y, width, height)
                cx, cy, w, h = row[:4]
                
                # Rescale to original image size
                x1 = (cx - w/2) * (orig_w / 640)
                y1 = (cy - h/2) * (orig_h / 640)
                x2 = (cx + w/2) * (orig_w / 640)
                y2 = (cy + h/2) * (orig_h / 640)
                
                detections.append({
                    "class":  self.class_names.get(class_id, "Unknown"),
                    "prob":   float(max_score),
                    "box":    [float(x1), float(y1), float(x2), float(y2)],
                    "status": "DETECTED"
                })
        
        # Simple NMS (Non-Maximum Suppression)
        detections.sort(key=lambda x: x["prob"], reverse=True)
        final_detections = []
        while detections:
            best = detections.pop(0)
            final_detections.append(best)
            detections = [d for d in detections if self.iou(best["box"], d["box"]) < 0.45]
            
        return final_detections

    def iou(self, box1, box2):
        x1 = max(box1[0], box2[0])
        y1 = max(box1[1], box2[1])
        x2 = min(box1[2], box2[2])
        y2 = min(box1[3], box2[3])
        intersection = max(0, x2 - x1) * max(0, y2 - y1)
        area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
        area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
        return intersection / (area1 + area2 - intersection + 1e-6)

# Initialize Detector
detector = ONNXDetector()

# ─── Global Tracker ────────────────────────────────────────────────────────────
global_tracker = ComponentTracker(mode="standard")


# ─── Routes ────────────────────────────────────────────────────────────────────

@router.post("/reset-session")
async def reset_session(mode: str = "standard"):
    """Reset the tracking state manually to clear previous scans."""
    global global_tracker
    global_tracker = ComponentTracker(mode=mode)
    print(f"DEBUG: Session reset manually. New mode: {mode}")
    return {"status": "session_reset", "mode": mode}


@router.websocket("/ws/identify")
async def websocket_endpoint(websocket: WebSocket, mode: str = "standard"):
    global global_tracker
    await websocket.accept()

    if global_tracker.mode != mode:
        print(f"DEBUG: Resetting tracker due to mode mismatch.")
        global_tracker = ComponentTracker(mode=mode)
    else:
        print(f"DEBUG: Reusing existing tracker for {mode} session.")

    last_tracker_results = {
        "objects": [],
        "locked_count": len(global_tracker.locked_components),
        "locked_items": list(global_tracker.locked_components.keys())
    }

    try:
        while True:
            data = await websocket.receive_bytes()
            # Perform Local Inference (Zero latency!)
            detections = detector.detect(data, DETECTION_CONFIDENCE)
            last_tracker_results = global_tracker.process_frame(detections, data)
            await websocket.send_json(last_tracker_results)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
        traceback.print_exc()
        try:
            await websocket.close()
        except:
            pass


@router.post("/identify-details")
async def identify_details(component_type: str, quantity: int = 1, instance: int = None):
    """Get detailed identification using tired identification logic (VLM)."""
    if not global_tracker:
        return {"error": "No active tracking session"}

    if instance is not None and global_tracker.mode == "advanced":
        snapshots = global_tracker.locked_snapshots.get(component_type, [])
        bboxes    = global_tracker.locked_bboxes.get(component_type, [])
        if instance >= len(snapshots):
            return {"error": "Instance not found"}
        snapshot = snapshots[instance]
        bbox     = bboxes[instance] if instance < len(bboxes) else None
    else:
        snapshot = global_tracker.locked_snapshots.get(component_type)
        bbox     = global_tracker.locked_bboxes.get(component_type)

    if not snapshot:
        return {"error": f"No snapshot for {component_type}"}

    result = await call_vision_api(snapshot, bbox, quantity=quantity)
    result["yolo_class"] = component_type
    return result


@router.post("/identify-upload")
async def identify_upload(file: UploadFile = File(...)):
    """Identify a component from an uploaded image."""
    try:
        content = await file.read()
        detections = detector.detect(content, confidence_threshold=0.15)

        if not detections:
            return {"error": "No PC component detected in the image"}

        best = max(detections, key=lambda d: d["prob"])
        
        global_tracker.lock_manual(best["class"], content, best["box"])

        return {
            "status":          "locked_manually",
            "yolo_class":      best["class"],
            "yolo_confidence": best["prob"],
            "message":         f"{best['class']} added from upload"
        }
    except Exception as e:
        return {"error": str(e)}


@router.get("/snapshot/{component_type}")
async def get_snapshot(component_type: str, instance: int = None):
    if not global_tracker:
        return {"error": "No session"}

    if instance is not None and global_tracker.mode == "advanced":
        snapshots = global_tracker.locked_snapshots.get(component_type, [])
        if instance >= len(snapshots):
            return {"error": "Index out of range"}
        image_bytes = snapshots[instance]
    else:
        image_bytes = global_tracker.locked_snapshots.get(component_type)

    if not image_bytes:
        return {"error": "No snapshot"}
    return Response(content=image_bytes, media_type="image/jpeg")
