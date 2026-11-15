// 이메일 전송 추상화.
//
// 발송 경로를 두 가지 지원한다. 환경변수만 보고 자동으로 고른다.
//
//   1) SMTP   — SMTP_HOST 가 있으면 사용. 기존 메일 계정(Gmail·네이버웍스·
//               회사 메일)의 SMTP 를 그대로 쓴다. **도메인 인증이 필요 없어서
//               오늘 바로 시작할 수 있는 경로.** Gmail 기준 일 500건 한도.
//   2) Resend — RESEND_API_KEY 가 있으면 사용. 발신 도메인 SPF/DKIM 인증이
//               필요한 대신 도달률과 한도가 낫다. 실제 메일을 보낼 땐 이쪽.
//   3) 둘 다 없으면 콘솔 로그 (개발용). **운영에서는 발송 성공으로 치지 않는다.**
//      예전에는 provider="console" 도 ok:true 를 돌려줘서 delivery 가 SENT 로
//      찍혔다. 그러면 나중에 SMTP 를 붙여도 그 알림들은 이미 "보냈다" 로
//      남아 영영 안 나간다 — 조용히 사라지는 알림이 생기는 구조였다.
//      이제 운영에서는 held=true 로 돌려주고, 호출부가 delivery 를 PENDING
//      으로 남겨 설정이 붙는 즉시 밀린 것부터 나가게 한다.
//
// SMTP 를 우선하는 이유: 둘 다 설정돼 있다면 운영자가 의도적으로 SMTP 를
// 넣은 것이므로 그 의도를 존중한다.
//
// 필요한 환경변수
//   EMAIL_FROM   "중대재해 점검노트 <no-reply@example.com>"   (공통)
//   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS      (SMTP 경로)
//   RESEND_API_KEY                                     (Resend 경로)

import { Resend } from "resend";
import nodemailer, { type Transporter } from "nodemailer";

export interface EmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export type EmailProvider = "smtp" | "resend" | "console";

export interface EmailResult {
  ok: boolean;
  providerMessageId?: string;
  provider: EmailProvider;
  error?: string;
  /**
   * 발송 경로가 아예 설정되지 않아 보류된 것. 실패(FAILED)가 아니다 —
   * 재시도 횟수를 태우지 말고 설정이 붙을 때까지 기다려야 한다.
   */
  held?: boolean;
}

function from(): string {
  return process.env.EMAIL_FROM ?? "중대재해 점검노트 <no-reply@safetynote.local>";
}

/** 지금 설정으로 실제 발송이 되는지. 설정 화면에서 안내하는 데 쓴다. */
export function emailProviderInUse(): EmailProvider {
  if (process.env.SMTP_HOST) return "smtp";
  if (process.env.RESEND_API_KEY) return "resend";
  return "console";
}

// ── SMTP ────────────────────────────────────────────────────────────
let cachedSmtp: Transporter | null = null;

function getSmtp(): Transporter | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  if (cachedSmtp) return cachedSmtp;
  const port = Number(process.env.SMTP_PORT ?? "587");
  cachedSmtp = nodemailer.createTransport({
    host,
    port,
    // 465 는 암묵적 TLS, 587 은 STARTTLS.
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
  return cachedSmtp;
}

// ── Resend ──────────────────────────────────────────────────────────
let cachedResend: Resend | null = null;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (cachedResend) return cachedResend;
  cachedResend = new Resend(key);
  return cachedResend;
}

export async function sendEmail(input: EmailInput): Promise<EmailResult> {
  const smtp = getSmtp();
  if (smtp) {
    try {
      const info = await smtp.sendMail({
        from: from(),
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
      return { ok: true, provider: "smtp", providerMessageId: info.messageId };
    } catch (err) {
      return { ok: false, provider: "smtp", error: (err as Error).message };
    }
  }

  const resend = getResend();
  if (resend) {
    try {
      const res = await resend.emails.send({
        from: from(),
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
      if (res.error) return { ok: false, provider: "resend", error: res.error.message };
      return { ok: true, provider: "resend", providerMessageId: res.data?.id };
    } catch (err) {
      return { ok: false, provider: "resend", error: (err as Error).message };
    }
  }

  // 설정이 없을 때.
  //
  // 예전에는 NODE_ENV 로 갈라 개발에서는 ok:true 를 돌려줬다. 그런데 로컬
  // 개발 서버가 외부 운영 DB 에 붙어 있으면 NODE_ENV 는 여전히
  // "development" 라, 아무에게도 안 간 메일이 운영 DB 에 SENT 로 남았다.
  // 발송 기록은 사실이어야 한다 — 보내지 않았으면 보냈다고 쓰지 않는다.
  //
  // 보류(held)는 실패가 아니라서 재시도 횟수를 태우지 않는다. 설정이
  // 붙는 순간 그대로 이어서 나간다.
  //
  // 격리된 로컬 DB 에서 큐 동작만 보고 싶으면 EMAIL_CONSOLE_MARK_SENT=1 로
  // 명시해 열 수 있다. 기본값은 아니다 — 실수로 켜지면 안 되기 때문이다.
  console.log("[email:console]", { to: input.to, subject: input.subject });
  if (process.env.EMAIL_CONSOLE_MARK_SENT === "1") {
    return { ok: true, provider: "console" };
  }
  return {
    ok: false,
    held: true,
    provider: "console",
    error: "이메일 발송 경로가 설정되지 않았습니다 (SMTP_HOST 또는 RESEND_API_KEY)",
  };
}
