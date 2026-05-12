export type Violation = {
  id: string;
  category: string;
  title: string;
  law: string;
  fineMin: number;
  fineMax: number;
  evidence: string;
  severity: "low" | "medium" | "high" | "critical";
  realRiskLevel?: "high" | "medium" | "low";
  enforcementNote?: string;
};

export type PassedRule = {
  id: string;
  category: string;
  title: string;
};

export type CheckResult = {
  url: string;
  checkedAt: string;
  mode: "quick" | "pro";
  violations: Violation[];
  passed: PassedRule[];
  totalFineMin: number;
  totalFineMax: number;
  realisticFine: number;
  rulesChecked: number;
  categoriesChecked: number;
  warnings?: string[];
  spaDetected?: boolean;
};
