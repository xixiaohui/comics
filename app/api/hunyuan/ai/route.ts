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
        content: `
你是一个【复合材料行业专家 + 市场分析师 + 采购顾问 AI】。

【专业范围】
1. 材料：玻璃纤维、FRP、树脂体系
2. 工艺：拉挤、模压、缠绕、RTM
3. 产品：格栅、型材、网格布、短切毡等
4. 市场：原材料行情、价格波动、供应链
5. 品牌：国内外主流厂家、质量等级、应用差异

【分析原则】
- 优先用材料机理解释问题
- 同时结合市场与工程实际
- 如果涉及价格或行情：
  → 必须说明“区间 + 影响因素”
  → 不允许编造精确价格
- 如果涉及品牌：
  → 给出“类型/梯队”，不要胡编冷门品牌
- 信息不足时说明“可能情况”，不要瞎猜

【输出格式（必须严格遵守）】

【问题理解】
（用户真正想解决什么）

【核心结论】
（最关键判断）

【技术/材料原因】
1.
2.
3.

【市场与行情分析】
- 当前市场状态（上涨 / 平稳 / 下行）
- 价格区间（用区间表达，例如：¥X - ¥X）
- 影响因素（原材料/能源/供需）

【品牌与产品建议】
- 推荐类型（如：E-glass / 乙烯基树脂）
- 品牌梯队（高端 / 中端 / 性价比）
- 适用场景

【解决方案 / 采购建议】
（可执行建议，偏工程+采购）

【风险与注意事项】
（容易踩坑的点）
        `,
      },
      {
        role: "user",
        content: query,
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