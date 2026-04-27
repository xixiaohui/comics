/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/hunyuan_db";

// ✅ 统一 CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ✅ 处理预检请求（必须）
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

    const collection = searchParams.get("collection");

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // ⭐ 参数校验
    if (!collection) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: "缺少 collection 参数",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (page < 1 || limit < 1) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: "page 和 limit 必须大于 0",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const skip = (page - 1) * limit;

    const result = await db
      .collection(collection)
      .orderBy("created_at", "desc")
      .skip(skip)
      .limit(limit + 1)
      .get();

    const list = result.data || [];
    const hasMore = list.length > limit;
    const data = hasMore ? list.slice(0, limit) : list;

    return new NextResponse(
      JSON.stringify({
        success: true,
        data,
        page,
        limit,
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
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: err.message,
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