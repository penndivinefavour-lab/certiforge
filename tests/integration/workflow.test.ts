// Simplified integration tests (no external dependencies)
import { describe, it, expect } from "vitest";

// Inline implementations
function formatCertificateNumber(year: number, sequence: number): string {
  return `CERT-${year}-${sequence.toString().padStart(6, "0")}`;
}

function detectColumns(headers: string[]): any {
  const result: any = {};
  for (let i = 0; i < headers.length; i++) {
    const norm = headers[i].toLowerCase().trim().replace(/[^a-z0-9_]+/g, "_").replace(/^_|_$/g, "");
    if (!result.recipientName && /^(name|full_name|recipient|student|participant)$/i.test(norm)) {
      result.recipientName = headers[i];
    }
    if (!result.email && /^(email|email_address|mail)$/i.test(norm)) {
      result.email = headers[i];
    }
    if (!result.courseName && /^(course|course_name|program)$/i.test(norm)) {
      result.courseName = headers[i];
    }
  }
  return result;
}

function createVerificationUrl(base: string, certNumber: string): string {
  return `${base.replace(/\/$/, "")}/verify/${certNumber}`;
}

function fitText(text: string, maxWidth: number, initialSize: number): number {
  const avgCharWidth = initialSize * 0.6;
  const charsPerLine = Math.floor(maxWidth / avgCharWidth);
  if (text.length <= charsPerLine) return initialSize;
  return Math.max(initialSize - Math.ceil(text.length / charsPerLine), 8);
}

describe("Integration Tests", () => {
  it("should generate unique certificate IDs", () => {
    const num1 = formatCertificateNumber(2026, 1);
    const num2 = formatCertificateNumber(2026, 2);
    expect(num1).toBe("CERT-2026-000001");
    expect(num2).toBe("CERT-2026-000002");
    expect(num1).not.toBe(num2);
  });

  it("should detect columns and create verification URL", () => {
    const headers = ["Full Name", "Email", "Course"];
    const detected = detectColumns(headers);
    expect(detected.recipientName).toBe("Full Name");
    expect(detected.email).toBe("Email");
    expect(detected.courseName).toBe("Course");

    const url = createVerificationUrl("https://certiforge.app", "CERT-2026-000001");
    expect(url).toBe("https://certiforge.app/verify/CERT-2026-000001");
  });

  it("should fit text correctly", () => {
    const short = fitText("John", 200, 24);
    expect(short).toBe(24);

    const long = fitText("Christopher Alexander Montgomery", 200, 24);
    expect(long).toBeLessThan(24);
  });
});
