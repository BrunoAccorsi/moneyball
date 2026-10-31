create table if not exists accounts (
  key text primary key,
  name text not null,
  institution text not null,
  kind text not null
);

create table if not exists import_files (
  sha256 text primary key,
  file_name text not null,
  source text not null,
  imported_at timestamptz not null default now()
);

create table if not exists transactions (
  id text primary key,
  account_key text not null references accounts(key),
  date text not null,
  posted_date text,
  description text not null,
  amount_cents integer not null,
  status text,
  source text not null,
  source_file_name text not null,
  fingerprint text not null,
  occurrence integer not null,
  merchant_key text not null,
  category text,
  category_source text,
  category_locked boolean not null default false,
  rule_id text,
  is_recurring boolean not null default false,
  recurring_override boolean,
  is_one_time boolean not null default false,
  one_time_override boolean,
  is_excluded boolean not null default false,
  exclusion_reason text,
  exclusion_locked boolean not null default false,
  transfer_pair_id text,
  reimbursed_cents integer not null default 0,
  reimbursement_group text,
  reimbursement_note text,
  needs_review boolean not null default false,
  review_question text,
  review_dismissed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (fingerprint, occurrence)
);

create index if not exists transactions_date_idx on transactions (date);
create index if not exists transactions_review_idx on transactions (needs_review);

create table if not exists rules (
  id text primary key,
  name text not null,
  description_pattern text,
  pattern_type text not null,
  amount_cents integer,
  amount_direction text,
  date_exact text,
  date_from text,
  date_to text,
  account_key text,
  category text,
  set_one_time boolean,
  set_recurring boolean,
  role text,
  reimbursement_group text,
  reimbursement_amount_cents integer,
  priority integer not null,
  learned boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  key text primary key,
  value text not null
);
