// server.mjs
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// --- Force .env from the same folder as server.mjs (no ambiguity) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

// Safe debug (do NOT print full key)
console.log("dotenv path:", path.join(__dirname, ".env"));
console.log("GROQ_API_KEY loaded:", !!process.env.GROQ_API_KEY);
console.log("GROQ_API_KEY prefix:", (process.env.GROQ_API_KEY || "").slice(0, 4));
console.log("GROQ_API_KEY length:", (process.env.GROQ_API_KEY || "").length);

const app = express();
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    port: Number(process.env.PORT || 8787),
    hasKey: !!process.env.GROQ_API_KEY,
    keyPrefix: (process.env.GROQ_API_KEY || "").slice(0, 4),
    node: process.version,
  });
});

function clip(text, maxChars) {
  const t = (text ?? "").toString();
  if (t.length <= maxChars) return t;
  return t.slice(0, maxChars) + `\n\n[TRUNCATED to ${maxChars} chars]`;
}

async function groqChat(body) {
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  return { ok: resp.ok, status: resp.status, text };
}

/**
 * Second-pass cover letter generation (much better than generic).
 * Tries a stronger model first; falls back automatically.
 */
async function groqCoverLetter({ resumeText, jobDescription }) {
  const system =
    "You are an expert career writer. Write a high-impact cover letter that sounds human, specific, and confident. Avoid generic filler.";

  const user = `Write a cover letter based ONLY on the provided resume and job description.

Rules:
- Do NOT invent experience, companies, tools, or metrics not clearly supported by the resume.
- If company name/role name is missing from the job description, use placeholders like [Company] and [Role].
- Keep it 250–380 words, 3–5 paragraphs, professional but energetic.
- Must include:
  1) Hook: 1–2 lines with the role + motivation + fit
  2) 2–3 short achievement bullets pulled from resume experience/projects (no invented metrics)
  3) Why this role/company: tie directly to job description requirements/keywords
  4) Closing: call to action + availability

Resume:
${resumeText}

Job Description:
${jobDescription}

Return ONLY the cover letter text (no JSON, no markdown, no title).`;

  const candidates = [
    "llama-3.1-70b-versatile", // better writing (if available)
    "llama-3.1-8b-instant",    // fallback
  ];

  for (const model of candidates) {
    const body = {
      model,
      temperature: 0.35,
      max_tokens: 900,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    };

    const result = await groqChat(body);
    if (!result.ok) {
      console.log("⚠️ Cover letter model failed:", model, "status:", result.status);
      console.log("⚠️ Cover letter error (first 600 chars):", result.text.slice(0, 600));
      continue;
    }

    const data = JSON.parse(result.text);
    return (data?.choices?.[0]?.message?.content ?? "").trim();
  }

  return "Cover letter generation failed. Please try again.";
}

app.post("/api/analyze", async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body ?? {};
    if (!resumeText || !jobDescription) {
      return res.status(400).json({ error: "resumeText and jobDescription are required" });
    }
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "Missing GROQ_API_KEY in .env" });
    }

    // Prevent huge prompts
    const resumeSafe = clip(resumeText, 35000);
    const jdSafe = clip(jobDescription, 15000);

    // -------- Pass 1: JSON analysis --------
    const system =
      "You are an ATS-style resume evaluator. Output ONLY valid JSON. No markdown. No extra text.";

    const user = `Job description:
${jdSafe}

Resume text:
${resumeSafe}

Rubric:
- skills max 40
- experience max 35
- projects max 15
- ats max 10
Total 100

Rules:
- Missing skills must come from the job description.
- Evidence must be short direct quotes from the resume text.
- Bullet rewrites must not invent experience.

Return JSON exactly matching this schema:
{
  "overallScore": number,
  "rubric": {
    "skills": {"score": number, "max": 40, "notes": string, "evidence": string[]},
    "experience": {"score": number, "max": 35, "notes": string, "evidence": string[]},
    "projects": {"score": number, "max": 15, "notes": string, "evidence": string[]},
    "ats": {"score": number, "max": 10, "notes": string, "evidence": string[]}
  },
  "missingSkills": {"required": string[], "preferred": string[]},
  "keywordCoverage": {"coveragePct": number, "found": string[], "missing": string[]},
  "topFixes": [{"impact":"high"|"medium"|"low","action":string,"example":string}],
  "bulletRewrites": [{"original":string,"rewrite":string,"why":string}],
  "interviewPrep": {"likelyQuestions": string[], "yourSTARPrompts": string[]},
  "coverLetter": {"draft": string}
}`;

    const body = {
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      max_tokens: 1400,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    };

    const result = await groqChat(body);

    if (!result.ok) {
      console.log("❌ Groq error status:", result.status);
      console.log("❌ Groq error body (first 1500 chars):", result.text.slice(0, 1500));
      return res.status(502).json({ error: "Groq API error", status: result.status, detail: result.text });
    }

    const data = JSON.parse(result.text);
    const content = data?.choices?.[0]?.message?.content ?? "{}";

    // JSON mode should return JSON string in content
    const parsed = JSON.parse(content);

    // -------- Pass 2: Better cover letter --------
    const cover = await groqCoverLetter({
      resumeText: resumeSafe,
      jobDescription: jdSafe,
    });

    parsed.coverLetter = parsed.coverLetter || {};
    parsed.coverLetter.draft = cover;

    return res.json(parsed);
  } catch (e) {
    console.log("🔥 Server exception:", e);
    return res.status(500).json({ error: "Server exception", detail: String(e?.message ?? e) });
  }
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => console.log(`✅ API server running on http://localhost:${port}`));
