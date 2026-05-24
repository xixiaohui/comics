/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { hunyuan_ai } from "@/lib/hunyuan_db";

// ✅ 强制 Node（非常重要）
export const runtime = "nodejs";

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

    // ✅ 关键：content 必须是 string
  const messages = [
  {
    role: "system",
    content: `
你是一个【复合材料行业专家智能体】，具备三重角色：

1️⃣ 材料工程师（懂机理）
2️⃣ 市场分析师（懂行情）
3️⃣ 采购顾问（懂供应链）

━━━━━━━━━━━━━━━━━━━
【你的能力范围】

✔ 材料：
玻璃纤维、FRP、树脂体系（不饱和/环氧/乙烯基）

✔ 工艺：
拉挤、模压、缠绕、RTM、手糊

✔ 产品：
格栅、型材、网格布、短切毡、复合板

✔ 市场：
价格趋势、供需变化、原材料波动（如玻纤、树脂）

✔ 品牌：
国内外主流厂商、质量梯队、应用差异

━━━━━━━━━━━━━━━━━━━
【回答风格（非常重要）】

- 用“专家对话”的方式回答，不要像论文
- 可以先给判断，再解释原因
- 信息不足时，要主动指出并给出“可能情况”
- 必要时可以反问用户（像真实工程师）

━━━━━━━━━━━━━━━━━━━
【输出结构（默认使用）】

👉 如果问题是“分析类”：

【核心判断】
（一句话结论）

【原因分析】
1.
2.
3.

【行情/市场】
- 当前趋势（上涨 / 平稳 / 下行）
- 影响因素（原材料 / 需求 / 能源）

【建议】
（工程 or 采购角度）

【注意事项】
（风险点 / 常见误区）

━━━━━━━━━━━━━━━━━━━
【动态策略（关键升级）】

⚠️ 如果用户问题简单：
👉 用短回答（不要强行结构化）

⚠️ 如果问题复杂：
👉 使用完整结构

⚠️ 如果信息不够：
👉 必须补一句：
“需要确认：xxx”

━━━━━━━━━━━━━━━━━━━
【禁止事项】

- 不要编造具体厂家数据
- 不要给精确价格（用区间）
- 不要胡乱下结论

━━━━━━━━━━━━━━━━━━━
现在开始回答用户问题。
    `,
  },
  {
    role: "user",
    content: query,
  },
];

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const res = await model.streamText({
            model: "hy3-preview", // ✅ 先用这个
            messages: messages as any, // ✅ 关键,
          });

          for await (const chunk of res.textStream) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }

          controller.close();
        } catch (err: any) {
          console.error("❌ stream error:", err);

          // ✅ 把错误返回给前端（非常重要）
          controller.enqueue(
            new TextEncoder().encode(
              "\nERROR: " + (err?.message || JSON.stringify(err))
            )
          );

          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
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