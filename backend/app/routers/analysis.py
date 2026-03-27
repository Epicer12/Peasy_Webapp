from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict, Any
from ..services.bottleneck_service import calculate_bottleneck

router = APIRouter(
    prefix="/analyze",
    tags=["analysis"],
)

@router.post("/bottleneck")
async def analyze_bottleneck(components: List[Dict[str, Any]] = Body(...)):
    """
    Takes a list of components and performs a bottleneck analysis.
    """
    try:
        if not components:
            raise HTTPException(status_code=400, detail="No components provided")
            
        result = calculate_bottleneck(components)
        return result
        
    except Exception as e:
        print(f"Bottleneck Analysis Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
