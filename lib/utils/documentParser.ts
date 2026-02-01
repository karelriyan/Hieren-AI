/**
 * Document parsing utilities for PDF and DOCX files
 * Extracts text content for document-based queries
 */

/**
 * Extract text from PDF file
 * Uses PDF.js library (needs to be loaded via script tag in HTML)
 */
export async function extractPdfText(file: File): Promise<string> {
  try {
    // Dynamic import of PDF.js
    const pdfjsLib = await import('pdfjs-dist');

    // Set worker source
    const workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => (item.str ? item.str : ''))
        .join(' ');

      fullText += `[Page ${i}]\n${pageText}\n\n`;
    }

    return fullText.trim();
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract text from DOCX file
 * Uses mammoth library for Word document parsing
 */
export async function extractDocxText(file: File): Promise<string> {
  try {
    const mammoth = await import('mammoth');

    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });

    return result.value.trim();
  } catch (error) {
    console.error('DOCX extraction error:', error);
    throw new Error('Failed to extract text from DOCX');
  }
}

/**
 * Parse document based on file type
 */
export async function parseDocument(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'pdf') {
    return extractPdfText(file);
  } else if (extension === 'docx' || extension === 'doc') {
    return extractDocxText(file);
  } else if (extension === 'txt') {
    return file.text();
  }

  throw new Error(`Unsupported document type: ${extension}`);
}

/**
 * Chunk document text for API requests
 * Splits long documents into manageable pieces
 */
export function chunkDocument(
  text: string,
  maxTokens: number = 30000
): string[] {
  // Rough estimate: 1 token ≈ 4 characters
  const maxChars = maxTokens * 4;

  if (text.length <= maxChars) {
    return [text];
  }

  // Split by paragraphs first
  const paragraphs = text.split('\n\n');
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if ((currentChunk + '\n\n' + paragraph).length > maxChars) {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Format document for LLM context
 */
export function formatDocumentContext(text: string, fileName: string): string {
  return `[Document: ${fileName}]

${text}

[End of Document]`;
}

/**
 * Validate document file
 */
export function validateDocument(file: File): { valid: boolean; error?: string } {
  const validExtensions = ['pdf', 'docx', 'doc', 'txt'];
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (!extension || !validExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Unsupported format. Supported: ${validExtensions.join(', ')}`,
    };
  }

  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Document exceeds 50MB limit',
    };
  }

  return { valid: true };
}

/**
 * Estimate token count for text
 * Rough approximation: 1 token ≈ 4 characters
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}
