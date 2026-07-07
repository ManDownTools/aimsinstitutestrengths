"use client";

import Link from "next/link";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  SUB_STRENGTH_LABELS,
  type ResultsProfile,
} from "@/lib/types";

type Person = {
  id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  reports_to: string | null;
  results_profile: ResultsProfile | null;
};

type TreeNode = Person & { children: TreeNode[] };

// Minimum scale before we give up fitting and switch to horizontal scroll.
const MIN_SCALE = 0.55;

function buildTree(people: Person[]): TreeNode[] {
  const byId = new Map<string, Person>(people.map((p) => [p.id, p]));

  // Cycle detection: any person who, walking up reports_to, revisits
  // themselves is in a cycle. Break gracefully by treating them as a root.
  const inCycle = new Set<string>();
  for (const p of people) {
    let cur: string | null = p.reports_to;
    const visited = new Set<string>([p.id]);
    while (cur) {
      if (cur === p.id) {
        inCycle.add(p.id);
        console.warn(
          `CompanyStructure: cycle detected in reports_to involving profile ${p.id}. Treating as root.`,
        );
        break;
      }
      if (visited.has(cur)) break;
      visited.add(cur);
      cur = byId.get(cur)?.reports_to ?? null;
    }
  }

  const childrenOf = new Map<string, Person[]>();
  const roots: Person[] = [];
  for (const p of people) {
    const parent = p.reports_to;
    const isRoot = !parent || !byId.has(parent) || inCycle.has(p.id);
    if (isRoot) {
      roots.push(p);
    } else {
      const arr = childrenOf.get(parent) ?? [];
      arr.push(p);
      childrenOf.set(parent, arr);
    }
  }

  const sortByLast = (a: Person, b: Person) =>
    a.last_name.localeCompare(b.last_name);

  function build(person: Person): TreeNode {
    const kids = (childrenOf.get(person.id) ?? []).slice().sort(sortByLast);
    return { ...person, children: kids.map(build) };
  }

  return roots.sort(sortByLast).map(build);
}

function topEnergySubStrength(profile: ResultsProfile): string | null {
  const sorted = [...profile.sub_strengths].sort(
    (a, b) => b.energy - a.energy,
  );
  const top = sorted[0];
  if (!top) return null;
  return SUB_STRENGTH_LABELS[top.sub_strength] ?? top.sub_strength;
}

function NodeCard({
  node,
  personLinkPrefix,
}: {
  node: TreeNode;
  personLinkPrefix: string;
}) {
  const hasResults = !!node.results_profile;
  const topEnergy = node.results_profile
    ? topEnergySubStrength(node.results_profile)
    : null;
  const fullName = `${node.first_name} ${node.last_name}`.trim();

  const inner = (
    <>
      <div className="org-node-name">{fullName}</div>
      {node.position && (
        <div className="org-node-position">{node.position}</div>
      )}
      {hasResults && topEnergy && (
        <span className="chip chip-sky org-node-chip">{topEnergy}</span>
      )}
    </>
  );

  if (hasResults) {
    return (
      <Link href={`${personLinkPrefix}/${node.id}`} className="org-node-card">
        {inner}
      </Link>
    );
  }
  return (
    <div
      className="org-node-card is-inactive"
      title="Assessment not completed yet"
    >
      {inner}
    </div>
  );
}

function TreeBranch({
  node,
  personLinkPrefix,
}: {
  node: TreeNode;
  personLinkPrefix: string;
}) {
  return (
    <li className="org-node">
      <NodeCard node={node} personLinkPrefix={personLinkPrefix} />
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <TreeBranch
              key={child.id}
              node={child}
              personLinkPrefix={personLinkPrefix}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

type FitState = {
  scale: number;
  scaledWidth: number;
  scaledHeight: number;
  needsScroll: boolean;
  measured: boolean;
};

export default function CompanyStructure({
  people,
  personLinkPrefix,
}: {
  people: Person[];
  personLinkPrefix: string;
}) {
  const hasAnyManagerLink = people.some((p) => !!p.reports_to);
  const roots = buildTree(people);

  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [fit, setFit] = useState<FitState>({
    scale: 1,
    scaledWidth: 0,
    scaledHeight: 0,
    needsScroll: false,
    measured: false,
  });

  const measure = useCallback(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    // offsetWidth / offsetHeight report layout dimensions, unaffected by our
    // own transform: scale, so we always get the natural (unscaled) size.
    const naturalWidth = inner.offsetWidth;
    const naturalHeight = inner.offsetHeight;
    const containerWidth = outer.clientWidth;
    if (naturalWidth === 0 || containerWidth === 0) return;

    let scale = 1;
    let needsScroll = false;
    if (containerWidth < naturalWidth) {
      const fittingScale = containerWidth / naturalWidth;
      if (fittingScale >= MIN_SCALE) {
        scale = fittingScale;
      } else {
        // Hold the floor and let the horizontal scroll take the overflow.
        scale = MIN_SCALE;
        needsScroll = true;
      }
    }
    // Round to two decimals so the browser gets stable pixel math, which
    // avoids the sub-pixel blur that shows up during hover lifts.
    scale = Math.round(scale * 100) / 100;

    const next: FitState = {
      scale,
      scaledWidth: Math.ceil(naturalWidth * scale),
      scaledHeight: Math.ceil(naturalHeight * scale),
      needsScroll,
      measured: true,
    };

    setFit((prev) => {
      if (
        prev.measured &&
        prev.scale === next.scale &&
        prev.scaledWidth === next.scaledWidth &&
        prev.scaledHeight === next.scaledHeight &&
        prev.needsScroll === next.needsScroll
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  useLayoutEffect(() => {
    measure();
    const outer = outerRef.current;
    const inner = innerRef.current;
    // ResizeObserver on both: outer catches card width changes (window
    // resize, sidebar collapse, etc.); inner catches roster-driven DOM
    // changes such as an added row or a reporting-line edit.
    const ro = new ResizeObserver(() => measure());
    if (outer) ro.observe(outer);
    if (inner) ro.observe(inner);
    // window resize is redundant with the outer observer in most modern
    // browsers, but keep it as a belt-and-braces safety net.
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, people]);

  return (
    <section className="card stack-3">
      <div className="card-header">
        <h2 className="chartreuse-underline">Company Structure</h2>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        Who reports to whom, drawn from the roster.
      </p>
      {!hasAnyManagerLink || roots.length === 0 ? (
        <p className="org-empty">
          Set who reports to whom when inviting people, and the structure will
          draw itself here.
        </p>
      ) : (
        <div
          ref={outerRef}
          className={`org-scroll ${fit.needsScroll ? "is-scrolling" : "is-fitting"}`}
        >
          <div
            className="org-fit-clip"
            style={
              fit.measured
                ? {
                    width: `${fit.scaledWidth}px`,
                    height: `${fit.scaledHeight}px`,
                  }
                : undefined
            }
          >
            <div
              ref={innerRef}
              className="org-fit-inner"
              style={{
                transform: `scale(${fit.scale}) translateZ(0)`,
              }}
            >
              <ul className="org-tree">
                {roots.map((r) => (
                  <TreeBranch
                    key={r.id}
                    node={r}
                    personLinkPrefix={personLinkPrefix}
                  />
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
