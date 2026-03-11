# Peasy Web App – Team Setup Guide

<p><strong>Audience:</strong> Internal team members</p>
<p>This document explains how to set up and run the Peasy Web App locally. Specifically for the <strong>React Frontend</strong> and <strong>FastAPI Backend</strong>.</p>

<hr/>

## 📌 Requirements

Install these **before cloning the repository**:

- **Node.js** (v18 or higher)  
  👉 https://nodejs.org
- **Python** (v3.10 or higher)
  👉 https://python.org
- **Git**  
  👉 https://git-scm.com

### Verify Installation

```bash
node -v
npm -v
python --version
git --version
```

<hr/>

## 📥 Clone the Repository

Use **HTTPS (recommended)**:

```bash
git clone https://github.com/Epicer12/Peasy_Webapp.git
cd Peasy_Webapp
```

> ⚠️ If Git asks for credentials repeatedly, see the **SSH Setup (macOS/Linux)** section below.

<hr/>

## 📁 Project Structure (Do NOT change)

```text
Peasy_Webapp/
│
├── frontend/      # React frontend (Vite)
├── backend/       # Python FastAPI Backend
└── README.md
```

❌ Do **NOT** move files between folders.

<hr/>

## 🖥️ Frontend Setup (Required)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:
```
http://localhost:5173
```

<hr/>

## 🧠 Backend Setup (Python / FastAPI)

Open a **new terminal**:

1. Navigate to backend:
   ```bash
   cd backend
   ```

2. (Optional but Recommended) Create a Virtual Environment:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate
   
   # Mac/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install Dependencies:
   ```bash
   pip install -r requirements.txt
   ```
   *Note: This includes FastAPI, Uvicorn, OpenCV, Ultralytics (YOLO), and WebSockets.*

4. Run the Server:
   ```bash
   python -m uvicorn app.main:app --reload
   ```

Backend runs on:
```
http://localhost:8000
```

<hr/>

## 🔁 Running the Full App

You need **two terminals**:

- Terminal 1 → `frontend` → `npm run dev`
- Terminal 2 → `backend` → `python -m uvicorn app.main:app --reload`

<hr/>

## 🌱 Git Workflow Rules

- ❌ Do **NOT** push directly to `main`
- ❌ Do **NOT** commit:
  - `node_modules/`
  - `venv/`
  - `__pycache__/`
  - `.env`
- ✅ Always pull latest changes before starting work

```bash
git pull origin main
```

### Create a Feature Branch

```bash
git checkout -b feature-your-name
```

### Push Your Branch

```bash
git push origin feature-your-name
```

Open a **Pull Request** after pushing.

<hr/>

## 🔑 SSH Setup (macOS / Linux – Recommended)

> This is optional but recommended if HTTPS authentication fails.

### Generate SSH Key

```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
```

Press **Enter** for all prompts.

### Start SSH Agent & Add Key

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

### Copy Public Key

```bash
pbcopy < ~/.ssh/id_ed25519.pub
```

### Add to GitHub
1. GitHub → Settings → SSH and GPG keys
2. New SSH key
3. Paste the key and save

### Test Connection

```bash
ssh -T git@github.com
```

Expected:
```
Hi username! You've successfully authenticated...
```

After this, you can use:
```bash
git clone git@github.com:Epicer12/Peasy_Webapp.git
```

<hr/>

## 🐞 Common Issues

### `npm install` fails
```bash
rm -rf node_modules
npm install
```

### Backend "Module Not Found"
Ensure you activated your virtual environment (`venv`) and ran `pip install -r requirements.txt`.

### App not loading
- Check terminal errors
- Make sure backend is running on port 8000.

<hr/>

## 🤖 Vision API Setup (Optional - For Detailed Component Identification)

The app uses OpenAI Vision API to identify component brands and models after YOLO detection.

### 1. Get API Key
1. Sign up at [OpenAI Platform](https://platform.openai.com/)
2. Generate an API key from [API Keys page](https://platform.openai.com/api-keys)

### 2. Configure Backend
```bash
cd backend
cp .env.example .env
# Edit .env and add:
OPENAI_API_KEY=sk-your-actual-key-here
```

### 3. Cost Information
- **Model**: gpt-4o-mini (cost-optimized)
- **Image Size**: 512×512 (optimized)
- **Cost**: ~$0.0015 per session (10 components)
- **1000 sessions**: ~$1.50

<hr/>

## 📄 Notes

- **AI Features:** The backend uses YOLOv8 for component identification. Ensure you have the `best.pt` model file in `backend/app/routers/` or root `backend/`.
- **WebSockets:** The backend exposes a `/ws/identify` endpoint for real-time inference.
- **Vision API:** Optional but recommended for detailed brand/model identification.

---
**Deployment Note:** When deploying to Vercel Hobby accounts, ensure the pushing developer's `git config user.email` matches the Vercel account owner's email to prevent deployment blocks.
