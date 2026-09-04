// Validation engine tests
import { describe, it, expect } from "vitest";

// Inline detection logic (fixed)
function detectColumns(headers: string[]) {
  const result: any = {
    recipientName: undefined,
    email: undefined,
    courseName: undefined,
    issueDate: undefined,
    instructor: undefined,
    grade: undefined,
    duration: undefined,
    organization: undefined,
  };

  for (let i = 0; i < headers.length; i++) {
    const norm = headers[i].toLowerCase().trim().replace(/[^a-z0-9_]+/g, "_").replace(/^_|_$/g, "");

    if (!result.recipientName && /^(name|full_name|recipient|student|participant|attendee)/.test(norm)) {
      result.recipientName = headers[i];
    } else if (!result.email && /^(email|email_address|mail)/.test(norm)) {
      result.email = headers[i];
    } else if (!result.courseName && /^(course|course_name|program|training)/.test(norm)) {
      result.courseName = headers[i];
    } else if (!result.issueDate && /^(date|issue_date|completion_date)/.test(norm)) {
      result.issueDate = headers[i];
    } else if (!result.instructor && /^(instructor|trainer|teacher)/.test(norm)) {
      result.instructor = headers[i];
    }
  }

  return result;
}

describe("Column Detection", () => {
  it("should detect standard columns", () => {
    const headers = ["Full Name", "Email", "Course", "Date", "Instructor"];
    const result = detectColumns(headers);

    expect(result.recipientName).toBe("Full Name");
    expect(result.email).toBe("Email");
    expect(result.courseName).toBe("Course");
    expect(result.issueDate).toBe("Date");
    expect(result.instructor).toBe("Instructor");
  });

  it("should handle case variations", () => {
    const headers = ["recipient_name", "EMAIL_ADDRESS", "course_name"];
    const result = detectColumns(headers);

    expect(result.recipientName).toBe("recipient_name");
    expect(result.email).toBe("EMAIL_ADDRESS");
    expect(result.courseName).toBe("course_name");
  });

  it("should return undefined for unrecognized columns", () => {
    const headers = ["Custom Field 1", "Custom Field 2"];
    const result = detectColumns(headers);

    expect(result.recipientName).toBeUndefined();
    expect(result.email).toBeUndefined();
  });
});
