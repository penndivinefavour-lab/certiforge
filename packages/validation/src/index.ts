// CertiForge Validation Library
import { z } from 'zod';

// Recipient validation
export const recipientSchema = z.object({
  name: z.string().min(1, 'Recipient name is required'),
  email: z.string().email('Invalid email address').optional(),
  externalId: z.string().optional(),
  metadata: z.record(z.string()).optional()
});

export type RecipientInput = z.infer<typeof recipientSchema>;

// CSV/XLSX import validation
export const importRowSchema = z.record(z.string());

export type ImportValidationResult = {
  valid: number;
  warnings: Array<{ row: number; field: string; message: string }>;
  errors: Array<{ row: number; field: string; message: string; value?: string }>;
  raw: any[][];
  headers: string[];
};

// Validate imported rows
export function validateImportRows(
  rows: any[][],
  headers: string[],
  requiredFields: string[] = []
): ImportValidationResult {
  const valid: any[] = [];
  const warnings: ImportValidationResult['warnings'] = [];
  const errors: ImportValidationResult['errors'] = [];
  
  for (let i = 1; i < rows.length; i++) { // Skip header row
    const row = rows[i];
    const rowErrors: ImportValidationResult['errors'] = [];
    const rowWarnings: ImportValidationResult['warnings'] = [];
    
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const value = row[j]?.toString().trim();
      
      // Check required fields
      if (requiredFields.includes(header) && (!value || value === '')) {
        rowErrors.push({
          row: i + 1,
          field: header,
          message: `${header} is required`
        });
      }
      
      // Validate email format
      if (header.toLowerCase().includes('email') && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          rowErrors.push({
            row: i + 1,
            field: header,
            message: 'Invalid email format',
            value
          });
        }
      }
      
      // Check for duplicates
      if (header.toLowerCase().includes('name') && value) {
        const duplicates = rows.slice(i + 1).some(r => r[j]?.toString().trim() === value);
        if (duplicates) {
          rowWarnings.push({
            row: i + 1,
            field: header,
            message: 'Duplicate name detected'
          });
        }
      }
    }
    
    if (rowErrors.length === 0) {
      valid.push(row);
    }
    warnings.push(...rowWarnings);
    errors.push(...rowErrors);
  }
  
  return {
    valid: valid.length,
    warnings,
    errors,
    raw: rows,
    headers
  };
}

// Template validation
export const templateElementSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'image', 'shape', 'qr_code']),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().optional(),
  content: z.string().optional(),
  style: z.record(z.unknown()).optional(),
  dynamic: z.object({
    field: z.string(),
    fallback: z.string().optional()
  }).optional()
});

export type TemplateElementInput = z.infer<typeof templateElementSchema>;

// Validate template serialization
export function validateTemplateElements(elements: any[]): boolean {
  for (const el of elements) {
    try {
      templateElementSchema.parse(el);
    } catch {
      return false;
    }
  }
  return true;
}

// Certificate verification
export const certificateVerificationSchema = z.object({
  certificateId: z.string().min(1),
  recipientName: z.string().min(1).optional()
});

export type CertificateVerificationInput = z.infer<typeof certificateVerificationSchema>;
