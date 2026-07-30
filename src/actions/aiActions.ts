"use server";

import { verifyUserAuth } from "@/lib/authHelpers";
import { createAdminClient } from "@/lib/supabase/server";
import { checkAiFeatureAccess } from "@/lib/serverSubscriptions";

export interface QuestionGenParams {
  classLevel: string;
  subject: string;
  topic: string;
  questionType: "mcq" | "short" | "creative";
  count: number;
  difficulty: "easy" | "medium" | "hard";
  cleanOutputOnly?: boolean;
  outputMode?: "questions_only" | "with_answers" | "with_explanations";
}

export interface AssignmentGenParams {
  topic: string;
  subject: string;
  difficulty: "easy" | "medium" | "hard";
  maxMarks: number;
  instructions?: string;
  cleanOutputOnly?: boolean;
  outputMode?: "questions_only" | "with_answers" | "with_explanations";
}

export interface LessonPlanParams {
  subject: string;
  chapter: string;
  durationMins: number;
  targetAudience: string;
  cleanOutputOnly?: boolean;
}

interface ParentMessageParams {
  studentName: string;
  issueType: "absent" | "fee_due" | "poor_performance" | "praise" | "general";
  contextDetails?: string;
  language: "bn" | "en" | "banglish";
}

// Call Gemini REST API with enhanced prompt engineering
async function callGemini(prompt: string, systemInstruction?: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (apiKey) {
    const models = ["gemini-3-flash-preview", "gemini-3.6-flash", "gemini-flash-latest", "gemini-2.0-flash"];
    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: `${systemInstruction ? systemInstruction + "\n\n" : ""}${prompt}` }],
                },
              ],
              generationConfig: {
                temperature: 0.5,
                maxOutputTokens: 3072,
              },
            }),
          }
        );

        if (response.ok) {
          const json = await response.json();
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text;
        } else {
          console.warn(`Gemini API call to ${model} status:`, response.status);
        }
      } catch (err) {
        console.error(`Gemini API error on ${model}:`, err);
      }
    }
  }

  return "";
}

