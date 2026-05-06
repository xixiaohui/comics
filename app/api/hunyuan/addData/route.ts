/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/hunyuan_db";

// ✅ 统一 CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ✅ 处理预检请求
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// ✅ POST 新增数据
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { collection, data } = body;

    // ⭐ 参数校验
    if (!collection || typeof collection !== "string") {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: "collection 不能为空",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!data || typeof data !== "object") {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: "data 必须是对象",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ⭐ 数据大小限制（防止滥用）
    const MAX_SIZE = 16 * 1024;
    if (JSON.stringify(data).length > MAX_SIZE) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: "数据过大",
        }),
        {
          status: 413,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ⭐ 自动字段
    const now = Date.now();
    const newData = {
      ...data,
      created_at: now,
      updated_at: now,
    };

    // ✅ 写入数据库
    const res = await db.collection(collection).add({
      data: newData,
    });

    return new NextResponse(
      JSON.stringify({
        success: true,
        data: {
          id: res.id,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: err.message || "服务器错误",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}