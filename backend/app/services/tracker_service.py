import time
from collections import defaultdict, deque

class ComponentTracker:
    def __init__(self, mode="standard"):
        self.mode = mode
        
        # Standard: {class_name: snapshot}
        # Advanced: {class_name: [snapshot1, snapshot2, ...]}
        if mode == "standard":
            self.locked_snapshots = {}
            self.locked_bboxes = {}
        else:
            self.locked_snapshots = defaultdict(list)
            self.locked_bboxes = defaultdict(list)
            
        self.locked_components = {}
        self.accumulated_counts = defaultdict(int) 
        self.gap_counts = defaultdict(int) 
        
        # Calibration: 3-Second Rule & Flicker Protection
        self.LOCK_THRESHOLD = 45 # ~3 seconds at 15 FPS
        self.MAX_GAP_TOLERANCE = 5 # Strict: must be visible consistently
        
        # Build Summary Persistence
        self.identified_details = {} # {class_name: identified_json}

    def update_details(self, class_name, details):
        """Store VLM/DB identification results for the build summary"""
        self.identified_details[class_name] = details

    def get_summary(self):
        """Return the consolidated build summary in KV format with quantities"""
        summary_obj = {}
        for class_name, details in self.identified_details.items():
            # Use the component_type or class_name as the key, standardized to uppercase
            c_type = details.get("component_type", class_name).upper()
            model = details.get("model", "Unknown")
            quantity = details.get("quantity", 1)
            
            summary_obj[c_type] = model
            if quantity > 1:
                summary_obj[f"{c_type}_quantity"] = quantity
                
        return [summary_obj]

    def process_frame(self, current_objects, frame_bytes):
        detected_classes_this_frame = set()
        filtered_objects = []
        
        locked_list = list(self.locked_components.keys())
        if locked_list:
            print(f"DEBUG: Currently Locked: {locked_list}")

        for obj in current_objects:
            class_name = obj["class"]
            
            # Filter check
            if class_name in self.locked_components:
                print(f"DEBUG: Filtering out {class_name} (Already Locked)")
                continue
                
            detected_classes_this_frame.add(class_name)
            progress = self.accumulated_counts.get(class_name, 0) / self.LOCK_THRESHOLD
            obj["status"] = f"SCANNING ({int(progress * 100)}%)"
            filtered_objects.append(obj)

        for cls_name in detected_classes_this_frame:
            # ONLY accumulate if NOT ALREADY LOCKED
            self.accumulated_counts[cls_name] += 1
            self.gap_counts[cls_name] = 0
            
            if self.accumulated_counts[cls_name] >= self.LOCK_THRESHOLD:
                # LOCK THE COMPONENT
                if self.mode == "standard":
                    self.locked_snapshots[cls_name] = frame_bytes
                else:
                    self.locked_snapshots[cls_name].append(frame_bytes)
                
                # Use unfiltered objects to find the box
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
        
        # Reset progress if component disappears for more than MAX_GAP_TOLERANCE
        for cls_name in list(self.accumulated_counts.keys()):
            if cls_name not in detected_classes_this_frame and cls_name not in self.locked_components:
                self.gap_counts[cls_name] += 1
                if self.gap_counts[cls_name] > self.MAX_GAP_TOLERANCE:
                    self.accumulated_counts[cls_name] = 0
                    self.gap_counts[cls_name] = 0
                    
        return {
            "objects": filtered_objects,
            "locked_count": len(self.locked_components),
            "locked_items": list(self.locked_components.keys())
        }

    def unlock(self, cls_name, instance=None):
        """Unlock a component to allow re-scanning"""
        if cls_name not in self.locked_components:
            return False

        if self.mode == "standard":
            if cls_name in self.locked_components:
                del self.locked_components[cls_name]
            if cls_name in self.locked_snapshots:
                del self.locked_snapshots[cls_name]
            if cls_name in self.locked_bboxes:
                del self.locked_bboxes[cls_name]
        else:
            # Advanced mode - handle specific instance if provided
            if instance is not None:
                if cls_name in self.locked_snapshots and instance < len(self.locked_snapshots[cls_name]):
                    self.locked_snapshots[cls_name].pop(instance)
                    self.locked_bboxes[cls_name].pop(instance)
                
                # If no more instances, remove from locked_components
                if cls_name in self.locked_snapshots and len(self.locked_snapshots[cls_name]) == 0:
                    del self.locked_components[cls_name]
            else:
                # Full removal for class
                if cls_name in self.locked_components: del self.locked_components[cls_name]
                if cls_name in self.locked_snapshots: del self.locked_snapshots[cls_name]
                if cls_name in self.locked_bboxes: del self.locked_bboxes[cls_name]

        # Reset accumulation
        self.accumulated_counts[cls_name] = 0
        self.gap_counts[cls_name] = 0
        return True

    def lock_manual(self, cls_name, frame_bytes, bbox):
        """Manually lock a component from an uploaded image"""
        if self.mode == "standard":
            self.locked_snapshots[cls_name] = frame_bytes
            self.locked_bboxes[cls_name] = bbox
        else:
            self.locked_snapshots[cls_name].append(frame_bytes)
            self.locked_bboxes[cls_name].append(bbox)
            
        self.locked_components[cls_name] = {
            "class": cls_name,
            "time": time.time(),
            "manual": True
        }
        return True