export async function generateQuestions(params: QuestionGenParams, idToken?: string) {
  const authState = await verifyUserAuth(idToken);
  if (authState.role !== "tutor" && authState.role !== "owner" && authState.role !== "admin") throw new Error("Unauthorized");
  await checkAiFeatureAccess(authState.tutorId || authState.uid);

  const cleanDirective = `
CRITICAL FORMATTING & NOTATION RULES:
1. Do NOT include any introductory greetings (e.g. 'Hello! I am TutorMate AI...'), pleasantries, meta-commentary, or conversational fluff. Start DIRECTLY with the exam title and questions immediately.
2. MATH & UNIT NOTATION: Do NOT write raw LaTeX code wrapped in dollar signs (e.g. do NOT write '$\\frac{1}{9}$', '$F \\propto \\frac{1}{d^2}$', '$9 \\times 10^9 \\text{ N}$'). Write all numbers, units, fractions, and powers in clean, professional standard notation and Unicode symbols (e.g. 1/9, 50 N, 5 N/C, 9 × 10⁹ N, F ∝ 1/d²).
3. Use pristine, high-level academic language adhering to board exam standards (NCTB / Cambridge O/A Level).`;

  let modeDirective = "";
  if (params.outputMode === "questions_only") {
    modeDirective = "\n\nCONTENT MODE: Generate QUESTIONS ONLY. Do NOT include answer keys, solutions, or explanations under any circumstances.";
  } else if (params.outputMode === "with_answers") {
    modeDirective = "\n\nCONTENT MODE: Generate questions with concise Correct Answer / Final Model Answer key ONLY. Do NOT include lengthy step-by-step explanations.";
  } else {
    modeDirective = "\n\nCONTENT MODE: Generate questions with full Correct Answer key AND detailed step-by-step explanations (ব্যাখ্যা) and common misconceptions.";
  }

  const systemPrompt = `You are TutorMate AI — a Senior Board Examiner & Master Academic Controller specializing in NCTB (National Curriculum SSC/HSC) and Cambridge/Edexcel standards.
Your goal is to generate ultra-professional, board-level, highly rigorous, and crystal-clear exam questions based on the requested content mode.${cleanDirective}`;

  const userPrompt = `Generate ${params.count} ${params.difficulty.toUpperCase()} difficulty level ${params.questionType.toUpperCase()} questions for:
- Class/Level: ${params.classLevel}
- Subject: ${params.subject}
- Topic: "${params.topic}"${modeDirective}

Specific Formatting & Quality Guidelines:
1. **If MCQ**:
   - Provide 4 distinct options (A, B, C, D).
   ${params.outputMode === "questions_only" ? "- Do NOT include the correct answer or explanation." : "- State the **Correct Answer** explicitly."}
   ${params.outputMode === "with_explanations" ? "- Provide a **Detailed Explanation (ব্যাখ্যা)** for why the correct option is right and common mistakes to avoid." : ""}
2. **If Creative Question (CQ / সৃজনশীল প্রশ্ন)**:
   - Create a realistic, engaging Stem (উদ্দীপক).
   - Divide into 4 sub-questions following standard curriculum structure:
     a) Knowledge/জ্ঞানমূলক (1 Mark)
     b) Comprehension/অনুধাবনমূলক (2 Marks)
     c) Application/প্রয়োগমূলক (3 Marks)
     d) Higher Order Thinking/উচ্চতর দক্ষতার (4 Marks)
   ${params.outputMode === "questions_only" ? "- Do NOT include model answers." : "- Provide exemplary model answers for all 4 sub-questions!"}
3. **If Short Answer (সংক্ষিপ্ত প্রশ্ন)**:
   - Provide a clear, precise question.
   ${params.outputMode === "questions_only" ? "- Do NOT include model answer." : "- Include complete step-by-step mathematical derivation/reasoning and final answer."}

Ensure formatting is beautifully presented in Markdown with clear headers, bold emphasis, and line breaks.`;

  const aiResult = await callGemini(userPrompt, systemPrompt);

  if (aiResult) return { success: true, result: aiResult };

  // Fallback response if API key is not present or rate limited
  const typeLabel = params.questionType === "mcq" ? "MCQ" : params.questionType === "short" ? "Short Answer" : "Creative Question (CQ)";
  let fallbackText = `### 📝 ${params.subject} — ${params.topic} (${typeLabel} Set)\n`;
  fallbackText += `**Level**: ${params.classLevel} | **Difficulty**: ${params.difficulty.toUpperCase()} | **Total Items**: ${params.count}\n\n---\n\n`;

  for (let i = 1; i <= params.count; i++) {
    if (params.questionType === "mcq") {
      fallbackText += `**Q${i}. What is the primary principle of ${params.topic} in ${params.subject}?**\n`;
      fallbackText += `A) Core concept A\nB) Essential principle B\nC) Secondary factor C\nD) Alternative hypothesis D\n\n`;
      if (params.outputMode !== "questions_only") {
        fallbackText += `> **Correct Answer**: B) Essential principle B\n`;
      }
      if (params.outputMode === "with_explanations") {
        fallbackText += `> **Explanation**: Option B directly addresses the fundamental mechanism of ${params.topic}.\n\n`;
      }
    } else if (params.questionType === "short") {
      fallbackText += `**Q${i}. Explain the concept of ${params.topic} with a suitable example.** (Marks: 4)\n`;
      if (params.outputMode !== "questions_only") {
        fallbackText += `> **Model Answer**: ${params.topic} refers to the process where fundamental rules of ${params.subject} apply. For example, when applying this in practice, key factors must be considered.\n\n`;
      }
    } else {
      fallbackText += `**CQ ${i}. Read the stem and answer the questions below:**\n`;
      fallbackText += `*Stem*: A student conducted an experiment regarding ${params.topic} in ${params.subject} and recorded key parameters.\n`;
      fallbackText += `a) Define ${params.topic}. (1 mark)\n`;
      fallbackText += `b) Why is this concept important in ${params.subject}? (2 marks)\n`;
      fallbackText += `c) Analyze the student's experimental observations. (3 marks)\n`;
      fallbackText += `d) Evaluate the practical applications and outcomes. (4 marks)\n\n`;
    }
  }

  return { success: true, result: fallbackText };
}

