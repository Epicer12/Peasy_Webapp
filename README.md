# Peasy Web App – Team Setup Guide

<p><strong>Audience:</strong> Internal team members</p>
<p>This document explains how to set up and run the Peasy Web App locally.</p>

<hr/>

## 📌 Requirements

Install these **before cloning the repository**:

- **Node.js** (v18 or higher)  
  👉 https://nodejs.org
- **Git**  
  👉 https://git-scm.com

### Verify Installation

```bash
node -v
npm -v
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
├── frontend/      # React frontend
├── backend/       # Node / Express backend
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

## 🧠 Backend Setup (Only if working on backend)

Open a **new terminal**:

```bash
cd backend
npm install
npm run dev
```

Backend usually runs on:
```
http://localhost:5000
```

<hr/>

## 🔁 Running the Full App

You need **two terminals**:

- Terminal 1 → `frontend` → `npm run dev`
- Terminal 2 → `backend` → `npm run dev`

<hr/>

## 🌱 Git Workflow Rules

- ❌ Do **NOT** push directly to `main`
- ❌ Do **NOT** commit:
  - `node_modules/`
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

### App not loading
- Check terminal errors
- Make sure backend is running if frontend depends on it

<hr/>

## 📄 Notes

- AI models (YOLO / ONNX) are **NOT required** to run the web app locally
- AR features are planned and not part of this setup
