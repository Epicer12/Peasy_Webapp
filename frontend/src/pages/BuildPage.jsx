import { useState } from "react";
import Question from "../components/build/Question";

export default function BuildPage() {
  const [step, setStep] = useState(1);

  const [answers, setAnswers] = useState({
    purpose: [],
    resolution: [],
    performance: "",
    budget: "",
    ownedParts: [],
    upgrade: "",
    aesthetics: "",
    caseSize: "",
    overclock: "",
    wifi: "",
  });

  const updateAnswer = (field, value) => {
    setAnswers({ ...answers, [field]: value });
  };

  const next = () => setStep(step + 1);
  const back = () => setStep(step - 1);

  const pageWrapper = {
    padding: "40px 20px",
  };

  const titleStyle = {
    textAlign: "center",
    fontSize: "36px",
    fontWeight: "700",
    marginBottom: "30px",
  };

  const boxStyle = {
    maxWidth: "600px",
    margin: "0 auto",
    padding: "30px",
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
  };

  const buttonRow = {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "30px",
  };

  const buttonStyle = {
    padding: "10px 20px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    backgroundColor: "#4a7cff",
    color: "white",
    fontWeight: "600",
  };

  const backStyle = {
    ...buttonStyle,
    backgroundColor: "#ccc",
    color: "#333",
  };

  if (step === 11) {
    return (
      <div style={pageWrapper}>
        <h1 style={titleStyle}>Build Your Own PC</h1>

        <div style={boxStyle}>
          <h2 style={{ marginBottom: "20px" }}>Build Plan Summary</h2>

          {Object.entries(answers).map(([key, value]) => (
            <p key={key} style={{ marginBottom: "10px" }}>
              <strong>{key.toUpperCase()}:</strong>{" "}
              {Array.isArray(value) ? value.join(", ") : value}
            </p>
          ))}

          <div style={buttonRow}>
            <button style={backStyle} onClick={() => setStep(10)}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrapper}>
      {/* BIG CENTERED TITLE ABOVE BOX */}
      <h1 style={titleStyle}>Build Your Own PC</h1>

      <div style={boxStyle}>
        {step === 1 && (
          <Question
            title="1. What will you primarily use this PC for?"
            options={[
              "Gaming",
              "Video Editing",
              "Graphic Design",
              "Programming",
              "3D Rendering",
              "AI / Machine Learning",
              "General Use",
              "Mixed Use",
            ]}
            selected={answers.purpose}
            onSelect={(val) => updateAnswer("purpose", val)}
            multi={true}
          />
        )}

        {step === 2 && (
          <Question
            title="2. What resolution will you be using?"
            options={["1080p", "1440p", "4K", "Not sure"]}
            selected={answers.resolution}
            onSelect={(val) => updateAnswer("resolution", val)}
            multi={true}
          />
        )}

        {step === 3 && (
          <Question
            title="3. What performance level are you aiming for?"
            options={[
              "Entry Level",
              "Mid-Range",
              "High-End",
              "Enthusiast / Extreme",
            ]}
            selected={answers.performance}
            onSelect={(val) => updateAnswer("performance", val)}
          />
        )}

        {step === 4 && (
          <Question
            title="4. What is your total budget?"
            options={[
              "Under 150,000",
              "150,000 - 300,000",
              "300,000 - 600,000",
              "600,000+",
            ]}
            selected={answers.budget}
            onSelect={(val) => updateAnswer("budget", val)}
          />
        )}

        {step === 5 && (
          <Question
            title="5. Do you already own any components?"
            options={[
              "CPU",
              "GPU",
              "RAM",
              "Storage",
              "PSU",
              "Case",
              "None",
            ]}
            selected={answers.ownedParts}
            onSelect={(val) => updateAnswer("ownedParts", val)}
            multi={true}
          />
        )}

        {step === 6 && (
          <Question
            title="6. How important is future upgradeability?"
            options={[
              "Not important",
              "Somewhat important",
              "Very important",
            ]}
            selected={answers.upgrade}
            onSelect={(val) => updateAnswer("upgrade", val)}
          />
        )}

        {step === 7 && (
          <Question
            title="7. Do aesthetics matter to you?"
            options={[
              "Performance only",
              "Minimal build",
              "RGB build",
              "White themed build",
              "No preference",
            ]}
            selected={answers.aesthetics}
            onSelect={(val) => updateAnswer("aesthetics", val)}
          />
        )}

        {step === 8 && (
          <Question
            title="8. What case size do you prefer?"
            options={[
              "Mini ITX",
              "Micro ATX",
              "ATX",
              "No preference",
            ]}
            selected={answers.caseSize}
            onSelect={(val) => updateAnswer("caseSize", val)}
          />
        )}

        {step === 9 && (
          <Question
            title="9. Do you plan to overclock?"
            options={["Yes", "No", "Not sure"]}
            selected={answers.overclock}
            onSelect={(val) => updateAnswer("overclock", val)}
          />
        )}

        {step === 10 && (
          <Question
            title="10. Do you need WiFi & Bluetooth built-in?"
            options={["Yes", "No", "Doesn't matter"]}
            selected={answers.wifi}
            onSelect={(val) => updateAnswer("wifi", val)}
          />
        )}

        <div style={buttonRow}>
          {step !== 1 && (
            <button style={backStyle} onClick={back}>
              Back
            </button>
          )}

          {step === 10 ? (
            <button style={buttonStyle} onClick={() => setStep(11)}>
              View Summary
            </button>
          ) : (
            <button style={buttonStyle} onClick={next}>
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
