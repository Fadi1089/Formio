import type { Response } from "express";
import {
  PUBLIC_SUBMIT_ERROR_CODES,
  type PublicSubmitErrorCode,
} from "../config/publicAntiSpam";

const PUBLIC_SUBMIT_MESSAGES: Record<PublicSubmitErrorCode, string> = {
  [PUBLIC_SUBMIT_ERROR_CODES.INVALID_SUBMIT_TOKEN]:
    "This form session is invalid. Please refresh the page and try again.",
  [PUBLIC_SUBMIT_ERROR_CODES.EXPIRED_SUBMIT_TOKEN]:
    "This form session has expired. Please refresh the page to continue.",
  [PUBLIC_SUBMIT_ERROR_CODES.SPAM_DETECTED]: "Submission could not be processed.",
  [PUBLIC_SUBMIT_ERROR_CODES.SUBMITTED_TOO_FAST]:
    "Please wait a moment before submitting.",
  [PUBLIC_SUBMIT_ERROR_CODES.RATE_LIMITED]:
    "Too many submissions for this form. Please try again later.",
};

export function sendPublicSubmitError(
  res: Response,
  code: PublicSubmitErrorCode,
  statusCode = 400
) {
  res.status(statusCode).json({
    error: PUBLIC_SUBMIT_MESSAGES[code],
    code,
  });
}
