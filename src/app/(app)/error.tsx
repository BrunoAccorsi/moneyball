"use client";

export default function AppError({ error }: { error: Error }) {
  return (
    <div className="panel">
      <h1>Something went wrong</h1>
      <p>{error.message}</p>
    </div>
  );
}
