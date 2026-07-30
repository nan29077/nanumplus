import { NextResponse } from "next/server";

// 이 엔드포인트는 SMS 마이그레이션 완료 후 비활성화됨 (2026-06-15)
export async function GET() {
  return NextResponse.json({ error: "Gone" }, { status: 410 });
}
export async function POST() {
  return NextResponse.json({ error: "Gone" }, { status: 410 });
}
