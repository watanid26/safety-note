"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";

export type ActionResult = { ok: boolean; message?: string } | null;
export type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

/**
 * 서버 액션을 감싸는 폼. 실패하면 입력값을 그대로 두고 이유를 보여준다.
 * 성공하면 resetOnSuccess 일 때 폼을 비운다.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  successMessage,
}: {
  action: FormAction;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  successMessage?: string;
}) {
  const [state, formAction] = useFormState<ActionResult, FormData>(action, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state && !state.ok && (
        <p role="alert" className="mt-2 text-sm text-bad">
          {state.message ?? "저장하지 못했습니다. 다시 시도해 주세요."}
        </p>
      )}
      {state?.ok && (state.message || successMessage) && (
        <p role="status" className="mt-2 text-sm text-ok">
          {state.message ?? successMessage}
        </p>
      )}
    </form>
  );
}

export function SubmitButton({
  children,
  pendingText = "저장 중…",
  className = "btn-primary",
  name,
  value,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} name={name} value={value}>
      {pending ? pendingText : children}
    </button>
  );
}
