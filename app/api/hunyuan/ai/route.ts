/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { genkit } from "genkit";
import { z } from "zod";

import { hunyuan_ai } from "@/lib/hunyuan_db"; 


// ⭐ 统一 CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ===== 初始化 Genkit =====
const ai = genkit({
  plugins: [],
});

const model = hunyuan_ai.createModel("hunyuan-exp");

// ===== 封装混元调用 =====
async function callHunyuan(messages: any[]) {
  const res = await model.generateText({
    model: "hunyuan-2.0-instruct-20251111",
    messages,
  });

  return res.text;
}

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

请按结构输出：
【结论】
【原因】
【建议】
`,
      },
    ];

    const result = await callHunyuan(messages);

    return result;
  }
);



// ✅ 处理预检请求（关键！）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// ===== API（Next.js）=====
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query } = body;

    if (!query) {
      return new NextResponse(
        JSON.stringify({ error: 'query 不能为空' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const result = await analyzeFlow({ query });

    return new NextResponse(
      JSON.stringify({ result }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (e: any) {
    console.error('❌ AI error:', e);

    return new NextResponse(
      JSON.stringify({ error: 'AI调用失败' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
}