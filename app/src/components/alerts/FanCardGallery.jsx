import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import "./fan-gallery.css";

const SELECT_VELOCITY = -600;
const HAND_SCALE = 0.72;

const cx = (...parts) => parts.filter(Boolean).join(" ");
const pad = (n) => String(n).padStart(2, "0");

function fanTransform(index, count, spacing) {
  const offset = index - (count - 1) / 2;
  const stepDeg = count > 1 ? Math.min(9, 46 / (count - 1)) : 0;
  const rotate = offset * stepDeg;
  return { rotate, x: offset * spacing, y: Math.abs(rotate) * 1.9 };
}

export function FanCardGallery({
  cards,
  activeId: controlledActiveId,
  defaultActiveId,
  cardWidth = 232,
  className,
  onSelect,
  label = "Channels and integrations",
}) {
  const reduce = useReducedMotion();
  const fanRef = useRef(null);
  const buttonRefs = useRef({});
  const draggingRef = useRef(false);
  const inView = useInView(fanRef, { once: true, margin: "0px 0px -15% 0px" });
  const [revealed, setRevealed] = useState(false);
  const [fanWidth, setFanWidth] = useState(null);
  const [internalActiveId, setInternalActiveId] = useState(defaultActiveId ?? cards[0]?.id);
  const [hoveredId, setHoveredId] = useState(null);
  const [canDrag, setCanDrag] = useState(false);

  const requestedId = controlledActiveId ?? internalActiveId;
  const activeId = cards.some((c) => c.id === requestedId) ? requestedId : cards[0]?.id;
  const activeIndex = cards.findIndex((c) => c.id === activeId);
  const activeCard = cards[activeIndex];
  const deployed = reduce ? true : inView;

  useEffect(() => {
    setCanDrag(!window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    if (!deployed) return undefined;
    const t = setTimeout(() => setRevealed(true), reduce ? 0 : 1000);
    return () => clearTimeout(t);
  }, [deployed, reduce]);

  useEffect(() => {
    const node = fanRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => setFanWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (fanWidth === null) return undefined;
    const t = setTimeout(() => window.dispatchEvent(new CustomEvent("fan:layout")), 150);
    return () => clearTimeout(t);
  }, [fanWidth]);

  const width = fanWidth === null ? cardWidth : Math.min(cardWidth, fanWidth * 0.55);
  const height = width * 1.4;
  const baseBottom = height * 0.09;
  const hoverLift = height * 0.34;
  const activeLift = height * 0.62;
  const selectDistance = -height * 0.5;
  const handCards = cards.filter((c) => c.id !== activeId);
  const hoveredIndex = hoveredId ? handCards.findIndex((c) => c.id === hoveredId) : -1;
  const maxOffset = (handCards.length - 1) / 2;
  const halfAvailable = fanWidth === null ? Number.POSITIVE_INFINITY : fanWidth / 2 - width * 0.45;
  const fanSpacing =
    maxOffset > 0
      ? Math.min(width * (handCards.length > 5 ? 0.43 : 0.52), Math.max(width * 0.23, halfAvailable / maxOffset))
      : 0;

  const spring = reduce ? { duration: 0.16, ease: "easeOut" } : { type: "spring", stiffness: 340, damping: 30, mass: 0.9 };
  const textTransition = { duration: reduce ? 0 : 0.32 };
  const textOffset = reduce ? 0 : 10;

  function clearHover(id) {
    setHoveredId((current) => (current === id ? null : current));
  }

  function selectCard(card, { focus = false } = {}) {
    if (card.id === activeId) return;
    clearHover(card.id);
    if (controlledActiveId === undefined) setInternalActiveId(card.id);
    onSelect?.(card);
    if (focus) requestAnimationFrame(() => buttonRefs.current[card.id]?.focus());
  }

  function step(delta, focus = false) {
    if (!cards.length) return;
    selectCard(cards[(activeIndex + delta + cards.length) % cards.length], { focus });
  }

  function onKeyDown(event) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1, true);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1, true);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectCard(cards[0], { focus: true });
    } else if (event.key === "End") {
      event.preventDefault();
      selectCard(cards[cards.length - 1], { focus: true });
    }
  }

  return (
    <div aria-label={label} className={cx("fan", className)} onKeyDown={onKeyDown} role="group">
      <div className="fan__row">
        <div className="fan__side fan__side--left">
          {activeCard ? (
            <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: textOffset }} key={activeCard.id} transition={textTransition}>
              <p className="fan__index">{pad(activeIndex + 1)} / {pad(cards.length)}</p>
              <h3 className="fan__title">{activeCard.title}</h3>
            </motion.div>
          ) : null}
        </div>

        <div className="fan__stage" ref={fanRef} style={{ minHeight: height * 1.78 }}>
          {cards.map((card) => {
            const isActive = card.id === activeId;
            const handIndex = handCards.findIndex((c) => c.id === card.id);
            const Face = card.face;
            let slot;
            let lift = { rotate: 0, scale: 1, x: 0, y: 0 };
            let zIndex;
            let order;

            if (isActive) {
              slot = deployed ? { rotate: 0, scale: 1, x: 0, y: -activeLift } : { rotate: 0, scale: HAND_SCALE, x: 0, y: 0 };
              zIndex = 100;
              order = 0;
            } else {
              const fan = fanTransform(handIndex, handCards.length, fanSpacing);
              const isHovered = card.id === hoveredId;
              const neighborShift =
                hoveredIndex !== -1 && !isHovered
                  ? (Math.sign(handIndex - hoveredIndex) * width * 0.14) / Math.max(1, Math.abs(handIndex - hoveredIndex))
                  : 0;
              const dx = neighborShift;
              const dy = isHovered ? -hoverLift - fan.y : 0;
              const rad = (-fan.rotate * Math.PI) / 180;
              slot = deployed ? { rotate: fan.rotate, scale: HAND_SCALE, x: fan.x, y: fan.y } : { rotate: 0, scale: HAND_SCALE, x: 0, y: 0 };
              if (deployed) {
                lift = {
                  rotate: isHovered ? -fan.rotate * 0.45 : 0,
                  scale: isHovered ? 1.08 : 1,
                  x: (dx * Math.cos(rad) - dy * Math.sin(rad)) / HAND_SCALE,
                  y: (dx * Math.sin(rad) + dy * Math.cos(rad)) / HAND_SCALE,
                };
              }
              zIndex = isHovered ? 60 : 10 + handIndex;
              order = handIndex + 1;
            }

            return (
              <motion.div
                animate={slot}
                className="fan__slot"
                initial={false}
                key={card.id}
                onHoverEnd={() => clearHover(card.id)}
                onHoverStart={() => {
                  if (!isActive && deployed) setHoveredId(card.id);
                }}
                style={{ bottom: baseBottom, marginLeft: -width / 2, zIndex }}
                transition={{ ...spring, delay: revealed || reduce ? 0 : 0.08 * order }}
              >
                <motion.div animate={lift} initial={false} transition={spring}>
                  <motion.button
                    aria-label={card.title}
                    aria-pressed={isActive}
                    className="fan-card"
                    data-active={isActive || undefined}
                    drag={canDrag && !isActive ? "y" : false}
                    dragConstraints={{ bottom: 0, top: -height * 1.65 }}
                    dragElastic={0.12}
                    dragSnapToOrigin
                    onBlur={() => clearHover(card.id)}
                    onClick={() => {
                      if (draggingRef.current) {
                        draggingRef.current = false;
                        return;
                      }
                      selectCard(card);
                    }}
                    onDragEnd={(_event, info) => {
                      if (info.offset.y < selectDistance || info.velocity.y < SELECT_VELOCITY) selectCard(card);
                    }}
                    onDragStart={() => {
                      draggingRef.current = true;
                    }}
                    onFocus={() => {
                      if (!isActive && deployed) setHoveredId(card.id);
                    }}
                    onPointerDown={() => {
                      draggingRef.current = false;
                    }}
                    ref={(node) => {
                      buttonRefs.current[card.id] = node;
                    }}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className="fan-card__face"
                      data-tone={card.tone ?? "blue"}
                      style={{ width, height, fontSize: Math.max(12.5, width / 16) }}
                    >
                      <Face active={isActive} width={width} />
                    </span>
                  </motion.button>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        <div aria-live="polite" className="fan__side fan__side--right">
          {activeCard ? (
            <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: textOffset }} key={activeCard.id} transition={textTransition}>
              <p className="fan__desc">{activeCard.description}</p>
              {activeCard.meta?.length ? (
                <dl className="fan__meta">
                  {activeCard.meta.map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </motion.div>
          ) : null}
        </div>
      </div>

      <div className="fan__pager">
        <button aria-label="Previous channel" className="fan__pagebtn" onClick={() => step(-1)} type="button">
          <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18">
            <path d="m14.5 6-6 6 6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          </svg>
        </button>
        <div aria-label="Choose a channel" className="fan__dots" role="group">
          {cards.map((card) => (
            <button
              aria-current={card.id === activeId ? "true" : undefined}
              aria-label={`Show ${card.title}`}
              className="fan__dot"
              key={card.id}
              onClick={() => selectCard(card)}
              type="button"
            />
          ))}
        </div>
        <button aria-label="Next channel" className="fan__pagebtn" onClick={() => step(1)} type="button">
          <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18">
            <path d="m9.5 6 6 6-6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
