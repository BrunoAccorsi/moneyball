import { parseCsv } from "../csv";
import type { ParseResult } from "../types";
import { isNeoCreditCsv, parseNeoCreditCsv } from "./neo-credit";
import { isScotiaCardCsv, parseScotiaCardCsv } from "./scotia-card";
import { isScotiaChequingCsv, parseScotiaChequingCsv } from "./scotia-chequing";

export type SourceParser = {
  id: string;
  detect: (headers: string[]) => boolean;
  parse: (content: string) => ParseResult;
};

export const parsers: SourceParser[] = [
  { id: "scotia_card", detect: isScotiaCardCsv, parse: parseScotiaCardCsv },
  { id: "scotia_chequing", detect: isScotiaChequingCsv, parse: parseScotiaChequingCsv },
  { id: "neo_credit", detect: isNeoCreditCsv, parse: parseNeoCreditCsv },
];

export function detectAndParse(content: string, fileName: string): ParseResult {
  const { headers } = parseCsv(content);
  const parser = parsers.find((candidate) => candidate.detect(headers));
  if (!parser) {
    throw new Error(
      `Could not detect a source for ${fileName}. Headers: ${headers.join(", ") || "(none)"}. PDF statements go through the PDF service, not the CSV parsers.`,
    );
  }
  return parser.parse(content);
}

export { isNeoSecondaryCard, parseNeoCreditCsv } from "./neo-credit";
export { parseScotiaCardCsv } from "./scotia-card";
export { parseScotiaChequingCsv } from "./scotia-chequing";
