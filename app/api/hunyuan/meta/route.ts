/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/hunyuan_db";

// ✅ 强制使用 Node（CloudBase 必须）
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    // ⭐ 获取参数
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");

    // ⭐ 安全限制
    const pageSize = Math.max(1, Math.min(100, limit));
    const pageIndex = Math.max(1, page);

    const skip = (pageIndex - 1) * pageSize;

    // ⭐ 查询数据（注意：get() 最后调用）
    const result = await db
      .collection("collections_meta")
      .skip(skip)
      .limit(pageSize)
      .get();

    // ⭐ 查询总数
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

    return NextResponse.json({
      success: true,
      data,
      page: pageIndex,
      limit: pageSize,
      total,
      hasMore,
    });

  } catch (err: any) {
    console.error("❌ meta API error:", err);

    return NextResponse.json(
      {
        success: false,
        error: err.message || "服务器错误",
      },
      { status: 500 }
    );
  }
}