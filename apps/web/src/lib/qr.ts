import "server-only";
import QRCode from "qrcode";
import { getEnv } from "./env";

// "M" survives a smudged or partly covered print and keeps the code sparse enough to scan from
// across a table.
const ERROR_CORRECTION = "M";

/** The address printed on the table cards. */
export function guestUrl(slug: string): string {
  return `${getEnv().APP_URL}/e/${slug}`;
}

export function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: "svg", errorCorrectionLevel: ERROR_CORRECTION, margin: 2 });
}

/** PNG with the 4-module quiet zone scanners expect around a standalone code. */
export function qrPng(url: string, width: number): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: "png",
    errorCorrectionLevel: ERROR_CORRECTION,
    margin: 4,
    width,
  });
}
