import "server-only";
import type { AiErrorCode } from "@/features/ai/domain/contracts";

export class AiError extends Error {
  constructor(readonly code: AiErrorCode, readonly status = 502) {
    super(code);
  }
}
