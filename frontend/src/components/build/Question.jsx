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
    padding: "12px",
    borderRadius: "4px",
    border: "2px solid #333",
    width: "100%",
    fontSize: "14px",
    outline: "none",
    backgroundColor: "#050505",
    color: "#eeeeee",
    transition: "border-color 0.2s",
    fontFamily: "'Space Mono', monospace"
  };

  return (
    <div
      style={{
        marginBottom: "30px",
        padding: "20px",
        border: "1px solid #222",
        backgroundColor: "#0a0a0a",
      }}
    >
      <h3 style={{ marginBottom: "15px", fontSize: "14px", color: "#eeeeee", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: "900" }}>
        {title}
      </h3>

      {subtitle && (
        <p
          style={{
            marginTop: "-10px",
            marginBottom: "15px",
            color: "#ccff00",
            fontSize: "10px",
            fontWeight: "500",
            fontStyle: "italic",
            textTransform: "uppercase"
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
                color: "#666",
                fontSize: "10px",
                fontWeight: "bold"
              }}
            >
              LKR
            </span>
            <input
              type="number"
              placeholder="MIN"
              value={selected?.min || ""}
              onChange={(e) =>
                onSelect({ ...selected, min: e.target.value })
              }
              style={{ ...inputStyle, paddingLeft: "45px" }}
              min={min}
            />
          </div>

          <span style={{ fontWeight: "bold", color: "#333" }}>//</span>

          <div style={{ position: "relative", flex: 1 }}>
            <span
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#666",
                fontSize: "10px",
                fontWeight: "bold"
              }}
            >
              LKR
            </span>
            <input
              type="number"
              placeholder="MAX"
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
                flexDirection: "column",
                gap: "10px",
                padding: "12px 15px",
                border: "1px solid",
                borderColor: isSelected(option)
                  ? "#00f3ff"
                  : "#333",
                backgroundColor: isSelected(option)
                  ? "rgba(0, 243, 255, 0.05)"
                  : "#050505",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onClick={() => handleClick(option)}
            >
              <div
                style={{
                  color: isSelected(option)
                    ? "#00f3ff"
                    : "#888",
                  fontWeight: isSelected(option)
                    ? "900"
                    : "400",
                  fontSize: "12px",
                  textTransform: "uppercase"
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
