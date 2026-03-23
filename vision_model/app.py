import gradio as gr
import numpy as np
import cv2
from ultralytics import YOLO
from PIL import Image
import json
import os

# ─── Model Loading ─────────────────────────────────────────────────────────────
# best.pt must live in the same folder as this file (Space root)
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "best.pt")
model = YOLO(MODEL_PATH, task="detect")
print(f"[Peasy-Vision] Model loaded. Classes: {model.names}")

# ─── Detection Logic ───────────────────────────────────────────────────────────
def detect_components(image: Image.Image, confidence_threshold: float = 0.25):
    """
    Input  : PIL image from Gradio
    Output : (annotated PIL image, JSON string of detections)

    JSON shape:
    {
      "detections": [
        { "class": "GPU", "confidence": 0.87, "box": { "x1":..,"y1":..,"x2":..,"y2":.. } },
        ...
      ]
    }
    """
    if image is None:
        return None, json.dumps({"error": "No image provided"})

    # PIL RGB → numpy BGR (what OpenCV/YOLO expects)
    frame = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

    results = model(frame, conf=confidence_threshold, verbose=False)

    detections = []
    for r in results:
        for box in r.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            conf       = float(box.conf[0])
            class_name = model.names[int(box.cls[0])]

            detections.append({
                "class":      class_name,
                "confidence": round(conf, 3),
                "box": {
                    "x1": round(x1, 1),
                    "y1": round(y1, 1),
                    "x2": round(x2, 1),
                    "y2": round(y2, 1),
                }
            })

            # Draw bounding box + label
            cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 80), 2)
            cv2.putText(
                frame, f"{class_name} {conf:.2f}",
                (int(x1), max(int(y1) - 8, 0)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 80), 2
            )

    annotated_pil = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    return annotated_pil, json.dumps({"detections": detections}, indent=2)

# ─── Gradio UI ─────────────────────────────────────────────────────────────────
with gr.Blocks(title="Peasy-Vision") as demo:
    gr.Markdown(
        "## 🔧 Peasy-Vision — PC Component Detector\n"
        "Upload a photo of a PC component. The model returns bounding boxes and a JSON list of detected parts."
    )
    with gr.Row():
        with gr.Column():
            input_image = gr.Image(type="pil", label="Input Image")
            conf_slider  = gr.Slider(0.10, 0.90, value=0.25, step=0.05, label="Confidence Threshold")
            detect_btn   = gr.Button("Detect Components", variant="primary")
        with gr.Column():
            output_image = gr.Image(type="pil", label="Annotated Result")
            output_json  = gr.JSON(label="Detections")

    detect_btn.click(
        fn=detect_components,
        inputs=[input_image, conf_slider],
        outputs=[output_image, output_json],
    )

# ─── Entry Point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    demo.launch()

