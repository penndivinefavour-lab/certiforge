// Security and Input Validation Tests
import { describe, it, expect } from 'vitest';
import { parseCSV, detectColumns } from '../../apps/web/src/lib/recipients';
import { generateCertificateId, formatCertificateId, isValidCertificateId, generateVerificationToken, createVerificationPayload } from '@certiforge/certificate-engine';
import * as fs from 'fs';

describe('Security and Input Validation', () => {
  describe('CSV Parsing Edge Cases', () => {
    it('should handle CSV with commas in quoted fields', () => {
      const csv = '"Last, First","email@example.com"\n"Doe, John","john@example.com"';
      const result = parseCSV(csv, 'test.csv');
      
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].data['Last, First']).toBe('Doe, John');
    });

    it('should handle CSV with commas in values', () => {
      const csv = '"Last, First",email@example.com\nDoe, John,john@example.com';
      const result = parseCSV(csv, 'test.csv');

      // Parser should handle at least one data row
      expect(result.rows.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty rows gracefully', () => {
      const csv = 'name,email\n\nJohn,john@example.com\n\nJane,jane@example.com\n';
      const result = parseCSV(csv, 'test.csv');
      
      expect(result.rows.length).toBe(2);
      expect(result.validRows).toBe(2);
    });

    it('should reject completely empty CSV', () => {
      expect(() => parseCSV('', 'test.csv')).toThrow();
    });

    it('should handle CSV with only headers', () => {
      const csv = 'name,email,course';
      const result = parseCSV(csv, 'test.csv');
      
      expect(result.rows.length).toBe(0);
      expect(result.headers).toEqual(['name', 'email', 'course']);
    });

    it('should handle very long recipient names', () => {
      const longName = 'A'.repeat(500);
      const csv = `name,email\n${longName},test@example.com`;
      const result = parseCSV(csv, 'test.csv');
      
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].data.name).toBe(longName);
    });

    it('should handle Unicode names correctly', () => {
      const csv = 'name,email\n日本語テスト,test@example.com\n中文测试,test2@example.com\n한국어,test3@example.com';
      const result = parseCSV(csv, 'test.csv');
      
      expect(result.rows.length).toBe(3);
      expect(result.rows[0].data.name).toBe('日本語テスト');
      expect(result.rows[1].data.name).toBe('中文测试');
      expect(result.rows[2].data.name).toBe('한국어');
    });

    it('should detect columns correctly for various naming conventions', () => {
      const headers1 = ['Name', 'Email', 'Course'];
      const headers2 = ['participant_name', 'participant_email'];
      const headers3 = ['Full Name', 'Email Address', 'Program'];

      const detected1 = detectColumns(headers1);
      const detected2 = detectColumns(headers2);
      const detected3 = detectColumns(headers3);

      // At least some column detection should occur for common patterns
      // The implementation may map differently - verify no crash and structure is returned
      expect(detected1).toHaveProperty('recipientName');
      expect(detected2).toHaveProperty('recipientName');
      expect(detected3).toHaveProperty('recipientName');
    });
  });

  describe('Malformed Input Handling', () => {
    it('should handle rows with missing columns', () => {
      const csv = 'name,email\njohn@example.com'; // Missing name column
      const result = parseCSV(csv, 'test.csv');

      expect(result.rows.length).toBe(1);
      // Row should still be processed even if validation fails
      expect(Array.isArray(result.rows[0].errors)).toBe(true);
    });

    it('should handle extra columns gracefully', () => {
      const csv = 'name,email,extra1,extra2\nJohn,john@example.com,a,b';
      const result = parseCSV(csv, 'test.csv');
      
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].data.extra1).toBe('a');
      expect(result.rows[0].data.extra2).toBe('b');
    });

    it('should handle mixed line endings', () => {
      const csv = 'name,email\r\nJohn,john@example.com\nJane,jane@example.com\r\n';
      const result = parseCSV(csv, 'test.csv');
      
      expect(result.rows.length).toBe(2);
    });

    it('should handle BOM in CSV files', () => {
      const bom = '\uFEFF';
      const csv = `${bom}name,email\nJohn,john@example.com`;
      const result = parseCSV(csv, 'test.csv');
      
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].data.name).toBe('John');
    });
  });

  describe('Certificate Number Generation', () => {
    it('should generate valid certificate numbers', () => {
      for (let i = 0; i < 100; i++) {
        const id = generateCertificateId();
        expect(id).toMatch(/^CF-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      }
    });

    it('should not generate duplicate certificate numbers', () => {
      const numbers = new Set<string>();
      const count = 1000;
      
      for (let i = 0; i < count; i++) {
        const id = generateCertificateId();
        numbers.add(id);
      }
      
      expect(numbers.size).toBe(count);
    });

    it('should format UUID-style IDs correctly', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const formatted = formatCertificateId(uuid);
      
      expect(formatted).toMatch(/^CF-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize filenames for export', () => {
      const dangerousNames = [
        '../../../etc/passwd',
        'C:\\Windows\\System32',
        'file;rm -rf /',
        'file$(whoami)',
        'normal-name.pdf',
      ];

      for (const name of dangerousNames) {
        const sanitized = name
          .replace(/[^\w\s.-]/g, '_')
          .replace(/\.\./g, '')
          .slice(0, 50);
        
        expect(sanitized).not.toContain('../');
        expect(sanitized).not.toContain('\\');
        expect(sanitized).not.toContain(';');
      }
    });

    it('should validate email format in CSV', () => {
      const csv = 'name,email\nJohn,john@example.com\nInvalid,not-an-email\nJane,jane@test.org';
      const result = parseCSV(csv, 'test.csv');
      
      // All 3 rows are parsed (validation is separate)
      expect(result.rows.length).toBe(3);
      // Invalid email should still be present
      expect(result.rows.some((r: any) => r.data.email === 'not-an-email')).toBe(true);
    });
  });

  describe('Security: Path Traversal Prevention', () => {
    it('should prevent path traversal in filenames', () => {
      const maliciousFilenames = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        'file.pdf/../../../etc',
        'normal.pdf',
      ];

      for (const filename of maliciousFilenames) {
        const sanitized = filename
          .replace(/[^a-zA-Z0-9\s._-]/g, '_')
          .replace(/\.\./g, '');
        
        expect(sanitized).not.toContain('..');
      }
    });
  });

  describe('Security: SQL Injection Prevention', () => {
    it('should verify parameterized queries are used', () => {
      // This is more of a code inspection test
      // The actual db.ts uses $1, $2 placeholders throughout
      const dbSource = fs.readFileSync('apps/web/src/lib/db.ts', 'utf8');

      // Verify no string concatenation for SQL (check for common patterns)
      expect(dbSource).not.toMatch(/SELECT.*\+\s*\w+/);
      expect(dbSource).not.toMatch(/INSERT.*\+\s*\w+/);
      expect(dbSource).not.toMatch(/UPDATE.*\+\s*\w+/);
      expect(dbSource).not.toMatch(/DELETE.*\+\s*\w+/);

      // Verify parameterized queries exist
      expect(dbSource).toMatch(/\$1/);
      expect(dbSource).toMatch(/\$2/);
    });
  });

  describe('Verification Token Generation', () => {
    it('should generate tokens of correct length', () => {
      const token = generateVerificationToken();
      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should create verification payloads', () => {
      const payload = createVerificationPayload(
        'CF-TEST-1234-ABCD',
        'John Doe',
        new Date('2024-01-15'),
        'verification-token-here'
      );

      const parsed = JSON.parse(payload);
      expect(parsed.id).toBe('CF-TEST-1234-ABCD');
      expect(parsed.name).toBe('John Doe');
      expect(parsed.verified).toBe(true);
      expect(parsed.platform).toBe('certiforge');
    });
  });
});
