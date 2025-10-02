import Papa from 'papaparse';

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  delimiter: string;
}

function stripBom(value: string): string {
  if (value.charCodeAt(0) === 0xfeff) {
    return value.slice(1);
  }
  return value;
}

function detectDelimiter(sample: string): string {
  const commaCount = (sample.match(/,/g) || []).length;
  const semicolonCount = (sample.match(/;/g) || []).length;
  if (semicolonCount > commaCount) {
    return ';';
  }
  if (commaCount > 0) {
    return ',';
  }
  return ';';
}

export function parseCsvBuffer(buffer: Buffer): ParsedCsv {
  const content = stripBom(buffer.toString('utf8'));
  const firstLine = content.split('\n')[0] ?? '';
  const delimiter = detectDelimiter(firstLine);

  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    delimiter,
    skipEmptyLines: true,
    transformHeader(header) {
      return header.trim();
    },
    transform(value) {
      return typeof value === 'string' ? value.trim() : value;
    },
  });

  if (parsed.errors.length) {
    throw new Error(parsed.errors[0].message);
  }

  const rows = parsed.data.filter((row) => Object.values(row).some((value) => value !== ''));
  const headers = parsed.meta.fields ?? [];

  return {
    headers,
    rows,
    delimiter,
  };
}
