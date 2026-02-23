from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
import cv2
import numpy as np
import time
import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# ---------------------------------------------------------
# GROQ CLIENT
# ---------------------------------------------------------
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# ---------------------------------------------------------
# DIAGNOSTIC DATA
# ---------------------------------------------------------
DIAGNOSTIC_DATA = {
    "Dell OptiPlex (2020-2025)": {
        "1, 1": {"prob": "TPM Detection Failure", "fix": "Contact Dell technical support."},
        "1, 2": {"prob": "Unrecoverable SPI Flash Failure", "fix": "Contact Dell technical support."},
        "1, 5": {"prob": "i-Fuse Failure. Embedded Controller (EC) unable to program i-Fuse", "fix": "Contact Dell technical support."},
        "1, 6": {"prob": "EC internal Failure. Generic catch-all for ungrateful EC code flow errors", "fix": "Drain flea power (hold power button for 15s)."},
        "2, 1": {"prob": "CPU Failure", "fix": "Run Intel CPU diagnostic tools or contact support."},
        "2, 2": {"prob": "Bad Motherboard, Power Supply, or Power Supply cabling", "fix": "Flash the latest BIOS version. If persists,  Contact Dell technical support.."},
        "2, 3": {"prob": "No Memory/RAM detected", "fix": "Narrow down the issue by reseating the memory and swapping a known working memory module, if available. If nothing works, Contact Dell technical support"},
        "2, 4": {"prob": "Memory (RAM) Failure", "fix": "Swap with a known good DIMM."},
        "2, 5": {"prob": "Invalid Memory installed", "fix": "Narrow down the issue by swapping a known good DIMM, if available.If nothing works, contact Dell technical support."},
        "2, 6": {"prob": "Motherboard or Chipset Error", "fix": "Flash latest BIOS."},
        "2, 7": {"prob": "LCD Failure (SBIOS message)", "fix": "Flash BIOS. If the problem persists, Contact Dell technical support."},
        "2, 8": {"prob": "LCD Failure - EC detection of Power Rail failure", "fix": "Contact Dell technical support."},
        "3, 1": {"prob": "Real-Time Clock (RTC) Power Failure Complementary Metal-Oxide-Semiconductor (CMOS) Battery Failure", "fix": "Narrow down the issue by swapping a known good CMOS battery, if available.If nothing works, contact Dell technical support."},
        "3, 2": {"prob": "PCI/Video card Failure", "fix": "Reseat GPU. If nothing works, contact Dell technical support."},
        "3, 3": {"prob": "BIOS Recovery 1: Image not found", "fix": "Flash latest BIOS version.If the problem persists, Contact Dell technical support."},
        "3, 4": {"prob": "BIOS Recovery 2: Image invalid", "fix": "Flash latest BIOS version.If the problem persists, Contact Dell technical support."},
        "3, 5": {"prob": "Power Rail Failure:  EC ran into a power sequencing failure.", "fix": "Flash latest BIOS version. Contact Dell support."},
        "3, 6": {"prob": "Paid SPI Volume Error", "fix": "Flash latest BIOS version.If the problem persists, Contact Dell technical support."},
        "4, 1": {"prob": "Memory DIMM Power Rail Failure", "fix": "Contact Dell technical support."},
        "4, 2": {"prob": "CPU Power cable issue", "fix": "Run PSU BIST test."}
    },
    "Dell OptiPlex (Legacy 2012-2020)": {
        "2, 1": {"prob": "Bad Motherboard", "fix": "Replace motherboard."},
        "2, 2": {"prob": "Bad Motherboard, Power Supply, or Power Supply cabling", "fix": "Narrow down the issue with PSU BIST Test, and reseat the cable.If nothing works, replace the motherboard, power supply, or cabling.."},
        "2, 3": {"prob": "Bad Motherboard, Memory, or Processor", "fix": "Narrow down the issue by reseating the memory and swapping a known working memory module, if available.If nothing works, replace the motherboard, memory, or processor."},
        "2, 4": {"prob": "Bad coin-cell battery", "fix": "Narrow down the issue by swapping a known good coin-cell battery, if available.If nothing works, replace the coin-cell battery."},
        "2, 5": {"prob": "BIOS Checksum Failure", "fix": "The computer is in Recovery Mode.Flash latest BIOS version. If the problem persists, replace the motherboard."},
        "2, 6": {"prob": "Bad Processor", "fix": "CPU configuration activity is in progress, or a CPU failure was detected. Replace the processor."},
        "2, 7": {"prob": "Memory Faliure", "fix": "The activity of the memory subsystem configuration is in progress. Appropriate memory modules were detected, but a memory failure has occurred.Narrow down the issue by reseating the memory modules and swapping in known good modules, if available.If nothing works, replace the memory."},
        "3, 1": {"prob": "PCI/Video subsystem failure", "fix": "PCI device configuration activity is in progress, or PCI device failure was detected.Narrow down the issue by reseating the PCI cards, and removing them one by one to determine which card failed.Identify if it is the PCI card that is failed, replace the PCI card.If none of the PCI Cards failed, replace the motherboard."},
        "3, 2": {"prob": "Video Subsystem failure", "fix": "Video subsystem configuration shows that activity is in progress or there is a video subsystem failure.Narrow down the issue by removing graphics cards one by one to determine which card failed.If you can identify the card that failed, replace that card. If none of the cards failed, replace the motherboard."},
        "3, 3": {"prob": "No Memory detected", "fix": "Narrow down the issue by removing the memory modules one by one to determine which module failed. Swap the failed module with a known good module, if available, to confirm.If you can identify the faulty module, replace it.If none of the modules have failed, replace the motherboard."},
        "3, 4": {"prob": "Storage Subsystem failure", "fix": "It could be storage device configuration in progress or a storage subsystem failure.Narrow down the issue by removing all attached storage devices from the motherboard one by one to determine which device failed.If you can identify which storage device failed, replace it.If none of the storage devices failed, replace the motherboard."},
        "3, 5": {"prob": "Memory configuration or incompatible error", "fix": "The memory subsystem configuration shows activity in progress. No memory modules were detected.Narrow down the issue by removing the memory modules one by one on to determine which module failed. Combine configurations to validate the appropriate combination.If you can identify the failed component, replace the component.If none of the components failed, replace the motherboard."},
        "3, 6": {"prob": "System board failure", "fix": "Fatal system board failure was detected. Narrow down the issue by removing the components on the motherboard one by one to determine which component failed.If you can identify any faulty components, replace the components.If none of the components failed, replace the motherboard."},
        "3, 7": {"prob": "Possible memory failure", "fix": "The memory subsystem configuration shows that activity is in progress. Memory modules have been detected, but they appear to be incompatible or in an invalid configuration.Narrow down the issue by removing the memory modules one by one to determine which module failed.If you can identify the faulty module, replace it.Otherwise, replace the motherboard."}
    },
    "ASUS LED (Power Button/Q-LED)": {
        "Fast Flash": {"prob": "No Memory or Memory Error", "fix": "Reseat RAM."},
        "Slow Flash": {"prob": "No VGA/Graphics Error", "fix": "Reseat GPU."},
        "Super Slow Flash": {"prob": "No Boot Device", "fix": "Check SSD seating."},
        "CPU LED": {"prob": "No CPU or CPU Faulty", "fix": "Reseat CPU."},
        "DRAM LED": {"prob": "No Memory or Memory Faulty", "fix": "Check RAM."},
        "VGA LED": {"prob": "No Graphics Card detected", "fix": "Check GPU cables."},
        "BOOT LED": {"prob": "No Bootable Drive found", "fix": "Check BIOS boot priority."}
    },
    "HP Desktop (Red, White Blinks)": {
        "2, 2": {"prob": "Main area (DXE) of the BIOS has become corrupted and no recovery binary image is available. It can also occur when updating the BIOS.", "fix": "Allow the system to complete its updates and any changes. Attempt Sure Start Recovery if the updates are not installing as expected."},
        "2, 3": {"prob": "Embedded controller policy requires you to type a key sequence.", "fix": "Follow any prompts. Attempt Sure Start Recovery if the issue persists."},
        "2, 4": {"prob": "Embedded controller is checking or recovering the boot block.", "fix": "Allow the system to attempt to recover the BIOS. Attempt Sure Start Recovery if the issue persists after waiting several minutes."},
        "3, 2": {"prob": "Memory Failure", "fix": "Test computer memory. Use the BIOS Setup Utility to perform a memory self-test, Reseat the memory module from inside the computer, Replace the affected part or component if the issue persists after completing all the preceding steps."},
        "3, 3": {"prob": "Graphics Chip Failure", "fix": "Contact HP Customer Support for further assistance"},
        "3, 4": {"prob": "Power System Failure", "fix": "Reduce to minimum configuration (CPU, System board, PSU, 1 DIMM of memory), and then isolate the failed component. Reduce further if issue persists. Test your system with a known good PSU. Contact HP Customer Support for further assistance to replace the component, system board, processor (CPU), or PSU if the issue persists"},
        "3, 5": {"prob": "CPU Not Detected", "fix": "Reseat CPU.Contact HP Customer Support for repair due to system board or CPU failure."},
        "3, 6": {"prob": "Processor does not support an enabled feature.", "fix": "Find product and serial numbers on the PC label or box. Reset the CMOS. Replace the affected componen"},
        "3, 7": {"prob": "Computer's access panel or cover either has been opened after the computer last started, has been removed during use, or is not installed when attempting to turn on the computer.", "fix": "Make sure that the access panel or cover is installed when the computer is turned on and in use. Do not remove the access panel or cover while the computer is turned on."},
        "4, 2": {"prob": "CPU Overheating", "fix": "Confirm that the desktop computer fans work correctly. Clean the desktop air vents. Find product and serial numbers on the PC label or box. Reset the CMOS. Prepare to replace parts of the computer. Replace the thermal paste on the processor. Replace the affected component"},
        "4, 3": {"prob": "System Temperature Too High", "fix": "Confirm that the desktop computer fans work correctly. Clean the desktop air vents. Find product and serial numbers on the PC label or box. Reset the CMOS. Replace the affected componen"},
        "4, 4": {"prob": "MXM graphics card temperature is too high.", "fix": "Confirm that the desktop computer fans work correctly. Clean the desktop air vents. Find product and serial numbers on the PC label or box. Reset the CMOS. Replace the affected component"},
        "5, 2": {"prob": "Missing EC Firmware", "fix": "Remove recently installed hardware. Find product and serial numbers on the PC label or box. Reset the CMOS. Update the PC with HP Support Assistant. Replace the affected component"},
        "5, 3": {"prob": "Component cannot be not reached by the BIOS within the established time limit.", "fix": "Reseat the component. Test your system with a known good component. Contact HP Customer Support for further assistance to replace the component or system board if the issue persists."},
        "5, 4": {"prob": "System board is not initializing quickly enough for component.", "fix": "Confirm the correct power supply is being used for the computer. Reset the CMOS. Reseat components. Test your system with a known good component. Contact HP Customer Support for further assistance to replace any defective parts found."}
    },
    "Lenovo (Amber LED + Beeps)": {
        "Solid + 2 Beeps": {"prob": "RAM not detected or faulty", "fix": "Test RAM sticks."},
        "Solid + 3 Beeps": {"prob": "Memory controller error", "fix": "Test known-good RAM."},
        "Blinking + 5 Beeps": {"prob": "CPU error", "fix": "Check cooling."},
        "Solid + 6 Beeps": {"prob": "Keyboard or USB error", "fix": "Try another keyboard."},
        "Solid + 7 Beeps": {"prob": "Motherboard failure", "fix": "Replace board."},
        "Solid + 8 Beeps": {"prob": "Graphics card error", "fix": "Reseat GPU."},
        "No LED + Continuous": {"prob": "Power supply or RAM failure", "fix": "Test PSU."},
        "No LED + No Beep": {"prob": "Dead PSU or motherboard", "fix": "Replace PSU or board."}
    }
}

