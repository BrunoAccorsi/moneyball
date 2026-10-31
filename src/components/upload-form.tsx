"use client";

import { useRef, useState } from "react";
import { importFiles } from "../server/actions";

export function UploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function takeFiles(fileList: FileList | null) {
    const input = inputRef.current;
    if (!input || !fileList || fileList.length === 0) return;
    const transfer = new DataTransfer();
    for (const file of fileList) transfer.items.add(file);
    input.files = transfer.files;
  }

  return (
    <form
      action={importFiles}
      className={dragging ? "drop dragging" : "drop"}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        takeFiles(event.dataTransfer.files);
      }}
    >
      <div>
        <strong>Drop CSV or PDF statements</strong>
        <p className="lede">Neo credit cards, Scotiabank chequing, and Scotiabank cards are recognized from the file itself. The original file is not kept after parsing.</p>
      </div>
      <input ref={inputRef} type="file" name="files" multiple accept=".csv,.pdf,text/csv,application/pdf" required />
      <button className="primary" type="submit">
        Import
      </button>
    </form>
  );
}
