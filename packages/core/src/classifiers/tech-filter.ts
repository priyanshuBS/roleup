/**
 * Decide whether a job is a tech job. Rules, in order:
 *  1. Hard non-tech patterns (recruiter, sales engineer, account executive, …) → not tech, even if
 *     the title also contains "technical" or "engineer".
 *  2. Strong tech patterns (engineer, developer, data scientist, product manager, designer, …) →
 *     tech. These override soft exclusions, so "Marketing Data Engineer" is tech.
 *  3. Soft non-tech words (marketing, sales, finance, legal, HR, support, operations, …) → not tech.
 *  4. Otherwise fall back to the department.
 */

const norm = (s: string) =>
  ` ${s
    .toLowerCase()
    .replace(/[^a-z0-9+#./ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;

/** Never tech, regardless of other words in the title. */
const HARD_NON_TECH = [
  /\brecruit(er|ing|ment)\b/,
  /\btalent (acquisition|partner|sourcer|sourcing)\b/,
  /\bsourcer\b/,
  /\bsales engineer/,
  /\bpre ?sales\b/,
  /\baccount (executive|manager|director|development)\b/,
  /\bsales (development|representative|manager|director|lead|executive|specialist)\b/,
  /\bbusiness development\b/,
  /\b(sdr|bdr)\b/,
  /\bproduct marketing\b/,
  /\bgrowth marketing\b/,
  /\bmarketing (manager|lead|director|specialist|associate|operations|executive)\b/,
  /\b(mechanical|civil|chemical|electrical|manufacturing|process|structural|hvac|mep|piping|quality control|field service) engineer/,
  /\b(legal|counsel|paralegal|attorney|lawyer)\b/,
  /\b(accountant|accounting|bookkeep|payroll|tax (manager|analyst|associate)|auditor|treasury|controller|fp&a|fp a|financial analyst|finance (manager|analyst|associate|lead|director))\b/,
  /\b(hrbp|human resources|people (partner|operations|ops|business partner)|hr (manager|generalist|executive|business))\b/,
  /\b(executive assistant|office (manager|assistant|administrator)|receptionist|facilities|workplace (experience|coordinator))\b/,
  /\b(content writer|copywriter|social media|community manager|public relations|communications (manager|lead|director|specialist))\b/,
  /\b(customer success manager|customer service|call center|telesales|collections (agent|executive))\b/,
  /\b(procurement|purchasing|supply chain|warehouse|logistics (executive|coordinator)|delivery (executive|partner)|driver)\b/,
];

/** Strong tech signals. */
const STRONG_TECH = [
  /\b(software|backend|back end|frontend|front end|full ?stack|web|mobile|ios|android|platform|infrastructure|infra|cloud|devops|dev ops|data|ml|machine learning|ai|deep learning|security|systems?|site reliability|reliability|production|network|database|firmware|embedded|hardware|qa|test|automation|application|applications|solutions?|integration|api|distributed systems|compiler|kernel|graphics|game|blockchain|smart contract|research|forward deployed|implementation|analytics|support|sre|salesforce|sap|crm|erp|it|devrel|developer relations|build|release|verification|silicon|asic|fpga|rtl|design|ui|ux|computer vision|nlp|llm|gen ai|genai|robotics|perception|simulation|optimization|performance|observability|storage|payments|search|ranking|recommendation|fraud|identity|edge|kubernetes|java|python|golang|go|node|react|angular|vue|rust|c\+\+|scala|ruby|php|\.net|dotnet|flutter|unity) (engineer|engineering|developer|architect|programmer)\b/,
  /\b(engineer|developer|programmer)\b/,
  /\bengineering (manager|lead|director|head|vp|intern|internship|fellow)\b/,
  /\b(sde|swe|sdet|sre|mts)\b/,
  /\bsde ?(i{1,3}|[1-4])\b/,
  /\bmember of (the )?technical staff\b/,
  /\bdevops\b/,
  /\bsite reliability\b/,
  /\bdata (scientist|science|analyst|analytics|architect|platform|steward|governance|modeler)\b/,
  /\bdecision scien/,
  /\banalytics (engineer|manager|lead)\b/,
  /\bbusiness intelligence\b|\bbi (developer|analyst|engineer)\b/,
  /\b(machine learning|deep learning|computer vision|nlp|llm|generative ai|gen ?ai|mlops)\b/,
  /\b(research|applied|ml|ai) scientist\b/,
  /\bresearch(er| engineer)\b/,
  /\b(product|program|technical program) manager\b/,
  /\b(product|program) (owner|lead|director|head)\b/,
  /\bhead of (product|engineering|technology|data|design|security|infrastructure|platform|ai|ml)\b/,
  /\b(director|vp|vice president|chief).{0,20}(engineering|technology|product|data|security|design|ai|ml|infrastructure|platform)\b/,
  /\b(cto|ciso|cpo)\b/,
  /\b(product|ux|ui|interaction|visual|experience|service) designer\b/,
  /\bdesign (lead|manager|director|systems)\b/,
  /\bux (researcher|writer|research|designer)\b/,
  /\buser researcher\b/,
  /\b(security|soc|threat|vulnerability|malware|penetration|pen test|appsec|infosec|cyber ?security|grc) (analyst|engineer|researcher|specialist|architect|lead|manager)\b/,
  /\bpenetration tester\b/,
  /\b(cloud|solutions?|enterprise|software|technical|data|security|systems?) architect\b/,
  /\b(qa|quality assurance|test|automation) (analyst|lead|manager|specialist|tester)\b/,
  /\btester\b/,
  /\b(it|system|systems|network|database|linux|cloud) (administrator|admin|specialist)\b/,
  /\bdba\b/,
  /\btech(nical)? lead\b/,
  /\bscrum master\b/,
];

/** Soft non-tech words. Overridden by strong tech matches. */
const SOFT_NON_TECH = [
  /\bsales\b/,
  /\bmarketing\b/,
  /\bfinance\b/,
  /\bfinancial\b/,
  /\blegal\b/,
  /\bcompliance\b/,
  /\bhr\b/,
  /\bpeople\b/,
  /\btalent\b/,
  /\bcustomer (support|success|experience|care)\b/,
  /\bsupport (specialist|associate|executive|agent|representative)\b/,
  /\boperations\b/,
  /\bops (manager|associate|executive|lead)\b/,
  /\bpartnerships?\b/,
  /\bpartner manager\b/,
  /\bbrand\b/,
  /\b(graphic|communication|communications|creative|marketing|video|social) designer\b/,
  /\b(illustrator|animator|video editor|photographer)\b/,
  /\bmotion designer\b/,
  /\bevent/,
  /\bcontent\b/,
  /\beditor\b/,
  /\bstrategy\b/,
  /\bconsultant\b/,
  /\bbusiness analyst\b/,
  /\bcredit\b/,
  /\brisk (manager|analyst|associate)\b/,
  /\bunderwriter\b/,
  /\bcategory manager\b/,
  /\bkey account\b/,
  /\bgrowth (manager|lead|associate)\b/,
  /\bhiring\b/,
  /\bintern\b/,
];

const TECH_DEPARTMENTS =
  /\b(engineering|technology|tech|r ?& ?d|research|data|analytics|ai|ml|machine learning|product|design|infrastructure|platform|security|devops|it|information technology|software|qa|quality)\b/;

const NON_TECH_DEPARTMENTS =
  /\b(sales|marketing|finance|legal|people|hr|human resources|talent|recruiting|customer|support|operations|business development|partnerships|g ?& ?a|admin)\b/;

export function isTechJob(title: string, department?: string | null): boolean {
  const t = norm(title);
  if (HARD_NON_TECH.some((r) => r.test(t))) return false;
  if (STRONG_TECH.some((r) => r.test(t))) return true;
  if (SOFT_NON_TECH.some((r) => r.test(t))) {
    // "Sales Intern" stays non-tech; "Intern" alone falls through to the department check.
    if (!/^ intern(ship)? $/.test(t)) return false;
  }
  if (department) {
    const d = norm(department);
    if (NON_TECH_DEPARTMENTS.test(d) && !/\b(engineering|data)\b/.test(d)) return false;
    if (TECH_DEPARTMENTS.test(d)) return true;
  }
  return false;
}
