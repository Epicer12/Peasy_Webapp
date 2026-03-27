import re

class ComponentParser:
    @staticmethod
    def parse_cpu(name):
        name = name.lower()
        spec = {
            "brand": "Unknown",
            "socket": "Unknown",
            "series": "Unknown"
        }

        if "intel" in name:
            spec["brand"] = "Intel"
            if "1700" in name or any(x in name for x in ["12th", "13th", "14th", "12100", "12400", "12600", "12700", "12900", "13100", "13400", "13600", "13700", "13900", "14100", "14400", "14600", "14700", "14900"]):
                spec["socket"] = "LGA1700"
            elif "1200" in name or any(x in name for x in ["10th", "11th", "10100", "10400", "10600", "10700", "10900", "11400", "11600", "11700", "11900"]):
                spec["socket"] = "LGA1200"
            elif "1151" in name or any(x in name for x in ["9th", "8th", "9100", "9400", "9600", "9700", "9900", "8100", "8400", "8600", "8700"]):
                spec["socket"] = "LGA1151"
            
        elif "amd" in name or "ryzen" in name:
            spec["brand"] = "AMD"
            if "am5" in name or any(x in name for x in ["7600", "7700", "7800", "7900", "7950", "8600", "8700"]):
                spec["socket"] = "AM5"
            elif "am4" in name or any(x in name for x in ["5600", "5700", "5800", "5900", "5950", "3600", "3700", "3800", "3900", "3950", "4600", "4650", "5500", "4500", "4100"]):
                spec["socket"] = "AM4"
            elif "threadripper" in name:
                spec["socket"] = "TR4"

        return spec

    @staticmethod
    def parse_motherboard(name):
        name = name.lower()
        spec = {
            "socket": "Unknown",
            "form_factor": "ATX"
        }

        # Chipset detection for Socket
        # Intel
        if any(x in name for x in ["z790", "b760", "h610", "z690", "b660", "h670"]):
            spec["socket"] = "LGA1700"
        elif any(x in name for x in ["z590", "b560", "h510", "z490", "b460", "h410"]):
            spec["socket"] = "LGA1200"
        elif any(x in name for x in ["z390", "z370", "b365", "b360", "h310", "h370"]):
            spec["socket"] = "LGA1151"
        
        # AMD
        elif any(x in name for x in ["x670", "b650", "a620"]):
            spec["socket"] = "AM5"
            spec["ram_type"] = "DDR5" # AM5 is DDR5 only
        elif any(x in name for x in ["x570", "b550", "a520", "x470", "b450", "a320", "x370", "b350"]):
            spec["socket"] = "AM4"
        
        # RAM Type
        if "ddr5" in name:
            spec["ram_type"] = "DDR5"
        elif "ddr4" in name:
            spec["ram_type"] = "DDR4"
        elif "ddr3" in name:
            spec["ram_type"] = "DDR3"
            
        # Form Factor
        if "itx" in name:
            spec["form_factor"] = "ITX"
        elif "micro" in name or "m-atx" in name or "matx" in name or re.search(r"m-[a-z]", name): # e.g. b550m
            spec["form_factor"] = "Micro-ATX"
        elif "e-atx" in name or "eatx" in name:
            spec["form_factor"] = "E-ATX"

        return spec

    @staticmethod
    def parse_ram(name):
        name = name.lower()
        spec = {
            "type": "Unknown",
            "capacity": "Unknown",
            "speed": "Unknown"
        }
        
        if "ddr5" in name:
            spec["type"] = "DDR5"
        elif "ddr4" in name:
            spec["type"] = "DDR4"
        elif "ddr3" in name:
            spec["type"] = "DDR3"

        # Try to find capacity (e.g. 16GB, 8GBx2)
        cap_match = re.search(r"(\d+)gb", name)
        if cap_match:
            spec["capacity"] = cap_match.group(1) + "GB"
            
        return spec

    @staticmethod
    def parse_gpu(name):
        name = name.lower()
        spec = {
            "chipset": "Unknown",
            "memory": "Unknown"
        }
        
        # Chipset/Series Detection
        if "5090" in name: spec["chipset"] = "RTX 5090"
        elif "5080" in name: spec["chipset"] = "RTX 5080"
        elif "5070" in name: spec["chipset"] = "RTX 5070"
        elif "5060" in name: spec["chipset"] = "RTX 5060"
        elif "4090" in name: spec["chipset"] = "RTX 4090"
        elif "4080" in name: spec["chipset"] = "RTX 4080"
        elif "4070" in name: spec["chipset"] = "RTX 4070"
        elif "4060" in name: spec["chipset"] = "RTX 4060"
        elif "3090" in name: spec["chipset"] = "RTX 3090"
        elif "3080" in name: spec["chipset"] = "RTX 3080"
        elif "3070" in name: spec["chipset"] = "RTX 3070"
        elif "3060" in name: spec["chipset"] = "RTX 3060"
        elif "7900" in name: spec["chipset"] = "RX 7900"
        elif "7800" in name: spec["chipset"] = "RX 7800"
        elif "7700" in name: spec["chipset"] = "RX 7700"
        elif "7600" in name: spec["chipset"] = "RX 7600"
        
        # Memory
        mem_match = re.search(r"(\d+)gb", name)
        if mem_match:
            spec["memory"] = mem_match.group(1) + "GB"
            
        return spec

    @staticmethod
    def parse_psu(name):
        name = name.lower()
        spec = {
            "wattage": "Unknown",
            "efficiency": "Unknown"
        }
        
        # Wattage
        watt_match = re.search(r"(\d+)\s*w", name)
        if watt_match:
            spec["wattage"] = watt_match.group(1)
            
        # Efficiency
        if "80+ gold" in name or "gold" in name: spec["efficiency"] = "80+ Gold"
        elif "80+ bronze" in name or "bronze" in name: spec["efficiency"] = "80+ Bronze"
        elif "80+ platinum" in name or "platinum" in name: spec["efficiency"] = "80+ Platinum"
        elif "80+ titanium" in name or "titanium" in name: spec["efficiency"] = "80+ Titanium"
        
        return spec

    @staticmethod
    def parse_case(name):
        name = name.lower()
        spec = {
            "form_factor": "ATX", # Default assumption
            "type": "Mid Tower"
        }
        
        # Determine strict form factor limits
        if "itx" in name or "dtx" in name: # DTX is usually ITX compatible
            spec["form_factor"] = "ITX"
            spec["type"] = "Mini ITX"
        elif "micro" in name or "matx" in name or "m-atx" in name:
            spec["form_factor"] = "Micro-ATX"
            spec["type"] = "Micro ATX"
        elif "e-atx" in name or "eatx" in name or "full tower" in name:
            spec["form_factor"] = "E-ATX"
            spec["type"] = "Full Tower"
            
        return spec

    @staticmethod
    def parse_cooler(name):
        name = name.lower()
        spec = {
            "socket_support": []
        }
        
        if "liquid" in name or "aio" in name or "water" in name or re.search(r"\d+mm", name):
            spec["type"] = "AIO Liquid"
            
        # Socket Support Heuristics (Very rough, as most modern coolers support almost everything)
        # But if it specifically says "TR4" it might be TR4 only.
        if "tr4" in name or "threadripper" in name:
            spec["socket_support"].append("TR4")
        else:
            # Assume general support for modern sockets unless specified
            spec["socket_support"] = ["LGA1700", "LGA1200", "AM5", "AM4"]
            
        return spec
        
    @staticmethod
    def parse_storage(name):
        name_lower = name.lower()
        spec = {
            "type": "HDD", 
            "capacity": "Unknown",
            "interface": "SATA"
        }
        
        # Type Detection
        if "ssd" in name_lower or "nvme" in name_lower or "m.2" in name_lower:
            spec["type"] = "SSD"
            if "nvme" in name_lower: spec["interface"] = "M.2 NVMe"
            elif "m.2" in name_lower: spec["interface"] = "M.2 SATA"
            else: spec["interface"] = "SATA SSD"
        
        # Capacity
        cap_match = re.search(r"(\d+)(tb|gb)", name_lower)
        if cap_match:
            spec["capacity"] = f"{cap_match.group(1)}{cap_match.group(2).upper()}"
            
        return spec

    @staticmethod
    def parse_printer(name):
        return {
            "type": "Printer",
            "image": "https://via.placeholder.com/150"
        }

    @staticmethod
    def parse_os(name):
        return {
            "type": "Software",
            "edition": "Standard",
            "image": "https://via.placeholder.com/150"
        }
