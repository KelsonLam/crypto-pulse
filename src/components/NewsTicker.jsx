import { useEffect, useState } from "react";
import { fetchNews } from "../api.js";

// A scrolling headline bar showing the latest cryptocurrency news. The
// headlines link out to their source. The list is duplicated so the scroll
// loops seamlessly, and it pauses when the pointer is over it. If the news
// service cannot be reached, the bar hides itself rather than sitting empty.

const REFRESH_INTERVAL = 5 * 60 * 1000;

export default function NewsTicker() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let active = true;
    function load() {
      fetchNews()
        .then((news) => active && setItems(news))
        .catch(() => {});
    }
    load();
    const id = setInterval(load, REFRESH_INTERVAL);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  if (items.length === 0) return null;

  // Two copies of the list let the animation translate by half its width and
  // loop without a visible jump.
  const loop = [...items, ...items];

  return (
    <div className="ticker" aria-label="Latest cryptocurrency news">
      <span className="ticker__tag">News</span>
      <div className="ticker__viewport">
        <div className="ticker__track">
          {loop.map((item, index) => (
            <a
              key={`${item.id}-${index}`}
              className="ticker__item"
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="ticker__source">{item.source}</span>
              {item.title}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
