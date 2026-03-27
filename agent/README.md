# 🤖 Peasy AI Agent — Startup Guide

This folder contains the **n8n automation agent** that powers two AI workflows for the Peasy web app:

- **PC Assembly Guide Agent** — Generates step-by-step PC build instructions using Ollama (LLM)
- **PC Chatbot Agent** — Answers PC build questions via an AI chat interface

The agent stack consists of **three services** that must all be running at the same time:

| Service | Purpose | Default Port |
|---------|---------|-------------|
| **Ollama** | Local LLM (llama3 model) | `11434` |
| **n8n** | Workflow automation / webhook server | `5678` |
| **ngrok** | Exposes n8n to the internet (for frontend webhooks) | — |

---

## 📋 Prerequisites

Before starting, make sure these are installed on your machine:

### 1. Node.js (v18+)
- **Mac:** `brew install node` or download from [nodejs.org](https://nodejs.org)
- **Windows:** Download installer from [nodejs.org](https://nodejs.org)

### 2. Ollama
- **Mac:** Download from [ollama.com](https://ollama.com) and install the `.dmg`
- **Windows:** Download from [ollama.com](https://ollama.com) and install the `.exe`

### 3. ngrok
- **Mac:** `brew install ngrok` or download from [ngrok.com/download](https://ngrok.com/download)
- **Windows:** Download `ngrok.exe` from [ngrok.com/download](https://ngrok.com/download)
- After install, authenticate: `ngrok config add-authtoken YOUR_TOKEN`
  - Get your token from [dashboard.ngrok.com](https://dashboard.ngrok.com)

### 4. n8n dependencies (first time only)
```bash
cd agent/n8n
npm install
```

---

## 🚀 Starting the Agent (Step by Step)

> ⚠️ **Important:** You need **3 separate terminal windows** running at the same time.

---

### Step 1 — Start Ollama

#### 🍎 Mac
Open Ollama from your **Applications** folder (click the elephant icon in your menu bar).

OR via terminal:
```bash
ollama serve
```

Then pull the required model (first time only):
```bash
ollama pull llama3
```

#### 🪟 Windows
Open **Ollama** from the Start Menu or system tray.

Then pull the required model (first time only — open a new Command Prompt or PowerShell):
```cmd
ollama pull llama3
```

✅ Verify Ollama is running: open [http://localhost:11434](http://localhost:11434) in your browser — you should see `"Ollama is running"`.

---

### Step 2 — Start n8n

Open a **new terminal window** and run:

#### 🍎 Mac
```bash
npx n8n start --port 5678
```

#### 🪟 Windows (Command Prompt)
```cmd
npx n8n start --port 5678
```

#### 🪟 Windows (PowerShell)
```powershell
npx n8n start --port 5678
```

✅ Verify n8n is running: open [http://localhost:5678](http://localhost:5678) — you should see the n8n editor UI.

> **First time?** Log in or create an n8n account, then import the workflow from `agent/workflows/assembly-guide.json` via **Workflows → Import from File**.

---

### Step 3 — Start ngrok

Open **another new terminal window** and run:

#### 🍎 Mac
```bash
ngrok http 5678
```

#### 🪟 Windows (Command Prompt or PowerShell)
```cmd
ngrok http 5678
```

✅ You'll see a screen like this — copy the **Forwarding** URL:
```
Forwarding    https://your-url.ngrok-free.dev -> http://localhost:5678
```

> **If you have a reserved static domain** (like this project does), ngrok will always give you the **same URL** every time.

---

## 🔗 Webhook URLs

Once all three services are running, your n8n webhooks will be live at:

| Workflow | Webhook Path |
|----------|-------------|
| Assembly Guide (Step 1) | `https://YOUR_NGROK_URL/webhook/assembly-guide` |
| PC Chatbot | `https://YOUR_NGROK_URL/webhook/pc-consultant` |

These URLs are already configured in the frontend code (`BuildDetailsPage.jsx` and `GuidePage.jsx`).

---

## ⚡ Quick Start (All-in-One)

If you want to start n8n and ngrok together in one go:

#### 🍎 Mac
```bash
# Terminal 1 — n8n
npx n8n start --port 5678

# Terminal 2 — ngrok (in a new window)
ngrok http 5678
```

Or use the existing start script (make sure Ollama is already running first):
```bash
chmod +x agent/scripts/start.sh
bash agent/scripts/start.sh
```

#### 🪟 Windows (run each in a separate Command Prompt)
```cmd
:: Window 1 — n8n
npx n8n start --port 5678

:: Window 2 — ngrok
ngrok http 5678
```

---

## 🔍 Checking Status

| Check | Mac | Windows |
|-------|-----|---------|
| Is Ollama running? | `curl http://localhost:11434` | Open browser → `http://localhost:11434` |
| Is n8n running? | Open `http://localhost:5678` | Open `http://localhost:5678` |
| Is ngrok running? | Open `http://localhost:4040` | Open `http://localhost:4040` |

---

## 🛑 Stopping the Agent

Simply press **`Ctrl + C`** in each terminal window to stop n8n and ngrok.

To stop Ollama:
- **Mac:** Click the elephant icon in the menu bar → **Quit Ollama**
- **Windows:** Right-click the Ollama icon in the system tray → **Quit**

---

## 🐛 Troubleshooting

### ERR_NGROK_3200 — "The endpoint is offline"
> **Cause:** ngrok is not running.
> **Fix:** Open a terminal and run `ngrok http 5678`.

### n8n webhooks return 404
> **Cause:** The n8n workflow is not **Active**.
> **Fix:** Open [http://localhost:5678](http://localhost:5678), find your workflow, and toggle it to **Active** (green switch in top-right).

### Ollama model not found
> **Cause:** The `llama3` model hasn't been downloaded yet.
> **Fix:** Run `ollama pull llama3` and wait for the download to complete.

### Port 5678 already in use
> **Mac Fix:**
> ```bash
> lsof -ti:5678 | xargs kill -9
> ```
> **Windows Fix (PowerShell):**
> ```powershell
> netstat -ano | findstr :5678
> taskkill /PID <PID_NUMBER> /F
> ```

### ngrok says "authtoken required"
> **Fix:** Get your token from [dashboard.ngrok.com](https://dashboard.ngrok.com/authtokens) then run:
> ```bash
> ngrok config add-authtoken YOUR_TOKEN_HERE
> ```

---

## 📁 Folder Structure

```
agent/
├── configs/
│   └── .env                    ← Environment config (ports, Ollama model, ngrok token)
├── n8n/
│   ├── package.json            ← n8n npm package
│   └── n8n_log.txt             ← n8n runtime logs
├── scripts/
│   ├── start.sh                ← Mac/Linux all-in-one start script
│   └── db/
│       ├── chk_supabase.py     ← Check Supabase connection & list columns
│       ├── tmp_query.py        ← Query a specific project's components
│       ├── tmp_query_all.py    ← Query all components + assembly guide status
│       └── tmp_restore.py      ← Restore components from a backup project
├── workflows/
│   └── assembly-guide.json     ← Exportable n8n workflow (import this into n8n UI)
└── README.md                   ← This file
```

---

## ⚙️ Configuration

Edit `agent/configs/.env` to change ports or the Ollama model:

```env
N8N_PORT=5678
OLLAMA_MODEL=llama3
NGROK_AUTHTOKEN=your_token_here
```
