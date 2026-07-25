import { CalendarDays, Clock3, Plus, Trash2 } from "lucide-react";

const DAYS = [
  { value: 1, short: "L", label: "Lunes" },
  { value: 2, short: "M", label: "Martes" },
  { value: 3, short: "X", label: "Miércoles" },
  { value: 4, short: "J", label: "Jueves" },
  { value: 5, short: "V", label: "Viernes" },
  { value: 6, short: "S", label: "Sábado" },
  { value: 0, short: "D", label: "Domingo" },
];

export default function MedicationPlanEditor({
  medications,
  onMedicationChange,
  onRemoveMedication,
  onAddSchedule,
  onScheduleChange,
  onRemoveSchedule,
  onToggleDay,
}) {
  return (
    <div className="sm-meds-list">
      {medications.map((medication, medicationIndex) => (
        <section className="sm-medication-editor" key={medication.id || `medication-${medicationIndex}`}>
          <header className="sm-medication-editor-header">
            <div>
              <span>Medicamento {medicationIndex + 1}</span>
              <strong>{medication.nombre || "Sin nombre"}</strong>
            </div>
            <button
              className="sm-icon-danger"
              type="button"
              onClick={() => onRemoveMedication(medicationIndex)}
              aria-label={`Eliminar ${medication.nombre || `medicamento ${medicationIndex + 1}`}`}
              title="Eliminar medicamento"
            >
              <Trash2 size={17} />
            </button>
          </header>

          <div className="sm-form-row">
            <div className="sm-field">
              <label className="sm-label" htmlFor={`med-name-${medicationIndex}`}>Medicamento</label>
              <input
                id={`med-name-${medicationIndex}`}
                className="sm-input"
                placeholder="Ej. Enalapril"
                value={medication.nombre}
                onChange={(event) => onMedicationChange(medicationIndex, "nombre", event.target.value)}
              />
            </div>
            <div className="sm-field">
              <label className="sm-label" htmlFor={`med-dose-${medicationIndex}`}>Dosis por toma</label>
              <input
                id={`med-dose-${medicationIndex}`}
                className="sm-input"
                placeholder="Ej. 1 tableta de 10 mg"
                value={medication.dosis}
                onChange={(event) => onMedicationChange(medicationIndex, "dosis", event.target.value)}
              />
            </div>
          </div>

          <div className="sm-field">
            <label className="sm-label" htmlFor={`med-instructions-${medicationIndex}`}>Indicaciones</label>
            <input
              id={`med-instructions-${medicationIndex}`}
              className="sm-input"
              placeholder="Ej. Después de comer, con un vaso de agua"
              value={medication.instrucciones}
              onChange={(event) => onMedicationChange(medicationIndex, "instrucciones", event.target.value)}
            />
          </div>

          <div className="sm-treatment-heading">
            <CalendarDays size={16} aria-hidden="true" />
            <span>Duración del tratamiento</span>
          </div>
          <div className="sm-treatment-dates">
            <div className="sm-field">
              <label className="sm-label" htmlFor={`med-start-${medicationIndex}`}>Inicio</label>
              <input
                id={`med-start-${medicationIndex}`}
                className="sm-input"
                type="date"
                value={medication.startsOn}
                onChange={(event) => onMedicationChange(medicationIndex, "startsOn", event.target.value)}
              />
            </div>
            <div className="sm-field">
              <label className="sm-label" htmlFor={`med-end-${medicationIndex}`}>Fin (opcional)</label>
              <input
                id={`med-end-${medicationIndex}`}
                className="sm-input"
                type="date"
                min={medication.startsOn || undefined}
                value={medication.endsOn}
                onChange={(event) => onMedicationChange(medicationIndex, "endsOn", event.target.value)}
              />
            </div>
          </div>

          <div className="sm-schedules-heading">
            <span><Clock3 size={16} /> Horarios</span>
            <button type="button" onClick={() => onAddSchedule(medicationIndex)}>
              <Plus size={15} /> Agregar horario
            </button>
          </div>

          <div className="sm-schedule-list">
            {medication.horarios.map((schedule, scheduleIndex) => (
              <div className="sm-schedule-row" key={schedule.id || schedule.clientId || `schedule-${scheduleIndex}`}>
                <div className="sm-field sm-schedule-time">
                  <label className="sm-label" htmlFor={`med-time-${medicationIndex}-${scheduleIndex}`}>
                    Hora
                  </label>
                  <input
                    id={`med-time-${medicationIndex}-${scheduleIndex}`}
                    className="sm-input"
                    type="time"
                    value={schedule.hora}
                    onChange={(event) => onScheduleChange(
                      medicationIndex,
                      scheduleIndex,
                      "hora",
                      event.target.value,
                    )}
                  />
                </div>
                <fieldset className="sm-weekday-fieldset">
                  <legend className="sm-label">Días</legend>
                  <div className="sm-weekday-picker">
                    {DAYS.map((day) => {
                      const selected = schedule.daysOfWeek.includes(day.value);
                      return (
                        <button
                          type="button"
                          key={day.value}
                          className={selected ? "selected" : ""}
                          aria-pressed={selected}
                          aria-label={day.label}
                          title={day.label}
                          onClick={() => onToggleDay(medicationIndex, scheduleIndex, day.value)}
                        >
                          {day.short}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <button
                  className="sm-icon-danger sm-remove-schedule"
                  type="button"
                  disabled={medication.horarios.length === 1}
                  onClick={() => onRemoveSchedule(medicationIndex, scheduleIndex)}
                  aria-label="Eliminar horario"
                  title="Eliminar horario"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
