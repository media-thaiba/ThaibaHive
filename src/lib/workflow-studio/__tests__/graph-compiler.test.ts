import {
  compileCanvasToDsl,
  importDslToCanvas,
  fingerprintDsl,
  computeDslHash,
  type StudioCanvasState,
} from "../graph-compiler";

function linearCanvas(keys: string[]): StudioCanvasState {
  const nodes = [
    {
      id: "trigger",
      position: { x: 0, y: 0 },
      data: { label: "Trigger", nodeType: "trigger" as const, trigger: { type: "manual" as const } },
    },
    ...keys.map((k, i) => ({
      id: k,
      position: { x: (i + 1) * 280, y: 0 },
      data: { label: k, nodeType: "action" as const, tool: "demo.execute" },
    })),
  ];
  const edges = [
    { source: "trigger", target: keys[0] },
    ...keys.slice(0, -1).map((k, i) => ({ source: k, target: keys[i + 1] })),
  ];
  return { nodes, edges };
}

describe("GraphCompiler: Canvas → DSL", () => {
  it("compiles a linear chain with explicit next pointers", () => {
    const result = compileCanvasToDsl(linearCanvas(["a", "b", "c"]), { key: "wf1", name: "WF One" });
    expect(result.success).toBe(true);
    expect(result.dsl!.steps.map((s: any) => s.key)).toEqual(["a", "b", "c"]);
    expect((result.dsl!.steps[0] as any).next).toBe("b");
    expect((result.dsl!.steps[1] as any).next).toBe("c");
    expect((result.dsl!.steps[2] as any).next).toBeUndefined();
    expect(result.dsl!.triggers[0].type).toBe("manual");
    expect(result.dslHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("compiles branch nodes with then/else handles", () => {
    const canvas: StudioCanvasState = {
      nodes: [
        { id: "trigger", position: { x: 0, y: 0 }, data: { label: "T", nodeType: "trigger", trigger: { type: "manual" } } },
        { id: "br", position: { x: 280, y: 0 }, data: { label: "Check", nodeType: "branch", condition: "scope.feeDue > 0" } },
        { id: "x", position: { x: 560, y: -100 }, data: { label: "Then", nodeType: "action", tool: "demo.then" } },
        { id: "y", position: { x: 560, y: 100 }, data: { label: "Else", nodeType: "action", tool: "demo.else" } },
      ],
      edges: [
        { source: "trigger", target: "br" },
        { source: "br", target: "x", sourceHandle: "then" },
        { source: "br", target: "y", sourceHandle: "else" },
      ],
    };
    const result = compileCanvasToDsl(canvas, { key: "wf2", name: "Branch WF" });
    expect(result.success).toBe(true);
    const branch: any = result.dsl!.steps.find((s: any) => s.key === "br");
    expect(branch.type).toBe("branch");
    expect(branch.then).toBe("x");
    expect(branch.else).toBe("y");
  });

  it("compiles approval, wait, and notification node types", () => {
    const canvas: StudioCanvasState = {
      nodes: [
        { id: "trigger", position: { x: 0, y: 0 }, data: { label: "T", nodeType: "trigger", trigger: { type: "manual" } } },
        { id: "ap", position: { x: 280, y: 0 }, data: { label: "Approve", nodeType: "approval", approval: { required: true, severity: "high" } } },
        { id: "w", position: { x: 560, y: 0 }, data: { label: "Wait", nodeType: "wait", waitMs: 5000 } },
        { id: "n", position: { x: 840, y: 0 }, data: { label: "Notify", nodeType: "notification", tool: "notify.push" } },
      ],
      edges: [
        { source: "trigger", target: "ap" },
        { source: "ap", target: "w" },
        { source: "w", target: "n" },
      ],
    };
    const result = compileCanvasToDsl(canvas, { key: "wf3", name: "Mixed WF" });
    expect(result.success).toBe(true);
    const approval: any = result.dsl!.steps.find((s: any) => s.key === "ap");
    expect(approval.type).toBe("approval");
    expect(approval.approval.severity).toBe("high");
    const wait: any = result.dsl!.steps.find((s: any) => s.key === "w");
    expect(wait.waitMs).toBe(5000);
  });

  it("compiles schedule, event, and anomaly triggers", () => {
    const mk = (trigger: any): StudioCanvasState => ({
      nodes: [
        { id: "trigger", position: { x: 0, y: 0 }, data: { label: "T", nodeType: "trigger", trigger } },
        { id: "a", position: { x: 280, y: 0 }, data: { label: "A", nodeType: "action", tool: "demo.run" } },
      ],
      edges: [{ source: "trigger", target: "a" }],
    });
    expect(compileCanvasToDsl(mk({ type: "schedule", cron: "0 * * * *" }), { key: "s1", name: "S" }).dsl!.triggers[0]).toMatchObject({ type: "schedule", cron: "0 * * * *" });
    expect(compileCanvasToDsl(mk({ type: "event", topic: "hardware.alert" }), { key: "e1", name: "E" }).dsl!.triggers[0]).toMatchObject({ type: "event", topic: "hardware.alert" });
    expect(compileCanvasToDsl(mk({ type: "anomaly", subsystem: "finance", severityThreshold: "high" }), { key: "a1", name: "A" }).dsl!.triggers[0]).toMatchObject({ type: "anomaly", subsystem: "finance" });
  });

  it("compiles parallel nodes with nested fan-out steps", () => {
    const canvas: StudioCanvasState = {
      nodes: [
        { id: "trigger", position: { x: 0, y: 0 }, data: { label: "T", nodeType: "trigger", trigger: { type: "manual" } } },
        { id: "p", position: { x: 280, y: 0 }, data: { label: "Fork", nodeType: "parallel" } },
        { id: "l", position: { x: 560, y: -80 }, data: { label: "L", nodeType: "action", tool: "demo.left" } },
        { id: "r", position: { x: 560, y: 80 }, data: { label: "R", nodeType: "action", tool: "demo.right" } },
      ],
      edges: [
        { source: "trigger", target: "p" },
        { source: "p", target: "l", sourceHandle: "parallel" },
        { source: "p", target: "r", sourceHandle: "parallel" },
      ],
    };
    const result = compileCanvasToDsl(canvas, { key: "par1", name: "Parallel" });
    expect(result.success).toBe(true);
    const par: any = result.dsl!.steps.find((s: any) => s.key === "p");
    expect(par.type).toBe("parallel");
    expect(par.steps.map((s: any) => s.key).sort()).toEqual(["l", "r"]);
  });

  describe("Rejections", () => {
    const base = (nodes: any[], edges: any[]) => ({ nodes, edges });
    const trig = { id: "trigger", position: { x: 0, y: 0 }, data: { label: "T", nodeType: "trigger", trigger: { type: "manual" } } };
    const act = (id: string): StudioCanvasState["nodes"][number] => ({ id, position: { x: 280, y: 0 }, data: { label: id, nodeType: "action", tool: "demo.run" } });

    it("rejects missing trigger", () => {
      const r = compileCanvasToDsl(base([act("a")], []), { key: "k", name: "N" });
      expect(r.success).toBe(false);
      expect(r.errors.join(" ")).toMatch(/trigger node/);
    });

    it("rejects multiple triggers", () => {
      const r = compileCanvasToDsl(base([trig, { ...trig, id: "trigger2" }, act("a")], [{ source: "trigger", target: "a" }]), { key: "k", name: "N" });
      expect(r.success).toBe(false);
      expect(r.errors.join(" ")).toMatch(/exactly one trigger/);
    });

    it("rejects cycles (self loop and mutual loop)", () => {
      const selfLoop = compileCanvasToDsl(
        base([trig, act("a")], [{ source: "trigger", target: "a" }, { source: "a", target: "a" }]),
        { key: "k", name: "N" }
      );
      expect(selfLoop.success).toBe(false);

      const mutual = compileCanvasToDsl(
        base([trig, act("a"), act("b")], [
          { source: "trigger", target: "a" },
          { source: "a", target: "b" },
          { source: "b", target: "a" },
        ]),
        { key: "k", name: "N" }
      );
      expect(mutual.success).toBe(false);
      expect(mutual.errors.join(" ")).toMatch(/[Cc]ycle/);
    });

    it("rejects non-branch fan-out (ambiguity)", () => {
      const r = compileCanvasToDsl(
        base([trig, act("a"), act("b"), act("c")], [
          { source: "trigger", target: "a" },
          { source: "a", target: "b" },
          { source: "a", target: "c" },
        ]),
        { key: "k", name: "N" }
      );
      expect(r.success).toBe(false);
      expect(r.errors.join(" ")).toMatch(/fan out|outgoing edges/);
    });

    it("rejects branch without condition", () => {
      const r = compileCanvasToDsl(
        base([trig, { id: "br", position: { x: 280, y: 0 }, data: { label: "B", nodeType: "branch" } }, act("x")], [
          { source: "trigger", target: "br" },
          { source: "br", target: "x", sourceHandle: "then" },
        ]),
        { key: "k", name: "N" }
      );
      expect(r.success).toBe(false);
      expect(r.errors.join(" ")).toMatch(/condition/);
    });

    it("rejects dangling edge endpoints", () => {
      const r = compileCanvasToDsl(base([trig, act("a")], [{ source: "trigger", target: "a" }, { source: "a", target: "ghost" }]), { key: "k", name: "N" });
      expect(r.success).toBe(false);
      expect(r.errors.join(" ")).toMatch(/unknown target/);
    });

    it("rejects schedule trigger without cron", () => {
      const schedNode = {
        ...trig,
        data: { ...trig.data, trigger: { type: "schedule" } },
      } as StudioCanvasState["nodes"][number];
      const r = compileCanvasToDsl(
        { nodes: [schedNode, act("a")], edges: [{ source: "trigger", target: "a" }] },
        { key: "k", name: "N" }
      );
      expect(r.success).toBe(false);
      expect(r.errors.join(" ")).toMatch(/cron/);
    });
  });
});

describe("GraphCompiler: DSL → Canvas Import", () => {
  it("imports a compiled DSL back into canvas nodes and edges", () => {
    const compiled = compileCanvasToDsl(linearCanvas(["a", "b", "c"]), { key: "wf1", name: "WF One" });
    expect(compiled.success).toBe(true);

    const imported = importDslToCanvas(compiled.dsl!);
    expect(imported.errors).toEqual([]);
    const nodeIds = imported.canvas.nodes.map((n) => n.id);
    expect(nodeIds).toContain("trigger");
    expect(nodeIds).toEqual(expect.arrayContaining(["a", "b", "c"]));

    const edgePairs = imported.canvas.edges.map((e) => `${e.source}->${e.target}`);
    expect(edgePairs).toContain("trigger->a");
    expect(edgePairs).toContain("a->b");
    expect(edgePairs).toContain("b->c");
  });

  it("preserves branch then/else handles on import", () => {
    const canvas: StudioCanvasState = {
      nodes: [
        { id: "trigger", position: { x: 0, y: 0 }, data: { label: "T", nodeType: "trigger", trigger: { type: "manual" } } },
        { id: "br", position: { x: 280, y: 0 }, data: { label: "Check", nodeType: "branch", condition: "x > 1" } },
        { id: "x", position: { x: 560, y: -100 }, data: { label: "Then", nodeType: "action", tool: "demo.then" } },
        { id: "y", position: { x: 560, y: 100 }, data: { label: "Else", nodeType: "action", tool: "demo.else" } },
      ],
      edges: [
        { source: "trigger", target: "br" },
        { source: "br", target: "x", sourceHandle: "then" },
        { source: "br", target: "y", sourceHandle: "else" },
      ],
    };
    const compiled = compileCanvasToDsl(canvas, { key: "br1", name: "Branch" });
    const imported = importDslToCanvas(compiled.dsl!);
    const thenEdge = imported.canvas.edges.find((e) => e.source === "br" && e.sourceHandle === "then");
    const elseEdge = imported.canvas.edges.find((e) => e.source === "br" && e.sourceHandle === "else");
    expect(thenEdge?.target).toBe("x");
    expect(elseEdge?.target).toBe("y");
  });

  it("rejects invalid DSL payloads", () => {
    const imported = importDslToCanvas({ key: "", name: "", steps: [] } as any);
    expect(imported.errors.length).toBeGreaterThan(0);
    expect(imported.canvas.nodes).toHaveLength(0);
  });
});

describe("GraphCompiler: Round-Trip Fidelity (Gate 9)", () => {
  function roundTripFingerprint(canvas: StudioCanvasState, key: string) {
    const first = compileCanvasToDsl(canvas, { key, name: "RT" });
    expect(first.success).toBe(true);
    const imported = importDslToCanvas(first.dsl!);
    expect(imported.errors).toEqual([]);
    const second = compileCanvasToDsl(imported.canvas, { key, name: "RT" });
    expect(second.success).toBe(true);
    return {
      first: fingerprintDsl(first.dsl!),
      second: fingerprintDsl(second.dsl!),
    };
  }

  it("canvas → DSL → canvas → DSL preserves structure for a linear chain", () => {
    const { first, second } = roundTripFingerprint(linearCanvas(["a", "b", "c"]), "rt-linear");
    expect(second).toEqual(first);
  });

  it("canvas → DSL → canvas → DSL preserves structure for a branching workflow", () => {
    const canvas: StudioCanvasState = {
      nodes: [
        { id: "trigger", position: { x: 0, y: 0 }, data: { label: "T", nodeType: "trigger", trigger: { type: "manual" } } },
        { id: "br", position: { x: 280, y: 0 }, data: { label: "Check", nodeType: "branch", condition: "amount > 100" } },
        { id: "x", position: { x: 560, y: -100 }, data: { label: "High", nodeType: "approval", approval: { required: true, severity: "high" } } },
        { id: "y", position: { x: 560, y: 100 }, data: { label: "Low", nodeType: "action", tool: "demo.auto" } },
      ],
      edges: [
        { source: "trigger", target: "br" },
        { source: "br", target: "x", sourceHandle: "then" },
        { source: "br", target: "y", sourceHandle: "else" },
      ],
    };
    const { first, second } = roundTripFingerprint(canvas, "rt-branch");
    expect(second).toEqual(first);
  });

  // Property-based: 25 random DAGs (linear chains with optional branch + leaf else-targets)
  // must survive round-trip with identical structural fingerprints.
  it("property-based: 25 random DAGs preserve structural fingerprints", () => {
    let seed = 42;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % n;
    };

    for (let i = 0; i < 25; i++) {
      const chainLen = 3 + rand(5);
      const chain = Array.from({ length: chainLen }, (_, j) => `c${i}_${j}`);
      const nodes: StudioCanvasState["nodes"] = [
        { id: "trigger", position: { x: 0, y: 0 }, data: { label: "T", nodeType: "trigger", trigger: { type: "manual" } } },
        ...chain.map((k, j) => ({
          id: k,
          position: { x: (j + 1) * 280, y: 0 },
          data: { label: k, nodeType: "action" as const, tool: `demo.step${rand(5)}` },
        })),
      ];
      const edges: StudioCanvasState["edges"] = [{ source: "trigger", target: chain[0] }];

      for (let j = 0; j < chain.length - 1; j++) {
        const node = nodes.find((n) => n.id === chain[j])!;
        const useBranch = rand(3) === 0;
        if (useBranch) {
          // Branch: then → next chain node, else → a dedicated leaf node
          const leafId = `leaf${i}_${j}`;
          nodes.push({
            id: leafId,
            position: { x: (j + 1) * 280, y: 140 },
            data: { label: leafId, nodeType: "action", tool: "demo.else" },
          });
          node.data = { label: chain[j], nodeType: "branch", condition: `v${j} > ${rand(100)}` };
          edges.push({ source: chain[j], target: chain[j + 1], sourceHandle: "then" });
          edges.push({ source: chain[j], target: leafId, sourceHandle: "else" });
        } else {
          edges.push({ source: chain[j], target: chain[j + 1] });
        }
      }

      const canvas: StudioCanvasState = { nodes, edges };
      const { first, second } = roundTripFingerprint(canvas, `prop-${i}`);
      expect(second).toEqual(first);
    }
  });
});

describe("computeDslHash", () => {
  it("is deterministic and changes when the DSL changes", () => {
    const a = compileCanvasToDsl(linearCanvas(["a", "b"]), { key: "h1", name: "H" });
    const b = compileCanvasToDsl(linearCanvas(["a", "b"]), { key: "h1", name: "H" });
    const c = compileCanvasToDsl(linearCanvas(["a", "b", "c"]), { key: "h1", name: "H" });
    expect(a.dslHash).toBe(b.dslHash);
    expect(a.dslHash).not.toBe(c.dslHash);
    expect(computeDslHash(a.dsl!)).toBe(a.dslHash);
  });
});
