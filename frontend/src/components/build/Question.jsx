import React from "react";

export default function Question({
  title,
  subtitle,
  options = [],
  selected,
  onSelect,
  multi = false,
  layout = "column",
  exclusiveOption = null,
  type = "selection",
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
    multi ? selected?.includes(option) : selected === option;

  const inputStyle = {
<<<<<<< HEAD
    padding: "12px",
    borderRadius: "4px",
    border: "2px solid #333",
=======
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #333",
>>>>>>> 6c8128b (Add frontend BuildSuggestions page and interactive question components)
    width: "100%",
    fontSize: "14px",
    outline: "none",
<<<<<<< HEAD
    backgroundColor: "#050505",
    color: "#eeeeee",
    transition: "border-color 0.2s",
    fontFamily: "'Space Mono', monospace"
=======
    transition: "border-color 0.2s",
    backgroundColor: "#000",
    color: "#fff"
>>>>>>> 6c8128b (Add frontend BuildSuggestions page and interactive question components)
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
<<<<<<< HEAD
      <h3 style={{ marginBottom: "15px", fontSize: "14px", color: "#eeeeee", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: "900" }}>
=======
      <h3 style={{
        marginBottom: "15px",
        fontSize: "16px",
        color: "#eeeeee",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        fontWeight: "900"
      }}>
>>>>>>> 6c8128b (Add frontend BuildSuggestions page and interactive question components)
        {title}
      </h3>

      {subtitle && (
<<<<<<< HEAD
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
=======
        <p style={{
          marginTop: "-10px",
          marginBottom: "15px",
          color: "#ccff00",
          fontSize: "12px",
          fontWeight: "500",
          fontStyle: "italic",
          textTransform: "uppercase"
        }}>
>>>>>>> 6c8128b (Add frontend BuildSuggestions page and interactive question components)
          {subtitle}
        </p>
      )}

      {type === "range" ? (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          
          {/* MIN */}
          <div style={{ position: "relative", flex: 1 }}>
<<<<<<< HEAD
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
=======
            <span style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#666",
              fontSize: "0.9rem"
            }}>
>>>>>>> 6c8128b (Add frontend BuildSuggestions page and interactive question components)
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
<<<<<<< HEAD
=======
              onFocus={(e) => (e.target.style.borderColor = "#00f3ff")}
              onBlur={(e) => {
                e.target.style.borderColor = "#333";
                const val = Number(e.target.value);
                if (!e.target.value || val < min) {
                  onSelect({ ...selected, min });
                }
              }}
>>>>>>> 6c8128b (Add frontend BuildSuggestions page and interactive question components)
              min={min}
            />
          </div>

<<<<<<< HEAD
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
=======
          <span style={{ fontWeight: "bold", color: "#444", fontSize: "1.2rem" }}>
            —
          </span>

          {/* MAX */}
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#666",
              fontSize: "0.9rem"
            }}>
>>>>>>> 6c8128b (Add frontend BuildSuggestions page and interactive question components)
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
<<<<<<< HEAD
=======
              onFocus={(e) => (e.target.style.borderColor = "#00f3ff")}
              onBlur={(e) => {
                e.target.style.borderColor = "#333";
                const val = Number(e.target.value);
                if (!e.target.value || val < min) {
                  onSelect({ ...selected, max: min });
                }
              }}
>>>>>>> 6c8128b (Add frontend BuildSuggestions page and interactive question components)
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
<<<<<<< HEAD
                padding: "12px 15px",
                border: "1px solid",
                borderColor: isSelected(option)
                  ? "#00f3ff"
                  : "#333",
                backgroundColor: isSelected(option)
                  ? "rgba(0, 243, 255, 0.05)"
                  : "#050505",
=======
                padding: "10px 15px",
                borderRadius: "4px",
                border: "1px solid",
                borderColor: isSelected(option) ? "#00f3ff" : "#222",
                backgroundColor: isSelected(option)
                  ? "rgba(0, 243, 255, 0.1)"
                  : "#000",
>>>>>>> 6c8128b (Add frontend BuildSuggestions page and interactive question components)
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onClick={() => handleClick(option)}
            >
<<<<<<< HEAD
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
=======
              <div style={{
                color: isSelected(option) ? "#00f3ff" : "#aaa",
                fontWeight: isSelected(option) ? "900" : "400",
                fontSize: "13px",
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}>
                {option}
              </div>

              {renderOptionExtra && isSelected(option) && (
                <div style={{ flex: 1 }} onClick={(e) => e.stopPropagation()}>
                  {renderOptionExtra(option)}
                </div>
              )}
>>>>>>> 6c8128b (Add frontend BuildSuggestions page and interactive question components)
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
