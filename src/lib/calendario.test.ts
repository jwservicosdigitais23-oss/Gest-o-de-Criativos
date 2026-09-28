import { describe, expect, it } from "vitest";
import { gradeDoMes, navegar, semanaDe } from "./calendario";

describe("calendário", () => {
  it("grade de outubro/2026 começa no domingo 27/09 e termina no sábado 31/10", () => {
    const g = gradeDoMes(2026, 10);
    expect(g[0]).toBe("2026-09-27");
    expect(g.at(-1)).toBe("2026-10-31");
    expect(g.length % 7).toBe(0);
  });
  it("semana e navegação", () => {
    expect(semanaDe("2026-10-01")).toEqual([
      "2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03",
    ]);
    expect(navegar("mes", "2026-12-15", 1)).toBe("2027-01-01");
    expect(navegar("mes", "2026-01-15", -1)).toBe("2025-12-01");
    expect(navegar("semana", "2026-10-01", 1)).toBe("2026-10-08");
  });
});
