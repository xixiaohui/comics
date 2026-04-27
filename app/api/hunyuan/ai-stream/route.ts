// app/api/hunyuan/ai-stream/route.ts

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { genkit } from "genkit";
import { hunyuan_ai } from "@/lib/hunyuan_db";


// ✅ CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};


const model = hunyuan_ai.createModel("hunyuan-exp");

// ===== OPTIONS =====
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// ===== POST（流式）=====
export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query) {
      return new Response("query不能为空", { status: 400 });
    }

    const messages: any[] = [
    {
        role: "system",
        content: [
        {
            text: `
    你是【复合材料专家 + 市场分析师】，
    必须结构化输出：
    结论 / 原因 / 行情 / 建议
            `,
        },
        ],
    },
    {
        role: "user",
        content: [{ text: query }],
    },
    ];

    // 🚀 关键：ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await model.streamText({
            model: "hunyuan-2.0-instruct-20251111",
            messages,
          });

          for await (const chunk of result.textStream) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }

          controller.close();
        } catch (err) {
          console.error("❌ stream error:", err);
          controller.enqueue(
            new TextEncoder().encode("\n[ERROR]")
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });

  } catch (e: any) {
    console.error("❌ API error:", e);

    return new Response("AI调用失败", {
      status: 500,
      headers: corsHeaders,
    });
  }
}