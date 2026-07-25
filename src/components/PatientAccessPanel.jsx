import { useCallback, useEffect, useState } from "react";
import { Copy, Mail, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import {
  createPatientInvitation,
  fetchPatientAccess,
  revokePatientInvitation,
  updatePatientMemberRole,
} from "../lib/care-data";
import { buildInvitationLink } from "../lib/invitations";
import { validateEmail } from "../lib/validation";

const ROLE_LABEL = {
  owner: "Propietario",
  manager: "Administrador",
  viewer: "Solo lectura",
};

export default function PatientAccessPanel({ patientId, currentUserId, notify }) {
  const [access, setAccess] = useState({
    currentRole: "",
    members: [],
    invitations: [],
  });
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [submitting, setSubmitting] = useState(false);
  const [invitationLink, setInvitationLink] = useState("");

  const canManage = ["owner", "manager"].includes(access.currentRole);

  const loadAccess = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      setAccess(await fetchPatientAccess(patientId));
    } catch (error) {
      notify(error.message || "No se pudieron cargar los accesos.", "error");
    } finally {
      setLoading(false);
    }
  }, [notify, patientId]);

  useEffect(() => {
    let active = true;
    fetchPatientAccess(patientId)
      .then((nextAccess) => {
        if (active) setAccess(nextAccess);
      })
      .catch((error) => {
        if (active) notify(error.message || "No se pudieron cargar los accesos.", "error");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [notify, patientId]);

  async function handleInvite(event) {
    event.preventDefault();
    const emailError = validateEmail(email);
    if (emailError) {
      notify(emailError, "error");
      return;
    }

    setSubmitting(true);
    try {
      const invitation = await createPatientInvitation({ patientId, email, role });
      setInvitationLink(buildInvitationLink(invitation.token));
      setEmail("");
      notify("Invitación creada. Comparte el enlace con la persona indicada.");
      await loadAccess();
    } catch (error) {
      notify(error.message || "No se pudo crear la invitación.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleChange(userId, nextRole) {
    try {
      await updatePatientMemberRole({ patientId, userId, role: nextRole });
      notify("Permiso actualizado");
      await loadAccess();
    } catch (error) {
      notify(error.message || "No se pudo actualizar el permiso.", "error");
    }
  }

  async function handleRevoke(invitationId) {
    try {
      await revokePatientInvitation(invitationId);
      notify("Invitación revocada");
      await loadAccess();
    } catch (error) {
      notify(error.message || "No se pudo revocar la invitación.", "error");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(invitationLink);
      notify("Enlace copiado");
    } catch {
      notify("No se pudo copiar automáticamente. Selecciona el enlace.", "error");
    }
  }

  if (!patientId) return null;

  return (
    <section className="sm-dashboard-panel sm-access-panel">
      <div className="sm-panel-heading">
        <div>
          <span className="sm-overview-kicker">Acceso al perfil</span>
          <h2>Familiares y permisos</h2>
        </div>
        <span className="sm-role-badge"><ShieldCheck size={13} /> {ROLE_LABEL[access.currentRole] || "Miembro"}</span>
      </div>

      {loading ? (
        <div className="sm-inline-empty">Cargando permisos…</div>
      ) : (
        <div className="sm-member-list">
          {access.members.map((member) => (
            <div className="sm-member-row" key={member.userId}>
              <span className="sm-person-avatar small"><Users size={17} /></span>
              <div>
                <strong>{member.name}</strong>
                <small>{member.email}</small>
              </div>
              {access.currentRole === "owner"
                && member.role !== "owner"
                && member.userId !== currentUserId ? (
                  <select
                    aria-label={`Permiso de ${member.name}`}
                    value={member.role}
                    onChange={(event) => handleRoleChange(member.userId, event.target.value)}
                  >
                    <option value="manager">Administrador</option>
                    <option value="viewer">Solo lectura</option>
                  </select>
                ) : (
                  <span className={`sm-member-role ${member.role}`}>{ROLE_LABEL[member.role]}</span>
                )}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <form className="sm-invite-form" onSubmit={handleInvite}>
          <div className="sm-card-title"><UserPlus size={17} /> Invitar familiar</div>
          <div className="sm-invite-fields">
            <div className="sm-field">
              <label className="sm-label" htmlFor="invite-email">Correo electrónico</label>
              <div className="sm-input-icon">
                <Mail size={15} />
                <input
                  id="invite-email"
                  className="sm-input"
                  type="email"
                  placeholder="familiar@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>
            <div className="sm-field">
              <label className="sm-label" htmlFor="invite-role">Permiso</label>
              <select
                id="invite-role"
                className="sm-input"
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                {access.currentRole === "owner" && (
                  <option value="manager">Administrador</option>
                )}
                <option value="viewer">Solo lectura</option>
              </select>
            </div>
            <button className="sm-save-btn sm-no-margin" type="submit" disabled={submitting}>
              <UserPlus size={16} /> {submitting ? "Creando…" : "Crear enlace"}
            </button>
          </div>
        </form>
      )}

      {invitationLink && (
        <div className="sm-invite-link">
          <input aria-label="Enlace de invitación" readOnly value={invitationLink} />
          <button type="button" onClick={copyLink} aria-label="Copiar enlace" title="Copiar enlace">
            <Copy size={16} />
          </button>
        </div>
      )}

      {canManage && access.invitations.length > 0 && (
        <div className="sm-pending-invitations">
          <strong>Invitaciones pendientes</strong>
          {access.invitations.map((invitation) => (
            <div key={invitation.id}>
              <span>
                {invitation.email}
                <small>{ROLE_LABEL[invitation.role]}</small>
              </span>
              <button
                type="button"
                onClick={() => handleRevoke(invitation.id)}
                aria-label={`Revocar invitación de ${invitation.email}`}
                title="Revocar invitación"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
