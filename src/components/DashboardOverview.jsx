import { Clock3, Pill, UserRound } from "lucide-react";
import { formatScheduleDays, getNextMedication, sortMedicationsByTime } from "../lib/medications";
import { AdherenceSummary } from "./AdherenceHistory";

export default function DashboardOverview({ patientName, caregiverName, meds, tomas }) {
  const nextMedication = getNextMedication(meds);
  const dailyPlan = sortMedicationsByTime(meds);

  return (
    <div className="sm-overview">
      <section className="sm-overview-primary">
        <div className="sm-overview-patient">
          <span className="sm-overview-kicker">Paciente activo</span>
          <h2>{patientName || "Configura al adulto mayor"}</h2>
          <div className="sm-overview-caregiver">
            <UserRound size={15} />
            {caregiverName ? `Cuidador: ${caregiverName}` : "Cuidador pendiente"}
          </div>
        </div>
        <div className="sm-next-dose">
          <div className="sm-next-dose-icon"><Clock3 size={20} /></div>
          <div>
            <span>Próxima toma</span>
            {nextMedication ? (
              <>
                <strong>{nextMedication.nombre}</strong>
                <small>
                  {nextMedication.dayLabel} · {nextMedication.hora}
                  {nextMedication.dosis ? ` · ${nextMedication.dosis}` : ""}
                </small>
              </>
            ) : (
              <strong>Sin horario configurado</strong>
            )}
          </div>
        </div>
      </section>

      <AdherenceSummary tomas={tomas} />

      <section className="sm-dashboard-panel">
        <div className="sm-panel-heading">
          <div>
          <span className="sm-overview-kicker">Tratamiento configurado</span>
          <h2>Medicamentos y horarios</h2>
          </div>
          <span className="sm-plan-count">{dailyPlan.length}</span>
        </div>
        {dailyPlan.length ? (
          <div className="sm-daily-plan">
            {dailyPlan.map((med, index) => (
              <div className="sm-daily-med" key={`${med.nombre}-${med.hora}-${index}`}>
                <div className="sm-daily-med-icon"><Pill size={17} /></div>
                <div>
                  <strong>{med.nombre}</strong>
                  <span>
                    {med.dosis || "Dosis no especificada"} · {formatScheduleDays(med.daysOfWeek)}
                  </span>
                </div>
                <time>{med.hora || "Sin hora"}</time>
              </div>
            ))}
          </div>
        ) : (
          <div className="sm-inline-empty">Agrega medicamentos desde la pestaña Plan.</div>
        )}
      </section>
    </div>
  );
}
