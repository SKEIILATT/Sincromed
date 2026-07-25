import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Camera, FileText, Mic, X } from "lucide-react";
import { hasEvidenceReference, normalizeEvidence } from "../lib/evidence-model";
import { getSignedEvidenceUrl } from "../lib/evidence";

const KIND_LABEL = {
  photo: "Foto",
  audio: "Audio",
  text: "Texto",
};
const MISSING_LABEL = {
  photo: "Foto sin archivo",
  audio: "Audio sin archivo",
  text: "Texto sin contenido",
};

export function EvidenceMedia({ record, onOpen }) {
  const hasEvidence = hasEvidenceReference(record);
  const evidence = useMemo(() => normalizeEvidence(record), [record]);
  const [signedEvidence, setSignedEvidence] = useState({ path: "", source: "", error: "" });
  const source = evidence.directUrl || (signedEvidence.path === evidence.storagePath ? signedEvidence.source : "");
  const error = signedEvidence.path === evidence.storagePath ? signedEvidence.error : "";

  useEffect(() => {
    let active = true;
    if (!evidence.storagePath || evidence.directUrl) return () => { active = false; };

    getSignedEvidenceUrl(evidence.storagePath)
      .then((url) => {
        if (active) setSignedEvidence({ path: evidence.storagePath, source: url, error: "" });
      })
      .catch((requestError) => {
        if (active) setSignedEvidence({ path: evidence.storagePath, source: "", error: requestError.message });
      });
    return () => { active = false; };
  }, [evidence.directUrl, evidence.storagePath]);

  if (!hasEvidence) return null;

  if (evidence.kind === "photo" && source) {
    return (
      <button
        className="sm-evidence-thumb"
        type="button"
        onClick={() => onOpen({ ...evidence, source })}
        aria-label="Ver fotografía de la toma"
      >
        <img src={source} alt="Evidencia fotográfica de la toma" />
      </button>
    );
  }

  if (evidence.kind === "audio" && source) {
    return (
      <button
        className="sm-evidence-open"
        type="button"
        onClick={() => onOpen({ ...evidence, source })}
      >
        <Mic size={14} /> Escuchar
      </button>
    );
  }

  if (evidence.kind === "text" && evidence.text) {
    return (
      <button
        className="sm-evidence-open"
        type="button"
        onClick={() => onOpen({ ...evidence, source: "" })}
      >
        <FileText size={14} /> Ver texto
      </button>
    );
  }

  const MissingIcon = evidence.kind === "audio" ? Mic : evidence.kind === "text" ? FileText : Camera;
  return (
    <span
      className={`sm-evidence-missing${error ? " error" : ""}`}
      title={error || MISSING_LABEL[evidence.kind]}
    >
      {error ? <AlertCircle size={14} /> : <MissingIcon size={14} />}
      {error ? "No disponible" : MISSING_LABEL[evidence.kind]}
    </span>
  );
}

export function EvidenceViewer({ evidence, onClose }) {
  useEffect(() => {
    if (!evidence) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [evidence, onClose]);

  if (!evidence) return null;

  return (
    <div className="sm-evidence-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section className="sm-evidence-viewer" role="dialog" aria-modal="true" aria-label="Detalle de evidencia">
        <header>
          <div>
            <span>Evidencia</span>
            <strong>{KIND_LABEL[evidence.kind]}</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar evidencia"><X size={18} /></button>
        </header>
        <div className="sm-evidence-viewer-body">
          {evidence.kind === "photo" && (
            <img src={evidence.source} alt="Evidencia fotográfica de la toma" />
          )}
          {evidence.kind === "audio" && (
            <div className="sm-evidence-audio">
              <Mic size={32} />
              <audio src={evidence.source} controls autoPlay preload="metadata" />
            </div>
          )}
          {evidence.kind === "text" && (
            <p className="sm-evidence-text">{evidence.text}</p>
          )}
        </div>
      </section>
    </div>
  );
}
