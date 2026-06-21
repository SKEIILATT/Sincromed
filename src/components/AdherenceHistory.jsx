import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { BarChart3, RefreshCw, Flame, CalendarCheck2, Clock, Search, Camera, Mic, MessageSquare, PillBottle, CheckCircle2 } from "lucide-react";
import { computeStreak, countLast7Days, lastConfirmed, buildWeekStrip } from "../lib/adherence";

const EVIDENCE_ICON = { foto: Camera, audio: Mic, texto: MessageSquare };

function relativeDay(fecha) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (fecha === today) return "Hoy";
  if (fecha === yesterday) return "Ayer";
  return fecha;
}

export default function AdherenceHistory({ tomas, loading, onRefresh }) {
  const [query, setQuery] = useState("");

  const streak = useMemo(() => computeStreak(tomas), [tomas]);
  const weekCount = useMemo(() => countLast7Days(tomas), [tomas]);
  const last = useMemo(() => lastConfirmed(tomas), [tomas]);
  const week = useMemo(() => buildWeekStrip(tomas), [tomas]);

  const filtered = useMemo(() => {
    if (!query.trim()) return tomas;
    const q = query.trim().toLowerCase();
    return tomas.filter((t) =>
      Array.isArray(t.medicinas_tomadas) && t.medicinas_tomadas.some((m) => m.toLowerCase().includes(q))
    );
  }, [tomas, query]);

  return (
    <motion.div className="sm-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}>
      <div className="sm-card-title sm-card-title-row">
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}><BarChart3 size={18} /> Historial de tomas</span>
        <button className="sm-refresh-btn" onClick={onRefresh}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

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
        {week.map((d) => (
          <div key={d.key} className={"sm-week-day " + d.status + (d.isToday ? " today" : "")}>
            <span className="sm-week-day-label">{d.label}</span>
            <span className="sm-week-day-num">{d.status === "done" ? <CheckCircle2 size={14} /> : d.dayNum}</span>
          </div>
        ))}
      </div>

      {tomas.length > 0 && (
        <div className="sm-history-search">
          <Search size={15} />
          <input placeholder="Buscar por medicamento…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      )}

      {loading ? (
        <div className="sm-tomas-empty">Cargando…</div>
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
              {t.confirmado && (
                <span className="sm-toma-badge">
                  <CheckCircle2 size={12} /> Confirmado
                </span>
              )}
            </div>
          );
        })
      )}
    </motion.div>
  );
}
