import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseServiceKey, supabaseUrl } from "@/lib/env";

// 증빙 파일 저장소.
//   운영: Supabase Storage (LawChange 와 같은 프로젝트) 의 private 버킷 "safety-evidence".
//         service role 키로 서버에서만 올리고, 내려받을 때는 60초짜리 서명 URL 을 준다.
//   개발: Supabase 설정이 없으면 프로젝트 폴더의 .local-uploads/ 에 저장한다.
//
// 경로: {companyId}/{periodId}/{itemId}/{uuid}.{확장자}  (원래 파일 이름은 DB 에)

export const EVIDENCE_BUCKET = process.env.SUPABASE_EVIDENCE_BUCKET ?? "safety-evidence";
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const LOCAL_DIR = path.join(process.cwd(), ".local-uploads");

let admin: SupabaseClient | null = null;

function storageMode(): "supabase" | "local" {
  if (supabaseUrl() && supabaseServiceKey()) return "supabase";
  if (process.env.NODE_ENV === "production") {
    throw new Error("증빙 저장소가 설정되지 않았습니다 (SUPABASE_SERVICE_ROLE_KEY 또는 Supabase 연동의 SUPABASE_SECRET_KEY).");
  }
  return "local";
}

function getAdmin(): SupabaseClient {
  if (!admin) {
    admin = createClient(supabaseUrl()!, supabaseServiceKey()!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

/**
 * Next.js 14 서버 액션의 multipart 파서는 파일 이름을 latin1 로 읽어서 한글 이름이 깨진다
 * ("교육일지.pdf" → "êµ\x90ì\x9c¡..."). 깨진 형태면 UTF-8 로 다시 해석한다.
 */
export function repairFileName(name: string): string {
  if (!name || [...name].some((c) => c.charCodeAt(0) > 0xff)) return name;
  if (!/[\u0080-\u00ff]/.test(name)) return name;
  const decoded = Buffer.from(name, "latin1").toString("utf8");
  return decoded.includes("\ufffd") ? name : decoded;
}

export function safeFileName(name: string): string {
  const cleaned = name
    .replace(/[\/\\]/g, "_")
    .replace(/[^\w.\-가-힣 ]/g, "_")
    .trim()
    .slice(0, 100);
  return cleaned || "file";
}

export async function saveEvidenceFile(params: {
  companyId: string;
  periodId: string;
  itemId: string;
  file: File;
}): Promise<{ storagePath: string }> {
  const { file } = params;
  if (file.size > MAX_FILE_BYTES) throw new Error("파일은 10MB 이하만 올릴 수 있습니다.");
  // Supabase Storage 는 한글 등 일부 문자를 객체 키로 받지 않는다. 키는 영문(uuid + 확장자)만 쓰고
  // 원래 파일 이름은 DB(evidence.file_name)에 따로 남긴다.
  const ext = (repairFileName(file.name).match(/\.([A-Za-z0-9]{1,8})$/)?.[1] ?? "bin").toLowerCase();
  const objectPath = `${params.companyId}/${params.periodId}/${params.itemId}/${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (storageMode() === "supabase") {
    const { error } = await getAdmin()
      .storage.from(EVIDENCE_BUCKET)
      .upload(objectPath, bytes, { contentType: file.type || "application/octet-stream", upsert: false });
    if (error) throw new Error(`파일 저장 실패: ${error.message}`);
  } else {
    const full = path.join(LOCAL_DIR, objectPath);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, bytes);
  }
  return { storagePath: objectPath };
}

/** 내려받기. supabase 면 서명 URL, 로컬이면 파일 내용. */
export async function openEvidenceFile(
  storagePath: string,
): Promise<{ kind: "redirect"; url: string } | { kind: "bytes"; data: Buffer }> {
  if (storageMode() === "supabase") {
    const { data, error } = await getAdmin().storage.from(EVIDENCE_BUCKET).createSignedUrl(storagePath, 60);
    if (error || !data) throw new Error(error?.message ?? "서명 URL 발급 실패");
    return { kind: "redirect", url: data.signedUrl };
  }
  const full = path.join(LOCAL_DIR, storagePath);
  if (!full.startsWith(LOCAL_DIR)) throw new Error("잘못된 경로");
  return { kind: "bytes", data: await readFile(full) };
}
