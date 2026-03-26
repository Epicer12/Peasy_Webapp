import io
import base64
import json
import time
import asyncio
import traceback
import os
import httpx
from PIL import Image

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Response, UploadFile, File

from app.services.tracker_service import ComponentTracker
from app.services.vision_service import call_vision_api

router = APIRouter()

DETECTION_CONFIDENCE = 0.25

async def detect_via_hf(img_bytes, confidence_threshold=0.25):
    """Call the remote Hugging Face Space for component detection."""
    url = f"https://hasun20-peasy-vision.hf.space/detect?confidence={confidence_threshold}"
    
    try:
        # Pre-process image: ensure RGB and reasonable size for HF Space (avoids 500 errors)
        img = Image.open(io.BytesIO(img_bytes))
        orig_w, orig_h = img.size
        
        # Convert to RGB if necessary (handles RGBA, CMYK etc.)
        if img.mode != "RGB":
            img = img.convert("RGB")
            
        # Resize if too large (HF Space has limited resources)
        MAX_SIZE = 1024
        sent_w, sent_h = orig_w, orig_h
        if max(orig_w, orig_h) > MAX_SIZE:
            ratio = MAX_SIZE / max(orig_w, orig_h)
            sent_w, sent_h = int(orig_w * ratio), int(orig_h * ratio)
            img = img.resize((sent_w, sent_h), Image.Resampling.LANCZOS)
            
        # Prepare processed image bytes
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        processed_bytes = buf.getvalue()
        
        async with httpx.AsyncClient(timeout=30) as client:
            files = {'file': ('image.jpg', processed_bytes, 'image/jpeg')}
            response = await client.post(url, files=files)
            
            if response.status_code != 200:
                print(f"[HF-Space] Error {response.status_code}: {response.text}")
                response.raise_for_status()
                
            data = response.json()
            
            # Map and rescale detections
            raw_detections = data.get("detections", [])
            detections = []
            
            # Scaling factors
            scale_x = orig_w / sent_w
            scale_y = orig_h / sent_h
            
            for d in raw_detections:
                box_dict = d.get("box", {})
                detections.append({
                    "class": d.get("class"),
                    "prob": d.get("confidence"),
                    "box": [
                        float(box_dict.get("x1", 0)) * scale_x,
                        float(box_dict.get("y1", 0)) * scale_y,
                        float(box_dict.get("x2", 0)) * scale_x,
                        float(box_dict.get("y2", 0)) * scale_y
                    ],
                    "status": "DETECTED"
                })
            return detections
            
    except Exception as e:
        print(f"[HF-Space] Detection error: {e}")
        # Only print traceback for non-HTTP errors to avoid cluttering logs
        if not isinstance(e, httpx.HTTPStatusError):
            traceback.print_exc()
        return []

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
            # Perform Remote Inference
            detections = await detect_via_hf(data, DETECTION_CONFIDENCE)
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
        detections = await detect_via_hf(content, confidence_threshold=0.15)

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