# ---------------------------------------------------------
# MODELS
# ---------------------------------------------------------
class DiagnoseRequest(BaseModel):
    brand: str
    code: str

class AIRequest(BaseModel):
    brand: str
    problem: str
    fix: str

# ---------------------------------------------------------
# ENDPOINTS
# ---------------------------------------------------------

@router.get("/brands")
async def get_brands():
    return list(DIAGNOSTIC_DATA.keys())

@router.post("/diagnose/manual")
async def diagnose_manual(req: DiagnoseRequest):
    if req.brand not in DIAGNOSTIC_DATA:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    if req.code in DIAGNOSTIC_DATA[req.brand]:
        return {
            "code": req.code,
            "info": DIAGNOSTIC_DATA[req.brand][req.code]
        }
    else:
        raise HTTPException(status_code=404, detail="Pattern not found")

@router.post("/analyze/deep-dive")
async def deep_dive(req: AIRequest):
    prompt = f"Explain the '{req.problem}' error on a {req.brand}. Why does it happen?"
    ai_res = client.chat.completions.create(
        messages=[{"role":"user","content":prompt}], 
        model="llama-3.1-8b-instant"
    )
    return {"content": ai_res.choices[0].message.content}

@router.post("/analyze/fix-guide")
async def fix_guide(req: AIRequest):
    prompt = f"Provide a detailed repair guide for: {req.problem}. Base it on: {req.fix}. Include safety tips."
    ai_res = client.chat.completions.create(
        messages=[{"role":"user","content":prompt}], 
        model="llama-3.1-8b-instant"
    )
    return {"content": ai_res.choices[0].message.content}

