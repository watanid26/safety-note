import type { Company } from "@/lib/db/schema";
import { EMPLOYEE_BAND_LABEL, INDUSTRY_LABEL } from "@/lib/checklist/templates";

export function CompanyFields({ company, withMyName = false }: { company?: Company; withMyName?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label" htmlFor="name">회사 이름 *</label>
        <input id="name" name="name" required maxLength={80} defaultValue={company?.name} className="input" placeholder="(주)한빛정밀" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="siteName">사업장 이름</label>
        <input id="siteName" name="siteName" maxLength={80} defaultValue={company?.siteName ?? ""} className="input" placeholder="본사 공장 (사업장이 여러 곳이면 사업장마다 따로 만드세요)" />
      </div>
      <div>
        <label className="label" htmlFor="industry">업종 *</label>
        <select id="industry" name="industry" required defaultValue={company?.industry ?? ""} className="input">
          <option value="" disabled>골라 주세요</option>
          {Object.entries(INDUSTRY_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="employeeBand">상시근로자 수 *</label>
        <select id="employeeBand" name="employeeBand" required defaultValue={company?.employeeBand ?? ""} className="input">
          <option value="" disabled>골라 주세요</option>
          {Object.entries(EMPLOYEE_BAND_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="ceoName">경영책임자 이름</label>
        <input id="ceoName" name="ceoName" maxLength={40} defaultValue={company?.ceoName ?? ""} className="input" placeholder="대표이사 홍길동" />
      </div>
      <div>
        <label className="label" htmlFor="ceoEmail">경영책임자 이메일</label>
        <input id="ceoEmail" name="ceoEmail" type="email" defaultValue={company?.ceoEmail ?? ""} className="input" placeholder="마감 알림과 최종 확인용" />
      </div>
      {withMyName && (
        <div className="sm:col-span-2">
          <label className="label" htmlFor="myName">내 이름</label>
          <input id="myName" name="myName" maxLength={40} className="input" placeholder="점검 기록에 남는 이름" />
        </div>
      )}
    </div>
  );
}
