export function Flash({ notice, error }: { notice?: string; error?: string }) {
  if (error) return <p className="banner error">{error}</p>;
  if (notice) return <p className="banner notice">{notice}</p>;
  return null;
}
