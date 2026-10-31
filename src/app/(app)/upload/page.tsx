import { Flash } from "../../../components/flash";
import { UploadForm } from "../../../components/upload-form";

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Upload</h1>
          <p className="lede">
            Drop a month of exports. The source is detected from headers: Neo credit CSVs, Scotiabank chequing, and Scotiabank card files. Duplicates and card payments are removed before the dashboard updates.
          </p>
        </div>
      </div>
      <Flash notice={params.notice} error={params.error} />
      <UploadForm />
      <section className="panel" style={{ marginTop: 16 }}>
        <h2>PDF statements</h2>
        <p>
          Neo Everyday and Pai only come as PDFs. The PDF service extracts text with pdfplumber, but the statement layout is not implemented until a sample arrives, so those files are not guessed and are not stored. Upload them again after the parser is filled in.
        </p>
      </section>
    </>
  );
}
