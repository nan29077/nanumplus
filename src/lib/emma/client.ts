/**
 * EMMA DB 클라이언트
 *
 * EMMA는 PostgreSQL 기반이며, 기본적으로 나눔플러스와 같은 DB(DATABASE_URL)를 공유한다고 가정.
 * EMMA가 별도 DB를 사용하는 경우 EMMA_DB_URL 환경변수를 설정한다.
 *
 * 동작 방식:
 *  - EMMA_DB_URL이 DATABASE_URL과 같거나 미설정 → 기존 Prisma 클라이언트 재사용
 *  - EMMA_DB_URL이 다른 DB를 가리킬 경우 → 전용 PrismaClient 생성
 */

import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ymKst, prevYmKst } from "@/lib/kst-date";

let _emmaClient: PrismaClient | null = null;

/** EMMA DB에 연결된 Prisma 클라이언트를 반환 */
export function getEmmaClient(): PrismaClient {
  const emmaDbUrl = process.env.EMMA_DB_URL;
  const defaultDbUrl = process.env.DATABASE_URL;

  // 별도 EMMA DB URL이 없거나 기본 DB와 동일하면 공용 클라이언트 사용
  if (!emmaDbUrl || emmaDbUrl === defaultDbUrl) {
    return prisma as unknown as PrismaClient;
  }

  // 별도 EMMA DB 전용 클라이언트 (싱글톤)
  if (!_emmaClient) {
    _emmaClient = new PrismaClient({
      datasources: { db: { url: emmaDbUrl } },
      log: process.env.NODE_ENV === "development" ? ["error"] : [],
    });
  }
  return _emmaClient;
}

/** 현재 YYYYMM 문자열 반환 (EMMA 테이블명 suffix) — KST 기준 */
export function getEmmaSuffix(date: Date = new Date()): string {
  return ymKst(date);
}

/** 전월 YYYYMM 문자열 반환 (말일 23:59에 다음달 테이블이 없을 경우 대비) — KST 기준 */
export function getPrevEmmaSuffix(date: Date = new Date()): string {
  return prevYmKst(date);
}

/** EMMA 설정이 활성화되어 있는지 확인 */
export function isEmmaEnabled(): boolean {
  return !!process.env.EMMA_ID && process.env.INFOBANK_PROVIDER === "live";
}
