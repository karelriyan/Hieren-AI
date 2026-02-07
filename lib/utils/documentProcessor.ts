/**
 * Document processing utilities for various file formats
 * Supports: DOCX, XLSX, CSV, and other text-based formats
 */

import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

/**
 * Convert HTML table to plain text format
 */
function htmlTableToText(tableHtml: string): string {
  if (typeof window === 'undefined') {
    // Server-side fallback
    return tableHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(tableHtml, 'text/html');
  const table = doc.querySelector('table');

  if (!table) return '';

  const rows: string[][] = [];
  const tableRows = table.querySelectorAll('tr');

  tableRows.forEach((tr) => {
    const cells: string[] = [];
    const tableCells = tr.querySelectorAll('td, th');
    tableCells.forEach((cell) => {
      cells.push(cell.textContent?.trim() || '');
    });
    if (cells.length > 0) {
      rows.push(cells);
    }
  });

  // Convert to CSV-like format
  return rows.map(row => row.join(' | ')).join('\n');
}

/**
 * Extract text content from a DOCX file with table preservation
 */
export async function extractTextFromDocx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    // Convert to HTML to preserve table structure
    const result = await mammoth.convertToHtml({ arrayBuffer });

    if (!result.value || result.value.trim().length === 0) {
      throw new Error('No content found in DOCX file');
    }

    // Parse HTML to extract text and tables
    if (typeof window === 'undefined') {
      // Server-side fallback: just strip HTML tags
      return result.value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(result.value, 'text/html');
    let extractedText = '';

    // Process each element in body
    const bodyElements = doc.body.childNodes;
    bodyElements.forEach((element) => {
      if (element.nodeType === Node.ELEMENT_NODE) {
        const el = element as Element;

        if (el.tagName === 'TABLE') {
          // Convert table to structured text
          extractedText += '\n\n[TABLE]\n';
          extractedText += htmlTableToText(el.outerHTML);
          extractedText += '\n[/TABLE]\n\n';
        } else {
          // Extract text from other elements
          const text = el.textContent?.trim();
          if (text) {
            extractedText += text + '\n';
          }
        }
      }
    });

    if (extractedText.trim().length === 0) {
      throw new Error('No text content found in DOCX file');
    }

    return extractedText.trim();
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error('Failed to extract text from DOCX file');
  }
}

/**
 * Extract text content from an Excel file (XLSX, XLS)
 */
export async function extractTextFromExcel(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    let fullText = '';

    // Process each sheet
    workbook.SheetNames.forEach((sheetName, index) => {
      const worksheet = workbook.Sheets[sheetName];

      // Convert sheet to CSV format (easier to read)
      const csvContent = XLSX.utils.sheet_to_csv(worksheet);

      fullText += `\n--- Sheet ${index + 1}: ${sheetName} ---\n`;
      fullText += csvContent;
      fullText += '\n';
    });

    if (fullText.trim().length === 0) {
      throw new Error('No data found in Excel file');
    }

    return fullText.trim();
  } catch (error) {
    console.error('Error extracting text from Excel:', error);
    throw new Error('Failed to extract text from Excel file');
  }
}

/**
 * Extract text from CSV file
 */
export async function extractTextFromCSV(file: File): Promise<string> {
  try {
    const text = await file.text();

    if (!text || text.trim().length === 0) {
      throw new Error('No content found in CSV file');
    }

    return `--- CSV Data ---\n${text}`;
  } catch (error) {
    console.error('Error reading CSV:', error);
    throw new Error('Failed to read CSV file');
  }
}

/**
 * Extract text from plain text file (TXT, MD, etc.)
 */
export async function extractTextFromPlainText(file: File): Promise<string> {
  try {
    const text = await file.text();

    if (!text || text.trim().length === 0) {
      throw new Error('No content found in text file');
    }

    return text;
  } catch (error) {
    console.error('Error reading text file:', error);
    throw new Error('Failed to read text file');
  }
}

/**
 * Validate document file
 */
export function validateDocument(file: File): { valid: boolean; error?: string } {
  const supportedTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/msword', // DOC
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
    'application/vnd.ms-excel', // XLS
    'text/csv', // CSV
    'text/plain', // TXT
    'text/markdown', // MD
  ];

  // Check file type
  if (!supportedTypes.includes(file.type) && !file.name.match(/\.(docx?|xlsx?|csv|txt|md)$/i)) {
    return {
      valid: false,
      error: `Unsupported file type. Supported: DOCX, XLSX, CSV, TXT, MD`
    };
  }

  // Check file size (max 20MB)
  const maxSize = 20 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'Document file size must be less than 20MB' };
  }

  return { valid: true };
}

/**
 * Get document type from file
 */
export function getDocumentType(file: File): 'docx' | 'xlsx' | 'csv' | 'txt' | 'unknown' {
  const extension = file.name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'docx':
    case 'doc':
      return 'docx';
    case 'xlsx':
    case 'xls':
      return 'xlsx';
    case 'csv':
      return 'csv';
    case 'txt':
    case 'md':
      return 'txt';
    default:
      return 'unknown';
  }
}
