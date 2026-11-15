"use client";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-lg p-6">
      <h2 className="text-lg font-semibold">처리하지 못했습니다</h2>
      <p className="mt-2 text-sm text-muted">{error.message || "잠시 후 다시 시도해 주세요."}</p>
      <button onClick={reset} className="btn-secondary mt-4">다시 시도</button>
    </div>
  );
}
