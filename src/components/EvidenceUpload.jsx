import { useRef, useState } from "react";
import { LoaderCircle, Upload } from "lucide-react";
import { EVIDENCE_ACCEPT, validateEvidenceFile } from "../lib/evidence-model";
import { uploadEvidence } from "../lib/evidence";

export default function EvidenceUpload({ patientId, doseEventId, onUploaded }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  if (!patientId || !doseEventId) return null;

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    const validationError = validateEvidenceFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setUploading(true);
    try {
      const uploaded = await uploadEvidence({ patientId, doseEventId, file });
      onUploaded?.();
      if (uploaded?.confirmationWarning) setError(uploaded.confirmationWarning);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="sm-evidence-upload">
      <input
        ref={inputRef}
        type="file"
        accept={EVIDENCE_ACCEPT.join(",")}
        onChange={handleFile}
        hidden
      />
      <button
        type="button"
        className="sm-evidence-open"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <LoaderCircle className="sm-spin" size={14} /> : <Upload size={14} />}
        {uploading ? "Subiendo" : "Adjuntar"}
      </button>
      {error && <span className="sm-evidence-upload-error">{error}</span>}
    </div>
  );
}
