import { useEffect, useState } from "react";
import { PEOPLE } from "../data/content";

export default function Carousel() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % PEOPLE.length), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="sm-carousel-wrap">
      <div className="sm-carousel-phone">
        {PEOPLE.map((src, i) => (
          <div key={i} className={"sm-carousel-slide" + (i === idx ? " active" : "")}>
            <img src={src} alt="" />
          </div>
        ))}
      </div>
      <div className="sm-carousel-dots">
        {PEOPLE.map((_, i) => (
          <button key={i} className={"sm-carousel-dot" + (i === idx ? " active" : "")} onClick={() => setIdx(i)} />
        ))}
      </div>
    </div>
  );
}
