/**
 * EMMA MT (Mobile Terminated) sender module
 *
 * Inserts a record into em_mt_log_YYYYMM so EMMA agent picks it up and sends SMS.
 *
 * em_mt_log_YYYYMM columns:
 *   mt_key        VARCHAR(50)  PK
 *   service_type  CHAR(2)
 *   emma_id       CHAR(2)      -- first 2 chars of EMMA_ID env var (e.g. "na" from "nanum")
 *   mt_recipient  VARCHAR(32)  -- recipient phone (donor)
 *   mt_originator VARCHAR(32)  -- sender phone (registered number, 07041582540)
 *   msg_type      CHAR(1)      -- '1'=SMS
 *   content       VARCHAR(4000)
 *   mt_status     CHAR(1)      -- '3'=pending
 *   date_mt       TIMESTAMP
 *   date_mt_send  TIMESTAMP
 *   callback      VARCHAR(32)
 */

import { randomUUID } from "crypto";
import { getEmmaClient, getEmmaSuffix } from "./client";
import type { EmmaMtSendRequest, EmmaMtSendResult } from "./types";

/** Register MT in EMMA queue table so EMMA agent sends the SMS */
export async function sendEmmaMt(
  req: EmmaMtSendRequest
): Promise<EmmaMtSendResult> {
  // EMMA_ID = "nanum" -> use first 2 chars "na" for CHAR(2) DB field
  const emmaIdFull = process.env.EMMA_ID ?? "  ";
  const emmaId = emmaIdFull.substring(0, 2).padEnd(2, " ");

  const suffix = getEmmaSuffix();
  const table = `em_mt_log_${suffix}`;
  const mtKey = `MT-${randomUUID().replace(/-/g, "").substring(0, 32)}`;
  const now = new Date();

  const client = getEmmaClient();

  try {
    await ensureMtTable(suffix);

    await client.$queryRawUnsafe(
      `INSERT INTO ${table} (
        mt_key, service_type, emma_id,
        mt_recipient, mt_originator, msg_type,
        content, mt_status, date_mt, date_mt_send, callback
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      )`,
      mtKey,
      "MO",
      emmaId,
      req.recipientPhone,
      req.senderPhone,
      "1",
      req.content,
      "3",
      now,
      now,
      req.senderPhone
    );

    return { mtKey, status: "QUEUED" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[emma-mt] MT queue insert failed:", message);
    return { mtKey, status: "ERROR", message };
  }
}

/** Create em_mt_log_YYYYMM table if it does not exist */
async function ensureMtTable(suffix: string): Promise<void> {
  const client = getEmmaClient();
  const table = `em_mt_log_${suffix}`;

  await client.$queryRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${table} (
      mt_key        VARCHAR(50)  NOT NULL,
      service_type  CHAR(2)      NOT NULL DEFAULT 'MO',
      emma_id       CHAR(2)      NOT NULL DEFAULT '  ',
      mt_recipient  VARCHAR(32)  NOT NULL,
      mt_originator VARCHAR(32)  NOT NULL,
      msg_type      CHAR(1)      NOT NULL DEFAULT '1',
      content       VARCHAR(4000),
      mt_status     CHAR(1)      NOT NULL DEFAULT '3',
      date_mt       TIMESTAMP    NOT NULL DEFAULT now(),
      date_mt_send  TIMESTAMP    NOT NULL DEFAULT now(),
      callback      VARCHAR(32),
      result_code   VARCHAR(10),
      result_msg    VARCHAR(200),
      date_mt_result TIMESTAMP,
      CONSTRAINT pk_${table} PRIMARY KEY (mt_key)
    )
  `);
}
