/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { hunyuan_ai } from "@/lib/hunyuan_db";

export const runtime = "nodejs";

// ── CORS ──
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
};

// ===== OPTIONS =====
export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

// ===== POST — OpenAI 兼容流式 chat/completions =====
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ model: string }> },
) {
  try {
    const body = await req.json();
    const { model: subModel, messages, stream: doStream } = body;
    const { model: routeModel } = await params; // hunyuan-exp etc.

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "messages 不能为空" }, { status: 400, headers: corsHeaders });
    }

    // ── 创建模型（route 参数决定 endpoint group） ──
    const aiModel = hunyuan_ai.createModel(routeModel);

    // ── 确保每条 content 是 string ──
    const cleaned = messages.map((m: any) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    }));

    // ── 非流式 ──
    if (!doStream) {
      const res = await aiModel.generateText({
        model: subModel ?? "hy3-preview",
        messages: cleaned,
      });

      return Response.json(
        {
          choices: [
            { index: 0, message: { role: "assistant", content: res.text } },
          ],
        },
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 流式（OpenAI SSE 格式：data: <json>\n\n） ──
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          const res = await aiModel.streamText({
            model: subModel ?? "hy3-preview",
            messages: cleaned,
          });

          for await (const chunk of res.textStream) {
            // OpenAI SSE 格式
            const data = JSON.stringify({
              choices: [
                { index: 0, delta: { content: chunk } },
              ],
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          // 结束标记（Flutter 客户端用 [DONE] 识别流结束）
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err: any) {
          // 错误也以 SSE 格式返回，Flutter 端可捕获
          const errorData = JSON.stringify({
            error: { message: err?.message || "stream error" },
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e: any) {
    console.error("❌ API error:", e);
    return Response.json(
      { error: { message: e?.message || "AI调用失败" } },
      { status: 500, headers: corsHeaders },
    );
  }
}
