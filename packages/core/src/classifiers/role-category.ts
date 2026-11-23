import type { RoleCategory } from '../constants';

const norm = (s: string) =>
  ` ${s
    .toLowerCase()
    .replace(/[^a-z0-9+#./ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;

/** First match wins, so order matters: specific before generic. */
const TITLE_RULES: [RoleCategory, RegExp][] = [
  [
    'security',
    /\b(security|infosec|appsec|cyber ?security|penetration|pen ?test|soc analyst|threat|vulnerability|malware|cryptograph|grc|iam engineer|detection engineer)\b/,
  ],
  [
    'qa',
    /\b(qa|quality assurance|quality engineer|sdet|tester|test (engineer|automation|lead|analyst|architect)|automation test|testing)\b/,
  ],
  [
    'design',
    /\b(designer|ux|ui ux|ui\/ux|user research|user researcher|design (lead|manager|director|systems)|head of design|interaction design)\b/,
  ],
  [
    'product',
    /\b(product (manager|owner|lead|director|head|management)|head of product|vp.{0,10}product|chief product|technical program manager|tpm|program manager|cpo)\b/,
  ],
  [
    'ml_ai',
    /\b(machine learning|ml|ai|artificial intelligence|deep learning|computer vision|nlp|llm|llms|gen ?ai|generative|mlops|research scientist|applied scientist|research engineer|ai scientist|perception|speech|inference|model (training|evaluation)|reinforcement learning)\b/,
  ],
  [
    'data',
    /\b(data (engineer|engineering|scientist|science|analyst|analytics|architect|platform|infrastructure|warehouse|pipeline|governance|modeler|steward)|analytics|business intelligence|bi (developer|engineer|analyst)|etl|big data|decision scien|product analyst|data$|databricks|spark|snowflake)\b/,
  ],
  ['mobile', /\b(mobile|ios|android|react native|flutter|swift|kotlin)\b/],
  [
    'devops',
    /\b(devops|dev ops|sre|site reliability|reliability|cloud|infrastructure|infra|platform engineer|kubernetes|k8s|network engineer|systems? engineer|production engineer|build engineer|release engineer|dba|database (administrator|engineer|reliability)|linux|it (administrator|admin|support|specialist)|it systems?|systems? administrator|sysadmin|observability|devsecops)\b/,
  ],
  ['fullstack', /\b(full ?stack|fullstack)\b/],
  [
    'frontend',
    /\b(front ?end|frontend|ui engineer|ui developer|web developer|web engineer|react|angular|vue|javascript engineer|typescript engineer|design engineer)\b/,
  ],
  [
    'backend',
    /\b(back ?end|backend|server side|api engineer|java|golang|go engineer|go developer|python developer|python engineer|node(js|\.js)? (engineer|developer)|ruby|scala|rust|c\+\+|\.net|dotnet|php|distributed systems|payments engineer|microservices)\b/,
  ],
  // Customer-facing technical roles: don't guess a stack from the description.
  [
    'other_tech',
    /\b(support engineer|support specialist|technical support|customer (success|experience|support|solutions?) engineer|solutions? (engineer|architect|consultant|specialist)|consult(ing|ant)|developer relations|devrel|developer advocate|implementation (engineer|consultant|specialist)|forward deployed|deployment engineer|escalation engineer|technical account|field engineer|professional services|sales engineer|presales)\b/,
  ],
];

const DEPARTMENT_RULES: [RoleCategory, RegExp][] = [
  ['security', /\bsecurity\b/],
  ['ml_ai', /\b(ai|ml|machine learning|research)\b/],
  ['data', /\b(data|analytics)\b/],
  ['mobile', /\bmobile\b/],
  ['devops', /\b(infrastructure|platform|devops|sre|cloud|it)\b/],
  ['qa', /\b(qa|quality)\b/],
  ['frontend', /\bfront ?end\b/],
  ['backend', /\bback ?end\b/],
  ['design', /\bdesign\b/],
  ['product', /\bproduct( management)?$/],
];

const FRONTEND_KW =
  /\b(react|angular|vue|css|html|frontend|front-end|next\.js|redux|tailwind|svelte)\b/gi;
const BACKEND_KW =
  /\b(java|golang|spring|microservices|kafka|postgres|mysql|distributed systems|grpc|backend|back-end|django|flask|node\.?js|scala|redis|api design)\b/gi;

/** Pure: classify a (tech) job into one role category. */
export function classifyRoleCategory(
  title: string,
  department?: string | null,
  description?: string | null,
): RoleCategory {
  const t = norm(title);
  for (const [cat, re] of TITLE_RULES) if (re.test(t)) return cat;
  if (department) {
    const d = norm(department).trim();
    for (const [cat, re] of DEPARTMENT_RULES) if (re.test(d)) return cat;
  }
  // Generic "Software Engineer": vote on description keywords.
  if (description) {
    const fe = new Set((description.match(FRONTEND_KW) ?? []).map((m) => m.toLowerCase())).size;
    const be = new Set((description.match(BACKEND_KW) ?? []).map((m) => m.toLowerCase())).size;
    if (fe >= 2 && be >= 2) return 'fullstack';
    if (be >= 2 && be > fe) return 'backend';
    if (fe >= 2 && fe > be) return 'frontend';
  }
  return 'other_tech';
}
