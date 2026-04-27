/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

// ⚠️ 这里换成你的数据库实例
import { db } from "@/lib/hunyuan_db"; 

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const collection = searchParams.get("collection");

    // ⭐ 分页参数
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // ✅ 参数校验
    if (!collection) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少 collection 参数",
        },
        { status: 400 }
      );
    }

    if (page < 1 || limit < 1) {
      return NextResponse.json(
        {
          success: false,
          error: "page 和 limit 必须大于 0",
        },
        { status: 400 }
      );
    }

    const skip = (page - 1) * limit;

    // ⭐ 查询数据
    const result = await db
      .collection(collection)
      .orderBy("created_at", "desc")
      .skip(skip)
      .limit(limit + 1) // 多查一条判断 hasMore
      .get();

    const list = result.data || [];

    const hasMore = list.length > limit;

    const data = hasMore ? list.slice(0, limit) : list;

    console.log("集合:", collection, "页:", page, "数量:", data.length);
    console.log(data[0]);

    return NextResponse.json({
      success: true,
      data,
      page,
      limit,
      hasMore,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}