# ---------------------------------------------------------
# WEBSOCKET FOR BLINK DETECTION
# ---------------------------------------------------------

@router.websocket("/ws/troubleshoot")
async def websocket_troubleshoot(websocket: WebSocket):
    await websocket.accept()
    
    # Static tracking variables (analogous to session_state)
    blink_count = 0
    last_state = 0
    pause_start = None
    pattern_list = []
    
    # Calibration state
    calibration_samples = []
    baseline_value = 0
    calibrated = False
    start_time = None
    
    try:
        while True:
            # Receive image bytes from client
            data = await websocket.receive_bytes()
            if start_time is None:
                start_time = time.time()
                
            nparr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                continue

            # Processing (ROI: center)
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            h, w = gray.shape
            roi = gray[h//2-50:h//2+50, w//2-50:w//2+50]
            brightness = float(np.mean(roi))
            
            elapsed = time.time() - start_time
            
            # Calibration phase (4 seconds)
            if elapsed < 4:
                calibration_samples.append(brightness)
                await websocket.send_json({
                    "status": "calibrating",
                    "progress": elapsed / 4,
                    "brightness": brightness
                })
                continue
            
            if not calibrated:
                baseline_value = min(calibration_samples) if calibration_samples else 0
                calibrated = True
                await websocket.send_json({"status": "calibrated", "baseline": baseline_value})

            # Detection logic
            threshold = baseline_value + max(40, baseline_value * 0.6)
            current_state = 1 if brightness > threshold else 0
            
            if current_state == 1 and last_state == 0:
                blink_count += 1
                pause_start = None 
            elif current_state == 0 and last_state == 1:
                pause_start = time.time() 

            detected_code = None
            if current_state == 0 and pause_start is not None:
                elapsed_pause = time.time() - pause_start
                
                if 1.5 < elapsed_pause < 3.0: 
                    if blink_count > 0:
                        pattern_list.append(blink_count)
                        blink_count = 0
                elif elapsed_pause >= 3.0:
                    if blink_count > 0:
                        pattern_list.append(blink_count)
                        blink_count = 0
                    
                    if pattern_list:
                        detected_code = ", ".join(map(str, pattern_list))
                        # Reset for next sweep or wait for client to restart
                        pattern_list = []

            last_state = current_state
            
            # Send status back to client
            await websocket.send_json({
                "status": "detecting",
                "brightness": brightness,
                "state": "ON" if current_state else "OFF",
                "blink_count": blink_count,
                "partial_pattern": pattern_list,
                "detected_code": detected_code
            })

    except WebSocketDisconnect:
        print("Troubleshoot WS Disconnected")
    except Exception as e:
        print(f"Troubleshoot WS Error: {e}")
        await websocket.close()
