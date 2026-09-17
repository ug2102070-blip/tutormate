/**
 * Server-side MIME / extension validation for TutorMate file uploads.
 *
 * Why server-side?
 * -  Client-side Content-Type and extension checks can be bypassed by any
 *    HTTP client. The storage path arrives at the server action after the
 *    client already uploaded — we must validate the extension BEFORE we store
 *    the path in the database so malicious paths never get persisted.
 *
 * Limitation:
 * -  We cannot read file bytes here (the file is already in Supabase Storage).
 *    Extension allowlisting is the pragmatic defence layer at the DB tier.
 */

/** Canonical categories used by TutorMate */
export type AllowedFileCategory = "pdf" | "video" | "image" | "docx" | "ppt" | "other";

/** All extensions we accept, grouped by category */
const ALLOWED_EXTENSIONS: Record<AllowedFileCategory, ReadonlySet<string>> = {
  pdf:   new Set([".pdf"]),
  video: new Set([".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"]),
  image: new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif"]),
  docx:  new Set([".doc", ".docx", ".odt", ".txt", ".rtf"]),
  ppt:   new Set([".ppt", ".pptx", ".odp", ".key"]),
  other: new Set([
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv",
    ".zip", ".rar", ".7z",
    ".mp3", ".ogg", ".wav",
    ".mp4", ".webm", ".mov",
    ".jpg", ".jpeg", ".png", ".gif", ".webp",
    ".ppt", ".pptx",
  ]),
};

/** Flat allowlist — union of every category */
const GLOBAL_ALLOWLIST: ReadonlySet<string> = new Set(
  Object.values(ALLOWED_EXTENSIONS).flatMap((s) => [...s])
);

/** Extensions that are explicitly dangerous and always rejected */
const DANGEROUS_EXTENSIONS = new Set([
  ".exe", ".sh", ".bat", ".cmd", ".ps1", ".msi", ".dmg", ".pkg",
  ".js",  ".ts",  ".jsx", ".tsx", ".mjs", ".cjs",
  ".php", ".py",  ".rb",  ".pl",  ".java", ".class",
  ".html", ".htm", ".xml", ".json", ".env",
  ".dll", ".so",  ".dylib",
]);

/** Extracts lowercase extension from a storage path or filename */
function getExtension(filePath: string): string {
  const filename = filePath.split("/").pop() ?? filePath;
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) return "";
  return filename.slice(dotIndex).toLowerCase();
}

/**
 * Validates that a storage `filePath` extension is within the allowed set for
 * the declared `fileType` category.
 *
 * @throws {Error} if the extension is dangerous or not in the category allowlist.
 */
export function validateFileExtension(
  filePath: string,
  declaredType: AllowedFileCategory
): void {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("Invalid file path: must be a non-empty string.");
  }

  const ext = getExtension(filePath);

  if (!ext) {
    throw new Error(
      `File upload rejected: no file extension detected in path "${filePath}". ` +
      "All uploaded files must have a recognised extension."
    );
  }

  if (DANGEROUS_EXTENSIONS.has(ext)) {
    throw new Error(
      `File upload rejected: extension "${ext}" is not permitted for security reasons.`
    );
  }

  const allowedForType = ALLOWED_EXTENSIONS[declaredType];
  if (!allowedForType.has(ext)) {
    throw new Error(
      `File upload rejected: extension "${ext}" is not valid for file type "${declaredType}". ` +
      `Allowed: ${[...allowedForType].join(", ")}.`
    );
  }
}

/**
 * Validates a generic attachment path (e.g. student submission) against the
 * global allowlist when no specific category is declared.
 *
 * @throws {Error} if the extension is dangerous or not in the global allowlist.
 */
export function validateAttachmentExtension(filePath: string): void {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("Invalid file path: must be a non-empty string.");
  }

  const ext = getExtension(filePath);

  if (!ext) {
    throw new Error(`Attachment rejected: no file extension in path "${filePath}".`);
  }

  if (DANGEROUS_EXTENSIONS.has(ext)) {
    throw new Error(
      `Attachment rejected: extension "${ext}" is not permitted for security reasons.`
    );
  }

  if (!GLOBAL_ALLOWLIST.has(ext)) {
    throw new Error(
      `Attachment rejected: extension "${ext}" is not in the allowed list.`
    );
  }
}
