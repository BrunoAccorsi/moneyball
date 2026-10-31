const PLACE_TOKENS = new Set([
  "calgary",
  "can",
  "canada",
  "ab",
  "usa",
  "bc",
  "on",
  "toronto",
  "vancouver",
  "edmonton",
  "quebec",
  "qc",
  "mb",
  "sk",
  "ns",
  "nb",
  "nl",
  "pe",
  "yt",
  "nt",
  "nu",
  "newark",
  "burbank",
  "palo",
  "alto",
  "san",
  "francisco",
  "dorval",
  "vancouver",
]);

const GENERIC_LEAD = /^(miscellaneous payment|deposit|service charge|withdrawal)$/i;

export function merchantKey(description: string): string {
  const parts = description.split("·").map((part) => part.trim()).filter(Boolean);
  const source = parts.length > 1 && GENERIC_LEAD.test(parts[0]) ? parts[parts.length - 1] : description;
  const cleaned = source
    .toLowerCase()
    .replace(/\(apple pay\)/g, " ")
    .replace(/#\d+/g, " ")
    .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, " ")
    .replace(/[^a-z0-9&+.'\s]/g, " ");
  const tokens = cleaned
    .split(/\s+/)
    .filter((token) => token.length > 1 && !PLACE_TOKENS.has(token) && !/^\d+$/.test(token));
  return tokens.slice(0, 4).join(" ") || description.toLowerCase().trim();
}

export function suggestContainsPattern(description: string): string {
  const key = merchantKey(description);
  return key || description.toLowerCase().trim();
}
