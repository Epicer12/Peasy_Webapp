from fastapi import APIRouter
from typing import Dict

router = APIRouter()

# Assembly order definition
ASSEMBLY_ORDER = {
    "PC_CASE": 1,
    "PSU": 2,
    "MOTHERBOARD": 3,
    "CPU": 4,
    "CPU_COOLER": 5,
    "RAM": 6,
    "SSD": 7,
    "HDD": 8,
    "GPU": 9,
    "CASE_FAN": 10
}

# Instruction templates for all components
INSTRUCTIONS = {
    "PC_CASE": {
        "title": "Prepare the PC Case",
        "steps": [
            "Place the case on a flat surface",
            "Remove both side panels"
        ]
    },
    "PSU": {
        "title": "Install the Power Supply",
        "steps": [
            "Insert the PSU into the PSU bay",
            "Secure it using screws",
            "Route the power cables neatly"
        ]
    },
    "MOTHERBOARD": {
        "title": "Install the Motherboard",
        "steps": [
            "Install standoffs in the case",
            "Align motherboard with standoffs",
            "Secure motherboard using screws"
        ]
    },
    "CPU": {
        "title": "Install the CPU",
        "steps": [
            "Open the CPU socket latch",
            "Align the triangle marker on CPU with the socket",
            "Place CPU gently into the socket",
            "Close the latch"
        ],
        "warning": "Do not touch CPU pins"
    },
    "CPU_COOLER": {
        "title": "Install the CPU Cooler",
        "steps": [
            "Apply thermal paste if needed",
            "Mount the cooler evenly",
            "Connect fan cable to CPU_FAN header"
        ]
    },
    "RAM": {
        "title": "Install RAM",
        "steps": [
            "Open RAM slot clips",
            "Insert RAM firmly until clips lock"
        ]
    },
    "SSD": {
        "title": "Install SSD",
        "steps": [
            "Insert SSD into M.2 or SATA slot",
            "Secure SSD with screw"
        ]
    },
    "HDD": {
        "title": "Install HDD",
        "steps": [
            "Mount HDD in drive bay",
            "Secure with screws",
            "Connect SATA and power cables"
        ]
    },
    "GPU": {
        "title": "Install GPU",
        "steps": [
            "Remove required PCIe slot covers",
            "Insert GPU into PCIe slot",
            "Secure GPU with screws",
            "Connect PCIe power cables"
        ]
    },
    "CASE_FAN": {
        "title": "Install Case Fans",
        "steps": [
            "Mount fans in airflow direction",
            "Secure fans with screws",
            "Connect fan cables to motherboard headers"
        ]
    }
}

@router.post("/assembly-instructions")
def generate_assembly_instructions(data: Dict):
    detected = data.get("detected_components", [])
    components = [item["component"] for item in detected]

    # Sort components by assembly order
    sorted_components = sorted(
        components,
        key=lambda x: ASSEMBLY_ORDER.get(x, 99)
    )

    # Generate instructions
    instructions = []
    step_number = 1
    for comp in sorted_components:
        if comp in INSTRUCTIONS:
            instructions.append({
                "step": step_number,
                "component": comp,
                "title": INSTRUCTIONS[comp]["title"],
                "steps": INSTRUCTIONS[comp]["steps"],
                "warning": INSTRUCTIONS[comp].get("warning")
            })
            step_number += 1

    return {
        "assembly_steps": instructions
    }