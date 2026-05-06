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

    const { collection, ...fields } = body; // ⭐ 关键改动


    // ⭐ 核心：自动拆 data
    let cleanFields = fields;

    if ("data" in fields && typeof fields.data === "object") {
      cleanFields = fields.data;
    }

    // ⭐ 参数校验
    if (!collection || typeof collection !== "string") {
      return NextResponse.json(
        { success: false, error: "collection 不能为空" },
        { status: 400, headers: corsHeaders },
      );
    }

    if (!fields || Object.keys(fields).length === 0) {
      return NextResponse.json(
        { success: false, error: "数据不能为空" },
        { status: 400, headers: corsHeaders },
      );
    }

    // ⭐ 数据大小限制
    const MAX_SIZE = 16 * 1024;
    if (JSON.stringify(fields).length > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "数据过大" },
        { status: 413, headers: corsHeaders },
      );
    }

    // ⭐ 自动字段
    const now = Date.now();
    const newData = {
      ...cleanFields,
      created_at: now,
      updated_at: now,
    };

    console.log("新增数据：", newData);

    // ✅ 写入数据库
    const res = await db.collection(collection).add(newData);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: res.id,
        },
      },
      { headers: corsHeaders },
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || "服务器错误",
      },
      { status: 500, headers: corsHeaders },
    );
  }
}
