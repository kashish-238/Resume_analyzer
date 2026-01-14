# ResumeRaptor 🦖

**A Resume analyzer powered by Groq.**  
Upload a resume + paste a job description to get ATS scoring, evidence-backed feedback, actionable fixes, and a high-quality cover letter — fast, transparent, and private.

---

## 🚀 What ResumeRaptor Does

ResumeRaptor analyzes how well a resume matches a specific job description and returns:

- 📊 **ATS-style overall score (0–100)**
- 🧾 **Evidence-based evaluation** (direct quotes from the resume)
- 🧩 **Missing skills detection** (required vs preferred)
- 🛠 **Concrete improvement suggestions**
- ✍️ **Bullet rewrites** (safe, non-invented)
- 💬 **Interview prep prompts**
- 📨 **High-quality, role-specific cover letter** (generated in a second AI pass)
- 📦 **Exportable JSON output**

Everything runs in **stateless mode** — no resumes or job descriptions are stored.

---

## ✨ Key Features

- ⚡ **Ultra-fast inference** using Groq
- 🧠 **Two-pass AI pipeline**
  - Pass 1: Structured ATS evaluation (JSON-safe)
  - Pass 2: Professional, human-sounding cover letter
- 🔍 **Evidence-first scoring** (no vague feedback)
- 🧪 **Demo mode** (instant showcase without uploads)
- 🎛 **One-command development setup**
- 🎨 **Cyber / mission-control UI**

---

## 🧱 Tech Stack

**Frontend**
- React + TypeScript
- Tailwind CSS
- Framer Motion
- React Router

**Backend**
- Node.js
- Express
- Groq API (LLaMA 3.1 models)

**Other**
- PDF & DOCX resume extraction
- Zod schema validation
- Secure API proxy (no client-side API keys)

---

## 🔒 Privacy & Security

- ❌ No resumes stored
- ❌ No job descriptions stored
- ❌ No analytics tracking
- ✅ All data processed in memory and discarded immediately
- ✅ API keys never exposed to the client

---

## 🧪 Demo Mode

Click **Demo Mode** in the analyzer to instantly populate a sample resume and job description.  
Perfect for recruiters, reviewers, or quick demos.

---

### 1️⃣ Clone the repo
```bash
git clone https://github.com/your-username/resume-raptor.git
cd resume-raptor
