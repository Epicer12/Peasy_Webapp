export default function Question({
  title,
  options,
  selected,
  onSelect,
  multi = false
}) {
  const handleClick = (option) => {
    if (multi) {
      if (selected.includes(option)) {
        onSelect(selected.filter((item) => item !== option));
      } else {
        onSelect([...selected, option]);
      }
    } else {
      onSelect(option);
    }
  };

  const isSelected = (option) =>
    multi ? selected.includes(option) : selected === option;

  return (
    <div style={{ marginTop: "20px" }}>
      <h2 style={{ marginBottom: "20px" }}>{title}</h2>

      {options.map((option) => (
        <div
          key={option}
          onClick={() => handleClick(option)}
          style={{
            padding: "12px 16px",
            marginBottom: "12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            cursor: "pointer",
            backgroundColor: isSelected(option) ? "#d9f2ef" : "#f9f9f9",
            borderColor: isSelected(option) ? "#4fa39f" : "#ccc",
            fontWeight: isSelected(option) ? "600" : "400"
          }}
        >
          {option}
        </div>
      ))}
    </div>
  );
}
