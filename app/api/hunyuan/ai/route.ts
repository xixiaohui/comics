/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { genkit } from "genkit";
import { z } from "zod";

// ===== 初始化 =====
const API_KEY = process.env.DEEPSEEK_API_KEY;

if (!API_KEY) {
  throw new Error("❌ DEEPSEEK_API_KEY 未设置");
}

// ===== DeepSeek 调用 =====
async function callDeepSeek(messages: any[]) {
  const res = await axios.post(
    "https://api.deepseek.com/v1/chat/completions",
    {
      model: "deepseek-chat",
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    },
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    },
  );

  return res.data.choices[0].message.content;
}

// ===== 初始化 Genkit =====
const ai = genkit({
  plugins: [],
  model: "deepseek-chat", // 可选
});

// ===== Flow =====
const analyzeFlow = ai.defineFlow(
  {
    name: "analyzeFlow",
    inputSchema: z.object({
      query: z.string(),
    }),
    outputSchema: z.string(),
  },
  async ({ query }) => {
    const messages = [
      {
        role: "system",
        content: "你是材料行业专家，擅长分析玻璃纤维、FRP、复合材料。",
      },
      {
        role: "user",
        content: `
请分析以下问题：

${query}

请按格式输出：
【结论】
【原因】
【建议】
`,
      },
    ];

    const result = await callDeepSeek(messages);

    return result;
  },
);

// ===== API（Next.js Route Handler）=====
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json({ error: "query 不能为空" }, { status: 400 });
    }

    const result = await analyzeFlow({ query });

    return NextResponse.json({ result });
  } catch (e: any) {
    console.error("❌ AI error:", e.response?.data || e.message);

    return NextResponse.json({ error: "AI调用失败" }, { status: 500 });
  }
}
