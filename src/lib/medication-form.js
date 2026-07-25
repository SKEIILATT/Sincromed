const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

export function createEmptySchedule(daysOfWeek = ALL_WEEKDAYS) {
  return {
    clientId: crypto.randomUUID(),
    id: "",
    hora: "",
    daysOfWeek: [...daysOfWeek],
  };
}

export function createEmptyMedication() {
  return {
    id: "",
    nombre: "",
    dosis: "",
    instrucciones: "",
    startsOn: "",
    endsOn: "",
    horarios: [createEmptySchedule()],
  };
}
