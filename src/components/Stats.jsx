import Reveal from "./Reveal";
import CountUp from "./CountUp";

export default function Stats() {
  return (
    <section className="sm-stats">
      <div className="sm-stats-inner">
        <Reveal className="sm-stat" delay={0}>
          <div className="sm-stat-num"><CountUp to={5} suffix="+" /></div>
          <div className="sm-stat-label">Pastillas diarias promedio en adultos mayores polimedicados</div>
        </Reveal>
        <Reveal className="sm-stat" delay={0.12}>
          <div className="sm-stat-num"><span>&lt;</span><CountUp to={10} /></div>
          <div className="sm-stat-label">Minutos para configurar a un cuidador desde cero</div>
        </Reveal>
        <Reveal className="sm-stat" delay={0.24}>
          <div className="sm-stat-num"><CountUp to={0} /></div>
          <div className="sm-stat-label">Apps nuevas que el cuidador tiene que instalar</div>
        </Reveal>
      </div>
    </section>
  );
}
