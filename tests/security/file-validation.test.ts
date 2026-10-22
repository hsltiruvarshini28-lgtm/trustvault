import { describe, it, expect } from 'vitest';
import {
  validateUploadedFile,
  sanitizeFilename,
  MAX_FILE_SIZE_BYTES,
} from '@/lib/storage/file-validator';

describe('Private Storage Server-Side File Validator', () => {
  it('Case 18: rejects an oversized file exceeding maximum size', () => {
    // Fake buffer slightly above 15MB
    const oversizedBuffer = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1024);
    const result = validateUploadedFile(oversizedBuffer, 'large.pdf');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds the maximum allowed limit');
  });

  it('rejects an empty (0-byte) file', () => {
    const emptyBuffer = Buffer.alloc(0);
    const result = validateUploadedFile(emptyBuffer, 'empty.pdf');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('File is empty');
  });

  it('Case 19: detects file signature mismatch (executable script disguised as .pdf)', () => {
    // Malicious shell script payload with .pdf extension
    const fakePdfBuffer = Buffer.from('#!/bin/bash\necho "Malicious script running"\n');
    const result = validateUploadedFile(fakePdfBuffer, 'malware.pdf');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('File signature mismatch');
  });

  it('accepts a valid PDF with correct magic bytes (%PDF-)', () => {
    const validPdfBuffer = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
    const result = validateUploadedFile(validPdfBuffer, 'Financial_Report.pdf');

    expect(result.valid).toBe(true);
    expect(result.detectedMimeType).toBe('application/pdf');
    expect(result.sanitizedFilename).toBe('Financial_Report.pdf');
  });

  it('Case 19: sanitizes dangerous filenames and prevents path traversal', () => {
    const rawPathTraversalName = '../../../../etc/passwd';
    const sanitized = sanitizeFilename(rawPathTraversalName);

    expect(sanitized).not.toContain('../');
    expect(sanitized).not.toContain('..\\');
    expect(sanitized).toBe('passwd');

    const dangerousCharsName = 'report<script>alert(1)</script>.pdf';
    const cleaned = sanitizeFilename(dangerousCharsName);
    expect(cleaned).not.toContain('<script>');
    expect(cleaned).toContain('.pdf');
  });

  it('rejects unsupported extensions (e.g., .exe, .sh, .php)', () => {
    const dummyBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00');
    const result = validateUploadedFile(dummyBuffer, 'exploit.exe');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('is not permitted');
  });
});
