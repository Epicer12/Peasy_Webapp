import cv2
import numpy as np
import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Response, UploadFile, File
from ultralytics import YOLO
import json
import asyncio
import traceback
import os

from app.services.tracker_service import ComponentTracker
from app.services.vision_service import call_vision_api, call_serpapi

router = APIRouter()

# Load YOLO model once
# Using absolute path relative to this file for robustness
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(CURRENT_DIR, "best.pt")

try:
    model = YOLO(MODEL_PATH, task="detect")
except Exception as e:
    print(f"WARNING: Could not load model from {MODEL_PATH}: {e}")
    # Final fallback to current working directory
    model = YOLO("best.pt", task="detect")

# Global tracker instance
global_tracker = ComponentTracker(mode="standard")

@router.post("/reset-session")
async def reset_session(mode: str = "standard"):
    """Reset the tracking state manually to clear previous scans"""
    global global_tracker
    global_tracker = ComponentTracker(mode=mode)
    print(f"DEBUG: Session reset manually. New mode: {mode}")
    return {"status": "session_reset", "mode": mode}

@router.websocket("/ws/identify")
async def websocket_endpoint(websocket: WebSocket, mode: str = "standard"):
    global global_tracker
    await websocket.accept()
    
    # Reuse tracker if mode is the same to persist state across flickers
    if global_tracker.mode != mode:
        print(f"DEBUG: Resetting tracker due to mode mismatch.")
        global_tracker = ComponentTracker(mode=mode)
    else:
        print(f"DEBUG: Reusing existing tracker for {mode} session.")
    
    try:
        while True:
            data = await websocket.receive_bytes()
            nparr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                # Still send a response to keep the client loop (sendFrame -> onmessage) alive
                await websocket.send_json({
                    "objects": [],
                    "locked_count": len(global_tracker.locked_components) if global_tracker else 0,
                    "locked_items": list(global_tracker.locked_components.keys()) if global_tracker else []
                })
                continue

            results = model(frame, conf=0.25, verbose=False)
            current_objects = []
            
            for r in results:
                boxes = r.boxes
                for box in boxes:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    conf = float(box.conf[0])
                    cls = int(box.cls[0])
                    class_name = model.names[cls]
                    
                    current_objects.append({
                        "class": class_name,
                        "prob": conf,
                        "box": [float(x1), float(y1), float(x2), float(y2)],
                        "status": "DETECTED"
                    })

            # Process frame using tracker service
            tracker_results = global_tracker.process_frame(current_objects, data)
            await websocket.send_json(tracker_results)
            
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
    """Get detailed identification using tiered identification logic"""
    if not global_tracker:
        return {"error": "No active tracking session"}
    
    # Snapshot retrieval
    if instance is not None and global_tracker.mode == "advanced":
        snapshots = global_tracker.locked_snapshots.get(component_type, [])
        bboxes = global_tracker.locked_bboxes.get(component_type, [])
        if instance >= len(snapshots):
            return {"error": "Instance not found"}
        snapshot = snapshots[instance]
        bbox = bboxes[instance] if instance < len(bboxes) else None
    else:
        snapshot = global_tracker.locked_snapshots.get(component_type)
        bbox = global_tracker.locked_bboxes.get(component_type)
    
    if not snapshot:
        return {"error": f"No snapshot for {component_type}"}

    # Tiered Identification Logic: VLM (Tier 1) -> Visual Search (Tier 2)
    result = await call_vision_api(snapshot, bbox, quantity=quantity)
    
    # is_ocr_verified = result.get("is_ocr_confirmed", False)
    # is_high_conf = result.get("confidence", 0) >= 0.90
    # is_uncertain = result.get("is_uncertain", False)

    # # Trigger Tier 2 ONLY if Tier 1 is genuinely uncertain AND lacks OCR
    # if (not is_ocr_verified and (is_uncertain or not is_high_conf)):
    #     print(f"Tier 1 uncertain for {component_type}. Triggering Tier 2 (SerpAPI)...")
    #     serp_result = await call_serpapi(snapshot)
        
    #     if "error" not in serp_result:
    #         # Clear previous Tier 1 errors if Tier 2 found a result
    #         if "error" in result:
    #             result.pop("error")
            
    #         result["model"] = serp_result["model"]
    #         result["notes"] = f"{serp_result.get('notes', '')} (Verified by Visual Search)"
    #         result["confidence"] = serp_result.get("confidence", 0.95)
    #         result["is_uncertain"] = False
    #         result["tier_used"] = "Tier 2 (Google Lens)"
    #     else:
    #         result["tier_used"] = "Tier 1 (Uncertain Fallback)"
    # else:
    #     result["tier_used"] = "Tier 1 (VLM - OCR Verified)"
    result["tier_used"] = "Tier 1 (VLM Only - SerpAPI Disabled)"

    result["yolo_class"] = component_type
    
    # PERSIST: Save identification result for the final build summary
    if "error" not in result:
        result["quantity"] = quantity # Ensure quantity is persisted
        global_tracker.update_details(component_type, result)
        
    return result

@router.get("/final-build-summary")
async def get_build_summary():
    """Retrieve the consolidated list of all identified components in KV format"""
    if not global_tracker:
        return [{}]
    return global_tracker.get_summary()

def generate_build_json():
    """Literal function to return current component list as JSON string in KV format"""
    summary = global_tracker.get_summary() if global_tracker else [{}]
    return json.dumps(summary, indent=2)

@router.post("/add-instance")
async def add_instance(component_type: str):
    global global_tracker
    if not global_tracker or global_tracker.mode != "advanced":
        return {"error": "Only available in Advanced mode"}
    
    # This is effectively "resetting" that class to allow a new scan
    global_tracker.unlock(component_type)
    return {"status": "ready_to_scan", "component": component_type}

@router.post("/unlock-component")
async def unlock_component(component_type: str, instance: int = None):
    """Unlock a component manually for editing/re-scanning"""
    if not global_tracker:
        return {"error": "No active tracking session"}
    
    success = global_tracker.unlock(component_type, instance)
    if success:
        return {"status": "unlocked", "component": component_type, "instance": instance}
    return {"error": "Could not unlock component"}

@router.post("/identify-upload")
async def identify_upload(file: UploadFile = File(...)):
    """Identify a component from an uploaded image and lock it in tracker"""
    try:
        content = await file.read()
        nparr = np.frombuffer(content, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return {"error": "Invalid image file"}

        # 1. Category Detection (YOLO)
        results = model(frame, conf=0.15, verbose=False)
        detected_comp = "UNKNOWN"
        best_bbox = [0, 0, frame.shape[1], frame.shape[0]] # Full image by default
        best_conf = 0

        for r in results:
            for box in r.boxes:
                conf = float(box.conf[0])
                if conf > best_conf:
                    best_conf = conf
                    cls = int(box.cls[0])
                    detected_comp = model.names[cls]
                    best_bbox = box.xyxy[0].tolist()

        if detected_comp == "UNKNOWN":
            return {"error": "No PC component detected in the image"}

        # 2. Lock in Tracker (Unified Flow)
        # We store the uploaded image bytes as the snapshot for this class
        global_tracker.lock_manual(detected_comp, content, best_bbox)
        
        return {
            "status": "locked_manually",
            "yolo_class": detected_comp,
            "yolo_confidence": best_conf,
            "message": f"{detected_comp} added from upload"
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
