/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/hunyuan_db";

// ✅ 强制 Node（你这个是对的）
export const runtime = "nodejs";

// ✅ 统一 CORS（建议后面抽出去复用）
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ✅ 预检请求（必须有）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// ✅ 主接口
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    // ⭐ 参数
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");

    const pageSize = Math.max(1, Math.min(100, limit));
    const pageIndex = Math.max(1, page);

    const skip = (pageIndex - 1) * pageSize;

    // ⭐ 数据查询
    const result = await db
      .collection("collections_meta")
      .skip(skip)
      .limit(pageSize)
      .get();

    // ⭐ 总数
    const countRes = await db.collection("collections_meta").count();
    const total = countRes.total;

    const data = result.data || [];
    const hasMore = skip + data.length < total;

    console.log("分页查询:", {
      page: pageIndex,
      limit: pageSize,
      returned: data.length,
      total,
    });

    return new NextResponse(
      JSON.stringify({
        success: true,
        data,
        page: pageIndex,
        limit: pageSize,
        total,
        hasMore,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err: any) {
    console.error("❌ meta API error:", err);

    return new NextResponse(
      JSON.stringify({
        success: false,
        error: err.message || "服务器错误",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
}