export async function generateAssignment(params: AssignmentGenParams, idToken?: string) {
  const authState = await verifyUserAuth(idToken);
  if (authState.role !== "tutor" && authState.role !== "owner" && authState.role !== "admin") throw new Error("Unauthorized");
  await checkAiFeatureAccess(authState.tutorId || authState.uid);

  const cleanDirective = `
CRITICAL FORMATTING & NOTATION RULES:
1. Do NOT include any introductory greetings, pleasantries, meta-commentary, or conversational fluff. Start DIRECTLY with the assignment title and objectives immediately.
2. MATH & UNIT NOTATION: Do NOT write raw LaTeX code wrapped in dollar signs (e.g. do NOT write '$\\frac{1}{9}$', '$F \\propto \\frac{1}{d^2}$', '$9 \\times 10^9 \\text{ N}$'). Write all numbers, units, fractions, and powers in clean, professional standard notation and Unicode symbols (e.g. 1/9, 50 N, 5 N/C, 9 × 10⁹ N, F ∝ 1/d²).
3. Use pristine, high-level academic language adhering to board exam standards (NCTB / Cambridge O/A Level).`;

  let modeDirective = "";
  if (params.outputMode === "questions_only") {
    modeDirective = "\n\nCONTENT MODE: Generate questions and section tasks ONLY. Omit all answer keys, solutions, or model answers.";
  } else if (params.outputMode === "with_answers") {
    modeDirective = "\n\nCONTENT MODE: Generate assignment tasks along with concise Answer Keys / Model Solutions at the end.";
  } else {
    modeDirective = "\n\nCONTENT MODE: Generate comprehensive assignment tasks along with detailed step-by-step Model Solutions, explanations, and marking rubrics.";
  }

  const systemPrompt = `You are TutorMate AI — a Senior Board Curriculum Designer & Master Academic Controller. Your goal is to draft comprehensive, highly structured, and engaging student assignments with clear learning outcomes and evaluation rubrics.${cleanDirective}`;

  const userPrompt = `Create an in-depth homework assignment for:
- Subject: "${params.subject}"
- Topic: "${params.topic}"
- Difficulty: ${params.difficulty.toUpperCase()}
- Total Marks: ${params.maxMarks}
- Special Tutor Instructions: "${params.instructions || "Include real-world applications and step-by-step problem solving."}"${modeDirective}

Include:
1. **Assignment Header & Objectives**: Clear statement of learning goals.
2. **Section A: Foundational Concepts & Definitions**: Short-answer conceptual checks.
3. **Section B: Core Problem Solving & Application**: In-depth analytical tasks with breakdown of marks.
4. **Section C: Critical Thinking / Case Study**: Real-world application question.
5. **Detailed Rubric & Marking Scheme**: Breakdown of how marks are awarded (e.g. Accuracy, Steps, Presentation).
6. **Submission Guidelines & Hints**: Helpful advice for students.`;

  const aiResult = await callGemini(userPrompt, systemPrompt);

  if (aiResult) return { success: true, result: aiResult };

  const fallbackText = `### 📋 Assignment: ${params.topic}\n` +
    `**Subject**: ${params.subject} | **Total Marks**: ${params.maxMarks} | **Difficulty**: ${params.difficulty.toUpperCase()}\n\n` +
    `#### 🎯 Learning Objectives\n` +
    `- Demonstrate understanding of core concepts in ${params.topic}.\n` +
    `- Apply analytical techniques to solve practical problems.\n\n` +
    `#### ✏️ Tasks & Questions\n` +
    `1. **Theoretical Conceptualization (${Math.round(params.maxMarks * 0.3)} Marks)**\n` +
    `   Write a detailed summary explaining the core mechanisms of ${params.topic}.\n\n` +
    `2. **Practical Problem Solving (${Math.round(params.maxMarks * 0.5)} Marks)**\n` +
    `   Solve the analytical problem related to ${params.topic} step-by-step showing all calculations and reasoning.\n\n` +
    `3. **Critical Reflection (${Math.round(params.maxMarks * 0.2)} Marks)**\n` +
    `   Briefly discuss how ${params.topic} connects with real-world applications in ${params.subject}.\n\n` +
    `#### 📊 Grading Rubric\n` +
    `- **Accuracy & Correctness**: 50%\n` +
    `- **Clarity & Workings**: 30%\n` +
    `- **Presentation & Formatting**: 20%\n\n` +
    `*Note for Students: Submit clean PDF scans or handwritten copies before the deadline.*`;

  return { success: true, result: fallbackText };
}

