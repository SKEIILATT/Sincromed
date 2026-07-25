import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { BarChart3, RefreshCw, Flame, CalendarCheck2, Clock, Search, Camera, Mic, MessageSquare, PillBottle, CheckCircle2 } from "lucide-react";
import { computeStreak, countLast7Days, lastConfirmed, buildWeekStrip, relativeDay } from "../lib/adherence";
import { EvidenceMedia, EvidenceViewer } from "./EvidenceMedia";
import EvidenceUpload from "./EvidenceUpload";

const EVIDENCE_ICON = { foto: Camera, audio: Mic, texto: MessageSquare };
const STATUS_LABEL = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  missed: "Omitida",
  skipped: "Saltada",
  snoozed: "Pospuesta",
};

export function AdherenceSummary({ tomas }) {
  const streak = useMemo(() => computeStreak(tomas), [tomas]);
  const weekCount = useMemo(() => countLast7Days(tomas), [tomas]);
  const last = useMemo(() => lastConfirmed(tomas), [tomas]);
  const week = useMemo(() => buildWeekStrip(tomas), [tomas]);

  return (
    <section className="sm-adherence-summary" aria-label="Resumen de adherencia">
      <div className="sm-stat-chips">
        <div className="sm-stat-chip">
          <div className="sm-stat-chip-icon flame"><Flame size={16} /></div>
          <div>
            <div className="sm-stat-chip-num">{streak}</div>
            <div className="sm-stat-chip-label">{streak === 1 ? "día de racha" : "días de racha"}</div>
          </div>
        </div>
        <div className="sm-stat-chip">
          <div className="sm-stat-chip-icon week"><CalendarCheck2 size={16} /></div>
          <div>
            <div className="sm-stat-chip-num">{weekCount}</div>
            <div className="sm-stat-chip-label">tomas en 7 días</div>
          </div>
        </div>
        <div className="sm-stat-chip">
          <div className="sm-stat-chip-icon last"><Clock size={16} /></div>
          <div>
            <div className="sm-stat-chip-num">{last ? relativeDay(last.fecha) : "—"}</div>
            <div className="sm-stat-chip-label">última toma confirmada</div>
          </div>
        </div>
      </div>

      <div className="sm-week-strip">
        {week.map((day) => (
          <div key={day.key} className={"sm-week-day " + day.status + (day.isToday ? " today" : "")}>
            <span className="sm-week-day-label">{day.label}</span>
            <span className="sm-week-day-num">{day.status === "done" ? <CheckCircle2 size={14} /> : day.dayNum}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AdherenceHistory({ tomas, loading, error, onRefresh, canManage = true }) {
  const [query, setQuery] = useState("");
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return tomas;
    const q = query.trim().toLowerCase();
    return tomas.filter((t) =>
      Array.isArray(t.medicinas_tomadas) && t.medicinas_tomadas.some((m) => m.toLowerCase().includes(q))
    );
  }, [tomas, query]);

  return (
    <>
      <motion.div className="sm-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}>
      <div className="sm-card-title sm-card-title-row">
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}><BarChart3 size={18} /> Historial de tomas</span>
        <button className="sm-refresh-btn" onClick={onRefresh}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {tomas.length > 0 && (
        <div className="sm-history-search">
          <Search size={15} />
          <input
            aria-label="Buscar por medicamento"
            placeholder="Buscar por medicamento…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {loading ? (
        <div className="sm-tomas-empty">Cargando…</div>
      ) : error ? (
        <div className="sm-tomas-empty sm-tomas-error">
          <div>{error}</div>
          <button className="sm-refresh-btn" onClick={onRefresh}>
            <RefreshCw size={14} /> Reintentar
          </button>
        </div>
      ) : tomas.length === 0 ? (
        <div className="sm-tomas-empty">
          <div className="sm-tomas-empty-icon"><PillBottle size={32} /></div>
          <div>Aún no hay tomas confirmadas.</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Aparecerán aquí cuando el cuidador confirme por WhatsApp.</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="sm-tomas-empty">Sin resultados para "{query}".</div>
      ) : (
        filtered.map((t) => {
          const EvidenceIcon = EVIDENCE_ICON[t.evidencia_tipo] || MessageSquare;
          return (
            <div key={t.id} className="sm-toma-item">
              <div className="sm-toma-evidence">
                <EvidenceIcon size={16} />
              </div>
              <div className="sm-toma-info">
                <div className="sm-toma-date">{relativeDay(t.fecha)}</div>
                <div className="sm-toma-meds">{Array.isArray(t.medicinas_tomadas) ? t.medicinas_tomadas.join(", ") : "—"}</div>
              </div>
              <div className="sm-toma-actions">
                <EvidenceMedia record={t} onOpen={setSelectedEvidence} />
                {canManage && !["missed", "skipped"].includes(t.estado) && (
                  <EvidenceUpload patientId={t.patient_id} doseEventId={t.id} onUploaded={onRefresh} />
                )}
                <span className={`sm-toma-badge ${t.estado || (t.confirmado ? "confirmed" : "pending")}`}>
                  {t.confirmado && <CheckCircle2 size={12} />}
                  {STATUS_LABEL[t.estado] || (t.confirmado ? "Confirmado" : "Pendiente")}
                </span>
              </div>
            </div>
          );
        })
      )}
      </motion.div>
      <EvidenceViewer evidence={selectedEvidence} onClose={() => setSelectedEvidence(null)} />
    </>
  );
}
