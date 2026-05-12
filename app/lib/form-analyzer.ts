export type FormAnalysis = {
  totalForms: number;
  pdFormsCount: number;
  formsWithoutConsent: number;
  formsWithPreCheckedConsent: number;
  formsWithoutPolicyLink: number;
};

const PD_FIELD_RE = /type=["'](?:email|tel)["']|name=["'][^"']*(?:phone|email|tel|name|fio)[^"']*["']|placeholder=["'][^"']*(?:телефон|email|имя|фамилия|почта)[^"']*["']/i;
const CHECKBOX_RE = /<input[^>]*type=["']checkbox["'][^>]*>/gi;
const PRECHECKED_RE = /<input[^>]*type=["']checkbox["'][^>]*\schecked(?:=["'][^"']*["'])?[^>]*>/i;
const POLICY_LINK_RE = /<a\s[^>]*href[^>]*>[^<]*(?:политик|privacy|конфиденц)[^<]*<\/a>/i;

function extractForms(html: string): string[] {
  const forms: string[] = [];
  const re = /<form[\s>][\s\S]*?<\/form>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    forms.push(m[0]);
  }
  return forms;
}

export function analyzeForms(html: string): FormAnalysis {
  const forms = extractForms(html);
  let pdFormsCount = 0;
  let formsWithoutConsent = 0;
  let formsWithPreCheckedConsent = 0;
  let formsWithoutPolicyLink = 0;

  for (const form of forms) {
    if (!PD_FIELD_RE.test(form)) continue;
    pdFormsCount++;

    const checkboxes = form.match(CHECKBOX_RE) ?? [];
    const hasConsent = checkboxes.length > 0;

    if (!hasConsent) {
      formsWithoutConsent++;
    } else if (PRECHECKED_RE.test(form)) {
      formsWithPreCheckedConsent++;
    }

    if (!POLICY_LINK_RE.test(form)) {
      formsWithoutPolicyLink++;
    }
  }

  return {
    totalForms: forms.length,
    pdFormsCount,
    formsWithoutConsent,
    formsWithPreCheckedConsent,
    formsWithoutPolicyLink,
  };
}
