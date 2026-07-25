import { Plus, UserRound } from "lucide-react";

export default function PatientSwitcher({
  patients,
  selectedPatientId,
  creating,
  disabled,
  onChange,
  onCreate,
}) {
  if (!patients.length && !creating) {
    return (
      <button className="sm-new-patient-btn" type="button" onClick={onCreate}>
        <Plus size={16} /> Crear paciente
      </button>
    );
  }

  return (
    <div className="sm-patient-switcher">
      <UserRound size={16} />
      <select
        aria-label="Paciente activo"
        value={creating ? "" : selectedPatientId}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {creating && <option value="">Nuevo paciente</option>}
        {patients.map((patient) => (
          <option key={patient.id} value={patient.id}>{patient.full_name}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={onCreate}
        disabled={disabled}
        aria-label="Crear otro paciente"
        title="Crear otro paciente"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
