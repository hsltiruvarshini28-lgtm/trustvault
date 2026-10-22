import path from 'path';

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 Megabytes

export interface AllowedFileType {
  extension: string;
  mimeType: string;
  magicBytesValidator?: (buffer: Buffer) => boolean;
}

// Magic bytes validators
function isPdf(buf: Buffer): boolean {
  return buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46; // %PDF
}

function isPng(buf: Buffer): boolean {
  return (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  );
}

function isJpeg(buf: Buffer): boolean {
  return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

function isZipBasedOffice(buf: Buffer): boolean {
  // PK\x03\x04 ZIP header
  return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
}

function isPlainText(buf: Buffer): boolean {
  if (buf.length === 0) return false;
  // Inspect the first 1024 bytes for null bytes or illegal control characters
  const sampleLength = Math.min(buf.length, 1024);
  for (let i = 0; i < sampleLength; i++) {
    const byte = buf[i];
    // Reject null bytes and non-printable control characters below ASCII 32 except \t, \n, \r
    if (byte === 0x00 || (byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d)) {
      return false;
    }
  }
  return true;
}

export const ALLOWED_FILE_TYPES: Record<string, AllowedFileType> = {
  '.pdf': {
    extension: '.pdf',
    mimeType: 'application/pdf',
    magicBytesValidator: isPdf,
  },
  '.docx': {
    extension: '.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    magicBytesValidator: isZipBasedOffice,
  },
  '.xlsx': {
    extension: '.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    magicBytesValidator: isZipBasedOffice,
  },
  '.pptx': {
    extension: '.pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    magicBytesValidator: isZipBasedOffice,
  },
  '.txt': {
    extension: '.txt',
    mimeType: 'text/plain',
    magicBytesValidator: isPlainText,
  },
  '.png': {
    extension: '.png',
    mimeType: 'image/png',
    magicBytesValidator: isPng,
  },
  '.jpg': {
    extension: '.jpg',
    mimeType: 'image/jpeg',
    magicBytesValidator: isJpeg,
  },
  '.jpeg': {
    extension: '.jpeg',
    mimeType: 'image/jpeg',
    magicBytesValidator: isJpeg,
  },
};

export interface FileValidationResult {
  valid: boolean;
  sanitizedFilename: string;
  detectedMimeType: string;
  extension: string;
  error?: string;
}

/**
 * Strips path traversal sequences, control characters, and unsafe characters from a filename.
 */
export function sanitizeFilename(filename: string): string {
  // Strip null bytes and directory separators
  const base = path.basename(filename).replace(/[\0\r\n\t]/g, '');
  // Keep only alphanumeric characters, dashes, underscores, dots, and spaces
  const cleaned = base.replace(/[^a-zA-Z0-9.\-_ ]/g, '_').trim();
  // Prevent dot-only files or empty names
  if (!cleaned || cleaned.startsWith('.') || cleaned === '..') {
    return `document_${Date.now()}`;
  }
  // Enforce reasonable length
  return cleaned.length > 100 ? cleaned.substring(0, 100) : cleaned;
}

/**
 * Deeply validates an uploaded file buffer against:
 * 1. Empty buffer check
 * 2. Maximum file size limits
 * 3. File extension allowlist
 * 4. Binary signature (magic bytes) matching the extension
 */
export function validateUploadedFile(
  buffer: Buffer,
  originalFilename: string,
  clientMimeType?: string
): FileValidationResult {
  if (!buffer || buffer.length === 0) {
    return {
      valid: false,
      sanitizedFilename: '',
      detectedMimeType: '',
      extension: '',
      error: 'File is empty (0 bytes).',
    };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      sanitizedFilename: '',
      detectedMimeType: '',
      extension: '',
      error: `File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`,
    };
  }

  const sanitized = sanitizeFilename(originalFilename);
  const ext = path.extname(sanitized).toLowerCase();

  const allowedType = ALLOWED_FILE_TYPES[ext];
  if (!allowedType) {
    return {
      valid: false,
      sanitizedFilename: sanitized,
      detectedMimeType: '',
      extension: ext,
      error: `File type "${ext}" is not permitted. Allowed extensions: ${Object.keys(ALLOWED_FILE_TYPES).join(', ')}.`,
    };
  }

  // Check magic bytes / file signature
  if (allowedType.magicBytesValidator) {
    const signatureValid = allowedType.magicBytesValidator(buffer);
    if (!signatureValid) {
      return {
        valid: false,
        sanitizedFilename: sanitized,
        detectedMimeType: allowedType.mimeType,
        extension: ext,
        error: `File signature mismatch for "${sanitized}". File contents do not match the expected binary structure for ${ext}.`,
      };
    }
  }

  return {
    valid: true,
    sanitizedFilename: sanitized,
    detectedMimeType: allowedType.mimeType,
    extension: ext,
  };
}
