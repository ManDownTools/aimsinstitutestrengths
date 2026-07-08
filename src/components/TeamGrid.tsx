"use client";

import { Fragment, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  DIMENSION_LABELS,
  SUB_STRENGTH_LABELS,
  type Dimension,
  type ResultsProfile,
} from "@/lib/types";

type Person = {
  id: string;
  first_name: string;
  results_profile?: ResultsProfile | null;
};

type Tip = {
  x: number;
  y: number;
  personName: string;
  subStrength: string;
  competence: number | null;
  energy: number | null;
};

export default function TeamGrid({ people }: { people: Person[] }) {
  const completed = people.filter((p) => p.results_profile);
  const [tip, setTip] = useState<Tip | null>(null);

  if (completed.length === 0) {
    return (
      <p className="faint" style={{ margin: 0 }}>
        No completed assessments yet. Once people finish, their energy shows up here.
      </p>
    );
  }
  const subOrder = Object.keys(SUB_STRENGTH_LABELS);
  const dimOrder: Dimension[] = [
    "thinking",
    "influence",
    "execution",
    "relating",
  ];

  return (
    <div style={{ overflowX: "auto", overflowY: "visible" }}>
      <table className="table" style={{ minWidth: 600 }}>
        <thead>
          <tr>
            <th style={{ minWidth: 180 }}>Sub-strength</th>
            {completed.map((p) => (
              <th
                key={p.id}
                style={{
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  padding: 8,
                }}
              >
                {p.first_name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dimOrder.map((d) => (
            <Fragment key={d}>
              <tr>
                <td
                  colSpan={completed.length + 1}
                  className="subhead"
                  style={{ background: "var(--aims-navy-tint)" }}
                >
                  {DIMENSION_LABELS[d]}
                </td>
              </tr>
              {subOrder
                .filter((sub) => {
                  const someone = completed.find((p) =>
                    p.results_profile?.sub_strengths.find(
                      (s) => s.sub_strength === sub && s.dimension === d,
                    ),
                  );
                  return !!someone;
                })
                .map((sub) => (
                  <tr key={`${d}-${sub}`}>
                    <td>{SUB_STRENGTH_LABELS[sub]}</td>
                    {completed.map((p) => {
                      const s = p.results_profile?.sub_strengths.find(
                        (x) => x.sub_strength === sub,
                      );
                      const energy = s?.energy ?? 0;
                      const pct = energy === 0 ? 0 : (energy / 5) * 100;
                      return (
                        <td
                          key={p.id}
                          className="num"
                          style={{
                            background: `color-mix(in srgb, var(--aims-sky) ${pct}%, var(--surface))`,
                            width: 42,
                            cursor: s ? "help" : "default",
                          }}
                          onMouseEnter={(e) => {
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            setTip({
                              x: rect.left + rect.width / 2,
                              y: rect.top,
                              personName: p.first_name,
                              subStrength:
                                SUB_STRENGTH_LABELS[sub] ?? sub,
                              competence: s?.competence ?? null,
                              energy: s?.energy ?? null,
                            });
                          }}
                          onMouseLeave={() => setTip(null)}
                        >
                          {s ? energy : "-"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </Fragment>
          ))}
        </tbody>
      </table>
      <p className="caption" style={{ marginTop: 8 }}>
        Cell shade indicates energy. Hover a cell for the competence and energy pair.
      </p>
      {tip && <CellTip tip={tip} />}
    </div>
  );
}

function CellTip({ tip }: { tip: Tip }) {
  // Portal into document.body so ancestor transforms / filters / will-change
  // can't hijack our position: fixed containing block. Without this, an
  // ancestor with any of those turns "fixed" into "positioned relative to
  // that ancestor" and the tooltip lands far from the hovered cell.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="tooltip"
      style={{
        position: "fixed",
        left: tip.x,
        top: tip.y - 8,
        transform: "translate(-50%, -100%)",
        background: "var(--aims-navy)",
        color: "var(--aims-white)",
        padding: "8px 12px",
        borderRadius: 8,
        fontSize: 12,
        lineHeight: 1.4,
        fontFamily: "var(--font-sans)",
        boxShadow: "var(--shadow-md)",
        pointerEvents: "none",
        zIndex: 300,
        whiteSpace: "nowrap",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 2 }}>
        {tip.personName} · {tip.subStrength}
      </div>
      <div>
        Competence {tip.competence ?? "-"} · Energy {tip.energy ?? "-"}
      </div>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: "6px solid var(--aims-navy)",
        }}
      />
    </div>,
    document.body,
  );
}
