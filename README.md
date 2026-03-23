# Peasy Web App – Advanced PC Builder & Identifier

Peasy is an intelligent PC building platform that combines real-time hardware identification, 3D visualization, and a comprehensive marketplace.

## 🚀 Key Features

- **3D PC Visualizer**: Interactive 3D rendering of builds using React Three Fiber.
- **Hardware Identification**: Real-time component detection using local ONNX inference (YOLOv8) and OpenAI Vision API for precise model matching.
- **Component Marketplace**: Integrated marketplace with automated pricing and availability updates via a custom crawler.
- **Warranty & Profiles**: Secure authentication with Firebase OTP and detailed profile/warranty management powered by Supabase.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 (Vite)
- **Styling**: Tailwind CSS 4
- **3D Engine**: React Three Fiber / Three.js
- **State & Data**: Supabase JS, Axios
- **Auth**: Firebase Authentication (OTP)
- **Icons**: Heroicons, Lucide

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **AI/ML**: ONNX Runtime (Local Inference), Ultralytics (YOLOv8), OpenAI Vision API
- **Computer Vision**: OpenCV
- **Database**: Supabase (PostgreSQL)
- **Auth Admin**: Firebase Admin SDK
- **Async**: WebSockets for real-time inference

### Data & Tools
- **Crawler**: BeautifulSoup4 & Requests (Automated component data scraping)
- **Vision Model**: Custom YOLOv8 training/deployment assets

---

## 📁 Project Structure

```text
Peasy_WebApp/
├── frontend/        # React 19 + Vite + Tailwind 4
├── backend/         # FastAPI + Local ONNX + OpenAI
├── crawler/         # Python-based component data scraper
├── vision_model/    # YOLOv8 model training and deployment assets
└── README.md
```

---

## ⚙️ Setup & Installation

### 1. Requirements
- **Node.js**: v18+
- **Python**: v3.10+
- **Git**

### 2. Clone the Repository
```bash
git clone https://github.com/Epicer12/Peasy_Webapp.git
cd Peasy_Webapp
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Runs on: `http://localhost:5173`

### 4. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```
Runs on: `http://localhost:8000`

### 5. Crawler Setup (Optional)
To update marketplace data:
```bash
cd crawler
pip install -r requirements.txt
python main.py
```

---

## 🔑 Configuration (.env)

### Backend `.env`
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
FIREBASE_SERVICE_ACCOUNT=path_to_firebase_json
OPENAI_API_KEY=sk-your-openai-key
GROQ_API_KEY=your-groq-key
```

### Frontend `.env`
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_FIREBASE_API_KEY=your_firebase_key
```

---

## 🤖 AI Vision System
The identification system uses a hybrid approach:
1. **Local Detection**: YOLOv8 via `onnxruntime` detects component types (GPU, RAM, etc.) in real-time via WebSockets.
2. **Vision Refinement**: OpenAI Vision API analyzes detected bounding boxes to identify specific models and brands.

---

## 🌱 Git Workflow
- ❌ Do **NOT** push directly to `main`.
- ✅ Create feature branches: `git checkout -b feature/your-feature`.
- ✅ Open a Pull Request for review.

---

## 📄 Notes
- **Deployment**: Configured for Vercel (Frontend) and Render/Fly.io (Backend).
- **Automation**: Component data is refreshed periodically via the `crawler` module.
