import React, { useState, useEffect, useRef, useCallback } from 'react';

const DualPriceSlider = ({ 
    min = 50000, 
    max = 100000, 
    step = 1000,
    onChange, 
    defaultMinValue, 
    defaultMaxValue 
}) => {
    const [minVal, setMinVal] = useState(defaultMinValue ?? min);
    const [maxVal, setMaxVal] = useState(defaultMaxValue ?? max);
    const minValRef = useRef(minVal);
    const maxValRef = useRef(maxVal);
    const rangeRef = useRef(null);

    // Convert value to percentage
    const getPercent = useCallback(
        (value) => Math.round(((value - min) / (max - min)) * 100),
        [min, max]
    );

    // Update range width/left dynamically
    useEffect(() => {
        const minPercent = getPercent(minVal);
        const maxPercent = getPercent(maxValRef.current);

        if (rangeRef.current) {
            rangeRef.current.style.left = `${minPercent}%`;
            rangeRef.current.style.width = `${maxPercent - minPercent}%`;
        }
    }, [minVal, getPercent]);

    useEffect(() => {
        const minPercent = getPercent(minValRef.current);
        const maxPercent = getPercent(maxVal);

        if (rangeRef.current) {
            rangeRef.current.style.width = `${maxPercent - minPercent}%`;
        }
    }, [maxVal, getPercent]);

    // Internal handler to broadcast updates upward
    useEffect(() => {
        // Broadcast the exact limits up to the parent component
        if (onChange) {
            onChange({ min: minVal, max: maxVal });
        }
    }, [minVal, maxVal, onChange]);

    const handleMinChange = (e) => {
        const value = Math.min(Number(e.target.value), maxVal - step);
        setMinVal(value);
        minValRef.current = value;
    };

    const handleMaxChange = (e) => {
        const value = Math.max(Number(e.target.value), minVal + step);
        setMaxVal(value);
        maxValRef.current = value;
    };

    return (
        <div className="flex flex-col w-full px-4 py-2">
            <style>{`
                .thumb-slider::-webkit-slider-thumb {
                    pointer-events: auto;
                    -webkit-appearance: none;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                }
                .thumb-slider::-moz-range-thumb {
                    pointer-events: auto;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                }
            `}</style>

            <div className="flex justify-between items-center mb-4">
                <span className="text-[#888] font-mono text-[9px] uppercase tracking-widest">
                    LKR Range
                </span>
                <span className="text-[var(--color-neon-blue)] font-mono text-[10px] font-bold bg-[#00f3ff]/10 px-2 py-0.5 rounded-sm border border-[var(--color-neon-blue)] drop-shadow-[0_0_5px_rgba(0,243,255,0.4)]">
                    {minVal.toLocaleString()} - {maxVal.toLocaleString()}
                </span>
            </div>
            
            <div className="relative w-full h-8 flex items-center">
                {/* Visual dual HTML5 range inputs stacked on each other */}
                {/* z-indexes and backgrounds are manipulated to create a unified slider */}
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={minVal}
                    onChange={handleMinChange}
                    className="thumb-slider absolute w-full h-1 pointer-events-none appearance-none opacity-0 z-20 cursor-grab active:cursor-grabbing"
                />
                
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={maxVal}
                    onChange={handleMaxChange}
                    className="thumb-slider absolute w-full h-1 pointer-events-none appearance-none opacity-0 z-21 cursor-grab active:cursor-grabbing"
                />

                {/* Custom Track Background */}
                <div className="absolute w-full h-[2px] bg-[#222] rounded-full z-0 top-1/2 -translate-y-1/2"></div>
                
                {/* Custom Highlight Range */}
                <div 
                    ref={rangeRef}
                    className="absolute h-[2px] bg-[var(--color-neon-blue)] rounded-full z-10 top-1/2 -translate-y-1/2 shadow-[0_0_10px_var(--color-neon-blue)] transition-all duration-75"
                ></div>

                {/* Custom Thumbs (Visual Only, slaved to the invisible inputs) */}
                <div 
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full z-10 shadow-[0_0_10px_white] pointer-events-none transition-all duration-75"
                    style={{ left: `calc(${getPercent(minVal)}% - 8px)` }}
                />
                <div 
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full z-10 shadow-[0_0_10px_white] pointer-events-none transition-all duration-75"
                    style={{ left: `calc(${getPercent(maxVal)}% - 8px)` }}
                />
            </div>
        </div>
    );
};

export default DualPriceSlider;
