import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { repairFileName, safeFileName } from "./evidence-storage";

describe("파일 이름", () => {
  it("latin1 로 깨진 한글 이름을 되살린다", () => {
    const broken = Buffer.from("하반기 교육일지.pdf", "utf8").toString("latin1");
    expect(repairFileName(broken)).toBe("하반기 교육일지.pdf");
  });
  it("정상 이름은 그대로 둔다", () => {
    expect(repairFileName("하반기 교육일지.pdf")).toBe("하반기 교육일지.pdf");
    expect(repairFileName("report.pdf")).toBe("report.pdf");
    expect(repairFileName("café.pdf")).toBe("café.pdf");
  });
  it("경로 문자를 지운다", () => {
    expect(safeFileName("../../etc/passwd")).toBe(".._.._etc_passwd");
  });
});
