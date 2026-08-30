"use client";

import { useState, useCallback, useRef } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
}

interface UseConfirmReturn {
  /**
   * Call this to show a confirmation dialog.
   * Returns a Promise<boolean>: true if user confirmed, false if cancelled.
   *
   * @example
   * const ok = await confirm({ title: "Delete student?", description: "This is irreversible." });
   * if (ok) await deleteStudent(id);
   */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Render this node in your component JSX. */
  ConfirmDialogNode: React.ReactNode;
}

/**
 * useConfirm — A Promise-based confirm dialog hook.
 *
 * Replaces browser's native window.confirm() with a styled modal that matches
 * TutorMate's design system. The dialog resolves with true/false.
 *
 * @example
 * function MyPage() {
 *   const { confirm, ConfirmDialogNode } = useConfirm();
 *
 *   async function handleDelete(studentId: string) {
 *     const ok = await confirm({
 *       title: "Remove Student?",
 *       description: "This will remove the student from your roster. This action cannot be undone.",
 *       confirmLabel: "Remove Student",
 *       variant: "danger",
 *     });
 *     if (ok) await deleteStudent(studentId);
 *   }
 *
 *   return (
 *     <>
 *       {ConfirmDialogNode}
 *       <button onClick={() => handleDelete("abc-123")}>Remove</button>
 *     </>
 *   );
 * }
 */
export function useConfirm(): UseConfirmReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: "",
    description: "",
  });

  // Store the resolve function from the Promise so we can call it when user acts
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    resolveRef.current?.(true);
    resolveRef.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  const ConfirmDialogNode = (
    <ConfirmDialog
      isOpen={isOpen}
      title={options.title}
      description={options.description}
      confirmLabel={options.confirmLabel}
      cancelLabel={options.cancelLabel}
      variant={options.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, ConfirmDialogNode };
}
