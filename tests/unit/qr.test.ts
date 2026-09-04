// QR Code generator tests
import { describe, it, expect } from "vitest";

// Inline URL generation
function createVerificationUrl(base: string, certificateId: string): string {
  return `${base.replace(/\/$/, "")}/verify/${certificateId}`;
}

describe("QR Code Generator", () => {
  describe("createVerificationUrl", () => {
    it("should create correct verification URL", () => {
      const base = "https://certiforge.app";
      const certNumber = "CERT-2026-000001";
      const url = createVerificationUrl(base, certNumber);

      expect(url).toBe("https://certiforge.app/verify/CERT-2026-000001");
    });

    it("should handle trailing slash", () => {
      const base = "https://certiforge.app/";
      const certNumber = "CERT-2026-000001";
      const url = createVerificationUrl(base, certNumber);

      expect(url).toBe("https://certiforge.app/verify/CERT-2026-000001");
    });
  });
});
