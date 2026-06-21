import { TESTIMONIALS } from "../data/content";
import Reveal from "./Reveal";

function initials(name) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function Testimonials() {
  return (
    <section className="sm-testimonials">
      <div className="sm-testimonials-inner">
        <Reveal><div className="sm-section-tag">Familias que confían en SincroMed</div></Reveal>
        <Reveal delay={0.08}><h2 className="sm-section-h2">Lo que dicen los que ya lo usan</h2></Reveal>
        <div className="sm-testi-grid">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={i} className="sm-testi" delay={i * 0.1}>
              <div className="sm-testi-quote">&ldquo;</div>
              <p className="sm-testi-text">{t.text}</p>
              <div className="sm-testi-author">
                <div className={"sm-testi-avatar " + t.color}>{initials(t.name)}</div>
                <div>
                  <div className="sm-testi-name">{t.name}</div>
                  <div className="sm-testi-role">{t.role}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
