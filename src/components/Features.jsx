import { FEATURES } from "../data/content";
import Reveal from "./Reveal";

export default function Features() {
  return (
    <section className="sm-features">
      <div className="sm-features-inner">
        <Reveal><div className="sm-section-tag">Características</div></Reveal>
        <Reveal delay={0.08}><h2 className="sm-section-h2">Diseñado para familias reales, no para médicos</h2></Reveal>
        <div className="sm-features-grid">
          {FEATURES.map((f, i) => (
            <Reveal
              key={i}
              className="sm-feature-card"
              delay={i * 0.1}
              whileHover={{ y: -6, boxShadow: "0 20px 40px rgba(27,42,107,0.14)", transition: { duration: 0.25 } }}
            >
              <div className="sm-feature-icon">
                <f.icon size={22} strokeWidth={2} />
              </div>
              <div className="sm-feature-title">{f.title}</div>
              <div className="sm-feature-body">{f.body}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