export async function generateLessonPlan(params: LessonPlanParams, idToken?: string) {
  const authState = await verifyUserAuth(idToken);
  if (authState.role !== "tutor") throw new Error("Unauthorized");

  const cleanDirective = (params.cleanOutputOnly ?? true)
    ? "\n\nCRITICAL DIRECTIVE: Do NOT include any introductory greetings (e.g. 'Hello! I am TutorMate AI...'), pleasantries, meta-commentary, or conversational fluff. Start DIRECTLY with the lesson plan title and overview immediately in clean Markdown format."
    : "";

  const systemPrompt = `You are an expert master educator and pedagogy specialist. Design an actionable, minute-by-minute lesson plan tailored for effective classroom and online private batch teaching.${cleanDirective}`;

  const userPrompt = `Design a ${params.durationMins}-minute master lesson plan for:
- Subject: "${params.subject}"
- Chapter/Topic: "${params.chapter}"
- Target Audience/Batch: "${params.targetAudience}"

Format with rich Markdown headings:
1. **Lesson Summary & Prerequisite Knowledge**
2. **Key Learning Objectives & Formulas/Definitions**
3. **Minute-by-Minute Session Timeline**:
   - 0-5 Mins: Warm-up Hook & Attendance Check
   - 5-25 Mins: Core Concept Explanation & Board Work (include key points to write on board)
   - 25-40 Mins: Worked Examples & Guided Problem Solving
   - 40-50 Mins: Student Practice & On-the-spot Doubt Clearing
   - 50-${params.durationMins} Mins: Summary Recap, Exit Ticket Quiz & Homework Assignment
4. **Common Student Misconceptions & How to Address Them**
5. **Teacher's Note & Tips for Engagement**`;

  const aiResult = await callGemini(userPrompt, systemPrompt);

  if (aiResult) return { success: true, result: aiResult };

  const directTime = Math.max(15, params.durationMins - 25);
  const fallbackText = `### 📖 Lesson Plan: ${params.chapter}\n` +
    `**Subject**: ${params.subject} | **Duration**: ${params.durationMins} Mins | **Target Audience**: ${params.targetAudience}\n\n` +
    `---\n\n` +
    `#### ⏰ Time Breakdown\n\n` +
    `1. **Warm-up & Introduction (5 Mins)**\n` +
    `   - Greet students and review previous session topics.\n` +
    `   - Present an intriguing question about ${params.chapter}.\n\n` +
    `2. **Core Lecture & Concepts (${directTime} Mins)**\n` +
    `   - Explain key definitions and primary formulas/principles.\n` +
    `   - Walk through 2-3 solved examples step-by-step on the board.\n\n` +
    `3. **Guided Practice & Student Solving (10 Mins)**\n` +
    `   - Give students a sample problem to solve individually or in pairs.\n` +
    `   - Circulate around the batch to provide individual guidance.\n\n` +
    `4. **Wrap-up & Homework Assignment (5 Mins)**\n` +
    `   - Summarize 3 key takeaways from ${params.chapter}.\n` +
    `   - Assign homework exercises from textbook/study materials.`;

  return { success: true, result: fallbackText };
}

