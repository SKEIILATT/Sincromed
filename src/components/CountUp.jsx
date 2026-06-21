import { useEffect, useRef, useState } from "react";
import { useInView, animate } from "motion/react";

export default function CountUp({ to, prefix = "", suffix = "", className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, to]);

  return (
    <span ref={ref} className={className}>
      {prefix}{n}{suffix}
    </span>
  );
}
