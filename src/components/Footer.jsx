import logotipo from "../assets/logotipo.png";

export default function Footer() {
  return (
    <footer className="sm-footer">
      <div className="sm-footer-inner">
        <img src={logotipo} alt="SincroMed" />
        <span className="sm-footer-copy">© 2026 SincroMed · «Tranquilidad para tu familia, autonomía para los tuyos.»</span>
      </div>
    </footer>
  );
}
