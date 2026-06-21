import { STEPS } from "../data/content";
import Reveal from "./Reveal";

export default function HowItWorks() {
  return (
    <section className="sm-how" id="sm-how">
      <div className="sm-how-inner">
        <Reveal><div className="sm-section-tag">Cómo funciona</div></Reveal>
        <Reveal delay={0.08}><h2 className="sm-section-h2">Tres pasos. Sin fricción.</h2></Reveal>
        <div className="sm-steps">
          {STEPS.map((s, i) => (
            <Reveal key={i} className="sm-step" delay={i * 0.12}>
              <div className="sm-step-num">0{i + 1}</div>
              <div className="sm-icon-circle rose">
                <s.icon size={24} strokeWidth={2} />
              </div>
              <div className="sm-step-title">{s.title}</div>
              <div className="sm-step-body">{s.body}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
