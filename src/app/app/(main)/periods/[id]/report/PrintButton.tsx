"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-secondary">
      인쇄 / PDF로 저장
    </button>
  );
}
