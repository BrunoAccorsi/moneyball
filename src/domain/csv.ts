export type CsvTable = {
  headers: string[];
  rows: Record<string, string>[];
};

export function parseCsv(content: string): CsvTable {
  const text = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      records.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }

  const filtered = records.filter((record) => record.some((cell) => cell.trim() !== ""));
  const headers = (filtered[0] ?? []).map((header) => header.trim());
  const rows = filtered.slice(1).map((record) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = (record[index] ?? "").trim();
    });
    return obj;
  });
  return { headers, rows };
}

export function headerSet(headers: string[]): Set<string> {
  return new Set(headers);
}