export async function publishGeneratedContentAsAssignment(
  params: {
    batchId: string;
    title: string;
    content: string;
    deadline: string;
    maxMarks: number;
  },
  idToken?: string
) {
  const authState = await verifyUserAuth(idToken);
  if (authState.role !== "tutor" && authState.role !== "owner" && authState.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const { createAssignment, publishAssignment } = await import("./assignmentActions");

  // 1. Create the assignment in database
  const createRes = await createAssignment(
    {
      title: params.title,
      description: params.content,
      batchId: params.batchId,
      deadline: params.deadline,
      maxMarks: params.maxMarks,
    },
    idToken || ""
  );

  if (!createRes?.assignmentId) {
    throw new Error("Failed to create assignment record");
  }

  // 2. Immediately publish assignment to notify enrolled students
  await publishAssignment(createRes.assignmentId, idToken || "");

  return { success: true, assignmentId: createRes.assignmentId };
}

export async function suggestDoubtAnswer(doubtText: string, subject?: string, idToken?: string) {
  const authState = await verifyUserAuth(idToken);
  if (authState.role !== "tutor") throw new Error("Unauthorized");

  const systemPrompt = `You are an encouraging, expert academic tutor helping a student understand a challenging concept.
Answer with extreme clarity, step-by-step explanation, friendly tone, and simple real-world analogies where helpful.`;

  const userPrompt = `A student asked the following doubt in ${subject || "their course"}:
"${doubtText}"

Draft a clear, friendly, and complete solution:
1. **Direct Answer / Summary**: Concise overview.
2. **Step-by-Step Explanation**: Break down the reasoning or mathematical solution clearly.
3. **Key Concept / Real-World Analogy**: Why this works.
4. **Follow-up Question for Student**: A quick self-test question to confirm they understood.`;

  const aiResult = await callGemini(userPrompt, systemPrompt);

  if (aiResult) return { success: true, result: aiResult };

  const fallbackText = `Hello! Great question. Here is the step-by-step solution to your doubt:\n\n` +
    `1. **Understanding the Core Question**:\n` +
    `   When dealing with "${doubtText.slice(0, 80)}...", we need to break it down into fundamental principles.\n\n` +
    `2. **Step-by-Step Breakdown**:\n` +
    `   - Step 1: Identify given variables and definitions.\n` +
    `   - Step 2: Apply the standard formula or rule for this concept.\n` +
    `   - Step 3: Simplify to reach the final answer.\n\n` +
    `3. **Key Takeaway**:\n` +
    `   Always double check units and conditions. Let me know if you want another practice problem on this!`;

  return { success: true, result: fallbackText };
}

export async function generateParentMessage(params: ParentMessageParams, idToken?: string) {
  const authState = await verifyUserAuth(idToken);
  if (authState.role !== "tutor") throw new Error("Unauthorized");

  const langInstruction = params.language === "bn"
    ? "Write in highly polite, respectful, standard Bengali (বাংলা) appropriate for Bangladeshi parents."
    : params.language === "banglish"
    ? "Write in friendly, easy-to-read Banglish (Bengali written in clear Latin/English script)."
    : "Write in professional, polite, and reassuring English.";

  const systemPrompt = `You are a respectful, professional private tutor writing a communication message to a student's parent. ${langInstruction}`;

  const userPrompt = `Draft a SMS / WhatsApp message to the parent of student "${params.studentName}".
Reason/Topic: ${params.issueType}
Additional details provided by tutor: "${params.contextDetails || "Regular update"}"

Guidelines:
- Keep it concise, polite, encouraging, and clear.
- Include a respectful greeting and closing signature from "TutorMate / Teacher".
- Clearly state the purpose without sounding overly harsh.`;

  const aiResult = await callGemini(userPrompt, systemPrompt);

  if (aiResult) return { success: true, result: aiResult };

  let fallbackText = "";
  if (params.language === "bn") {
    if (params.issueType === "absent") {
      fallbackText = `আসসালামু আলাইকুম। ${params.studentName}-এর অভিভাবক, অবগতির জন্য জানাচ্ছি যে আজকের ব্যাচে ${params.studentName} অনুপস্থিত ছিল। কোনো সমস্যার কারণে ক্লাস মিস হয়ে থাকলে আমাদের জানান। ধন্যবাদ।`;
    } else if (params.issueType === "fee_due") {
      fallbackText = `আসসালামু আলাইকুম। ${params.studentName}-এর টিউশন ফি সংক্রান্ত একটি বিনম্র স্মারক। সুবিধাজনক সময়ে চলতি মাসের ফি পরিশোধ করার অনুরোধ করা হচ্ছে। কোনো সহায়তার প্রয়োজন হলে যোগাযোগ করুন।`;
    } else if (params.issueType === "praise") {
      fallbackText = `আসসালামু আলাইকুম। অত্যন্ত আনন্দের সাথে জানাচ্ছি যে ${params.studentName} ইদানীং ক্লাসে খুব ভালো মনোযোগ দিচ্ছে এবং চমৎকার পারফর্ম করছে! আপনারা ওর এই ধারাবাহিকতায় অনুপ্রেরণা যোগাবেন।`;
    } else {
      fallbackText = `আসসালামু আলাইকুম। ${params.studentName}-এর পড়ালেখার অগ্রগতি সংক্রান্ত আপডেট দিতে আপনাকে এই মেসেজটি পাঠানো হয়েছে। ${params.contextDetails || "সবকিছু ঠিকঠাক চলছে।"} ধন্যবাদ।`;
    }
  } else if (params.language === "banglish") {
    fallbackText = `Assalamu Alaikum. ${params.studentName} er poralekhar update niye message dichhi. ${params.contextDetails || "Shob thikthak cholche, ar kono proyojone amader janaben."} Dhonnobad!`;
  } else {
    fallbackText = `Dear Parent, Assalamu Alaikum.\n\nThis is a brief update regarding ${params.studentName}. ${params.contextDetails || "Please feel free to reach out if you have any questions regarding their academic progress."}\n\nBest regards,\nTutorMate`;
  }

  return { success: true, result: fallbackText };
}

export async function sendParentPortalNotification(params: {

  studentId: string;
  title: string;
  message: string;
}, idToken?: string) {
  const authState = await verifyUserAuth(idToken);
  if (authState.role !== "tutor" && authState.role !== "owner" && authState.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const adminSupabase = createAdminClient();

  // Find linked parent user_id
  const { data: links } = await adminSupabase
    .from("parent_links")
    .select("parent_uid")
    .eq("student_id", params.studentId);

  // Find student record
  const { data: student } = await adminSupabase
    .from("students")
    .select("auth_uid, full_name")
    .eq("id", params.studentId)
    .single();

  let sentCount = 0;

  // Insert notification for linked parents
  if (links && links.length > 0) {
    for (const link of links) {
      if (link.parent_uid) {
        const { createNotification } = await import("./notificationActions");
        await createNotification(
          link.parent_uid,
          params.title || `Tutor Notice: ${student?.full_name || "Student"}`,
          params.message,
          "announcement",
          params.studentId,
          "student"
        );
        sentCount++;
      }
    }
  }

  // Insert notification for student
  if (student?.auth_uid) {
    const { createNotification } = await import("./notificationActions");
    await createNotification(
      student.auth_uid,
      params.title || "Tutor Message",
      params.message,
      "announcement",
      params.studentId,
      "student"
    );
    sentCount++;
  }

  return { success: true, sentCount };
}

export async function generateWeeklySummary(idToken?: string) {
  const authState = await verifyUserAuth(idToken);
  if (authState.role !== "tutor") throw new Error("Unauthorized");

  const tutorId = authState.tutorId || authState.uid;
  const adminSupabase = createAdminClient();

  const [studentRes, batchRes, attendanceRes, feeRes, doubtRes] = await Promise.all([
    adminSupabase.from("students").select("id", { count: "exact" }).eq("tutor_id", tutorId),
    adminSupabase.from("batches").select("id", { count: "exact" }).eq("tutor_id", tutorId),
    adminSupabase.from("attendance").select("status").eq("tutor_id", tutorId),
    adminSupabase.from("fees").select("amount_paid, amount_due, status").eq("tutor_id", tutorId),
    adminSupabase.from("doubts").select("status").eq("tutor_id", tutorId),
  ]);

  const studentCount = studentRes.count || 0;
  const batchCount = batchRes.count || 0;
  const totalAttendance = attendanceRes.data?.length || 0;
  const presentCount = attendanceRes.data?.filter((a) => a.status === "present").length || 0;
  const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 100;
  
  const pendingDoubts = doubtRes.data?.filter((d) => d.status === "pending").length || 0;
  const totalCollected = feeRes.data?.reduce((sum, f) => sum + (Number(f.amount_paid) || 0), 0) || 0;

  const systemPrompt = "You are TutorMate AI — an executive academic consultant analyzing tutor batch performance and financial/operational health.";
  const userPrompt = `Generate a high-level weekly executive analysis report for a tutor with live database stats:
- Total Enrolled Students: ${studentCount}
- Active Teaching Batches: ${batchCount}
- Average Student Attendance Rate: ${attendanceRate}%
- Total Tuition Fees Collected: ৳${totalCollected.toLocaleString()}
- Pending Unresolved Student Doubts: ${pendingDoubts}

Structure:
1. **Executive Performance Summary**
2. **Academic & Engagement Analysis** (Attendance vs Doubts response)
3. **Financial & Fee Management Status**
4. **3 Strategic Actionable Recommendations** for next week to boost student satisfaction, retention, and timely fee payments.`;

  const aiResult = await callGemini(userPrompt, systemPrompt);

  if (aiResult) return { success: true, result: aiResult };

  const fallbackText = `### 📈 Weekly AI Executive Summary for Tutor\n\n` +
    `**Overview**:\n` +
    `- **Active Batches**: ${batchCount} batches managed\n` +
    `- **Active Students**: ${studentCount} enrolled\n` +
    `- **Attendance Consistency**: ${attendanceRate}% overall student presence\n` +
    `- **Collected Tuition Income**: ৳${totalCollected.toLocaleString()}\n` +
    `- **Unresolved Student Doubts**: ${pendingDoubts} pending\n\n` +
    `#### 💡 AI Key Insights & Recommendations\n` +
    `1. **Boost Attendance**: ${attendanceRate < 85 ? "Attendance is slightly low. Send automated parent alerts for missed classes." : "Attendance rate is healthy! Keep up the regular session tracking."}\n` +
    `2. **Clear Pending Doubts**: ${pendingDoubts > 0 ? `You have ${pendingDoubts} unanswered student questions. Use the AI Doubt Helper to quickly reply to them.` : "All student doubts are answered! Great responsiveness."}\n` +
    `3. **Fee Collection**: Send polite fee reminders before mid-month to prevent overdue balances.`;

  return { success: true, result: fallbackText };
}
