export type Violation = {
  id: string;
  category: string;
  title: string;
  law: string;
  fineMin: number;
  fineMax: number;
  evidence: string;
  severity: "low" | "medium" | "high" | "critical";
};

export type CheckResult = {
  url: string;
  checkedAt: string;
  mode: "demo" | "ai";
  violations: Violation[];
  totalFineMin: number;
  totalFineMax: number;
  realisticFine: number;
  rulesChecked: number;
  categoriesChecked: number;
};
