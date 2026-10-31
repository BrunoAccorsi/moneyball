import type { Category, Rule } from "./types";

export type RuleSubject = {
  description: string;
  amountCents: number;
  date: string;
  accountKey: string;
};

export function ruleMatches(subject: RuleSubject, rule: Rule): boolean {
  if (rule.accountKey && rule.accountKey !== subject.accountKey) return false;
  if (rule.amountCents !== undefined && rule.amountCents !== subject.amountCents) return false;
  if (rule.amountDirection === "inflow" && subject.amountCents <= 0) return false;
  if (rule.amountDirection === "outflow" && subject.amountCents >= 0) return false;
  if (rule.date && rule.date !== subject.date) return false;
  if (rule.dateFrom && subject.date < rule.dateFrom) return false;
  if (rule.dateTo && subject.date > rule.dateTo) return false;
  if (!rule.descriptionPattern) return true;
  if (rule.patternType === "contains") {
    return subject.description.toLowerCase().includes(rule.descriptionPattern.toLowerCase());
  }
  try {
    return new RegExp(rule.descriptionPattern, "i").test(subject.description);
  } catch {
    return false;
  }
}

export function bestRule(subject: RuleSubject, rules: Rule[]): Rule | null {
  let best: Rule | null = null;
  for (const rule of rules) {
    if (!ruleMatches(subject, rule)) continue;
    if (!best || rule.priority > best.priority) best = rule;
  }
  return best;
}

export function learnedMerchantRule(input: {
  id: string;
  pattern: string;
  category: Category;
  oneTime?: boolean;
  recurring?: boolean;
  name?: string;
}): Rule {
  return {
    id: input.id,
    name: input.name ?? input.pattern,
    descriptionPattern: input.pattern,
    patternType: "contains",
    category: input.category,
    oneTime: input.oneTime,
    recurring: input.recurring,
    priority: 50,
    learned: true,
  };
}
