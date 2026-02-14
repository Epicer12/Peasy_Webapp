import React from "react";

export default function Question({
    title,
    subtitle,
    options,
    selected,
    onSelect,
    multi = false,
    layout = "column",
    exclusiveOption = null,
    type = "selection", // "selection" or "range"
    min = 0,
    renderOptionExtra
}) {
    const handleClick = (option) => {
        if (multi) {
            if (exclusiveOption && option === exclusiveOption) {
                if (selected.includes(option)) {
                    onSelect(selected.filter((item) => item !== option));
                } else {
                    onSelect([option]);
                }
            } else {
                let newSelected = selected.includes(option)
                    ? selected.filter((item) => item !== option)
                    : [...selected, option];

                if (exclusiveOption && newSelected.includes(exclusiveOption)) {
                    newSelected = newSelected.filter(item => item !== exclusiveOption);
                }
                onSelect(newSelected);
            }
        } else {
            if (selected !== option) {
                onSelect(option);
            }
        }
    };

    const isSelected = (option) =>
        multi ? selected.includes(option) : selected === option;

    const inputStyle = {
        padding: "10px",
        borderRadius: "8px",
        border: "1px solid #e0e0e0",
        width: "100%",
        fontSize: "1rem",
        outline: "none",
        transition: "border-color 0.2s"
    };

    return (
        <div
            style={{
                marginBottom: "20px",
                padding: "15px",
                borderRadius: "12px",
                backgroundColor: "#fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                border: "1px solid #f0f0f0"
            }}
        >
            <h3 style={{ marginBottom: "10px", fontSize: "1rem", color: "#333" }}>
                {title}
            </h3>

            {subtitle && (
                <p
                    style={{
                        marginTop: "-8px",
                        marginBottom: "15px",
                        color: "#2E7D32",
                        fontSize: "0.85rem",
                        fontWeight: "500",
                        fontStyle: "italic"
                    }}
                >
                    {subtitle}
                </p>
            )}

            {type === "range" ? (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ position: "relative", flex: 1 }}>
                        <span
                            style={{
                                position: "absolute",
                                left: "12px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "#888",
                                fontSize: "0.9rem"
                            }}
                        >
                            LKR
                        </span>
                        <input
                            type="number"
                            placeholder="Min"
                            value={selected?.min || ""}
                            onChange={(e) =>
                                onSelect({ ...selected, min: e.target.value })
                            }
                            style={{ ...inputStyle, paddingLeft: "45px" }}
                            min={min}
                        />
                    </div>

                    <span style={{ fontWeight: "bold", color: "#aaa" }}>—</span>

                    <div style={{ position: "relative", flex: 1 }}>
                        <span
                            style={{
                                position: "absolute",
                                left: "12px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "#888",
                                fontSize: "0.9rem"
                            }}
                        >
                            LKR
                        </span>
                        <input
                            type="number"
                            placeholder="Max"
                            value={selected?.max || ""}
                            onChange={(e) =>
                                onSelect({ ...selected, max: e.target.value })
                            }
                            style={{ ...inputStyle, paddingLeft: "45px" }}
                            min={min}
                        />
                    </div>
                </div>
            ) : (
                <div
                    style={{
                        display: layout === "grid" ? "grid" : "flex",
                        gridTemplateColumns:
                            layout === "grid" ? "repeat(2, 1fr)" : "none",
                        flexDirection: layout === "row" ? "row" : "column",
                        gap: "10px",
                        flexWrap: "wrap"
                    }}
                >
                    {options.map((option) => (
                        <div
                            key={option}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                padding: "8px 10px",
                                borderRadius: "8px",
                                border: "1px solid",
                                borderColor: isSelected(option)
                                    ? "#4a7cff"
                                    : "#e0e0e0",
                                backgroundColor: isSelected(option)
                                    ? "#eff6ff"
                                    : "#fff",
                                cursor: "pointer"
                            }}
                            onClick={() => handleClick(option)}
                        >
                            <div
                                style={{
                                    color: isSelected(option)
                                        ? "#1d4ed8"
                                        : "#333",
                                    fontWeight: isSelected(option)
                                        ? "600"
                                        : "400"
                                }}
                            >
                                {option}
                            </div>

                            {renderOptionExtra &&
                                isSelected(option) && (
                                    <div
                                        style={{ flex: 1 }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {renderOptionExtra(option)}
                                    </div>
                                )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}