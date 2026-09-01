import { PDFParse } from 'pdf-parse';
import { parse as parseCsvSync } from 'csv-parse/sync';

const MAX_TEXT_CHARS = 18000; // keep prompt size sane for the LLM

/**
 * Extracts readable text from a PDF buffer.
 */
const extractFromPDF = async (buffer) => {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text || '';
  } finally {
    if (typeof parser.destroy === 'function') {
      await parser.destroy();
    }
  }
};

/**
 * Extracts a plain-text table from a CSV buffer so the LLM can read it
 * the same way it reads extracted PDF text.
 */
const extractFromCSV = (buffer) => {
  const csvString = buffer.toString('utf-8');
  const records = parseCsvSync(csvString, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true
  });

  if (!records.length) return csvString; // fall back to raw content

  const headers = Object.keys(records[0]);
  const lines = [headers.join(' | ')];
  records.forEach((row) => {
    lines.push(headers.map((h) => row[h] ?? '').join(' | '));
  });
  return lines.join('\n');
};

/**
 * Extracts text from an uploaded bank statement file (PDF or CSV).
 * @param {Buffer} buffer
 * @param {string} mimetype
 * @param {string} originalname
 */
export const extractStatementText = async (buffer, mimetype, originalname) => {
  const isCSV = mimetype === 'text/csv' || /\.csv$/i.test(originalname || '');
  const isPDF = mimetype === 'application/pdf' || /\.pdf$/i.test(originalname || '');

  let text;
  if (isCSV) {
    text = extractFromCSV(buffer);
  } else if (isPDF) {
    text = await extractFromPDF(buffer);
  } else {
    throw new Error('Unsupported file type. Please upload a PDF or CSV bank statement.');
  }

  text = (text || '').trim();
  if (!text) {
    throw new Error('Could not read any text from this file. It may be a scanned image PDF or an empty file.');
  }

  if (text.length > MAX_TEXT_CHARS) {
    text = `${text.slice(0, MAX_TEXT_CHARS)}\n\n[...truncated — statement is longer than can be fully analyzed in one pass...]`;
  }

  return text;
};
