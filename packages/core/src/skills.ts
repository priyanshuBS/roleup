/**
 * Curated tech skills dictionary for keyword matching. Each skill has a canonical name and
 * aliases; matching is case-insensitive on token boundaries (so "go" won't match "google",
 * and "C++"/"C#"/".NET"/"Node.js" work). Keep aliases unambiguous: "Go" is only matched as
 * "golang" or in "go lang"/"go developer" style contexts via its explicit aliases.
 */
export interface SkillDef {
  name: string;
  aliases: string[];
  group:
    | 'language'
    | 'frontend'
    | 'backend'
    | 'mobile'
    | 'data'
    | 'ml'
    | 'cloud'
    | 'devops'
    | 'database'
    | 'testing'
    | 'security'
    | 'design'
    | 'practice';
}

const s = (name: string, group: SkillDef['group'], ...aliases: string[]): SkillDef => ({
  name,
  group,
  aliases: [name.toLowerCase(), ...aliases],
});

export const SKILLS: SkillDef[] = [
  // Languages
  s('JavaScript', 'language', 'js', 'es6', 'ecmascript'),
  s('TypeScript', 'language', 'ts'),
  s('Python', 'language', 'py'),
  s('Java', 'language', 'java 8', 'java 11', 'java 17', 'core java'),
  s('Kotlin', 'language'),
  s('Swift', 'language'),
  s('Go', 'language', 'golang', 'go lang'),
  s('Rust', 'language'),
  s('C++', 'language', 'cpp', 'c plus plus'),
  s('C#', 'language', 'c sharp', 'csharp'),
  s('C', 'language', 'c programming', 'ansi c'),
  s('Ruby', 'language'),
  s('PHP', 'language'),
  s('Scala', 'language'),
  s('Elixir', 'language'),
  s('Dart', 'language'),
  s('R', 'language', 'r programming', 'rstudio'),
  s('SQL', 'language', 'plsql', 'pl/sql', 't-sql', 'tsql'),
  s('Bash', 'language', 'shell scripting', 'shell script', 'zsh'),
  s('Solidity', 'language'),
  // Frontend
  s('React', 'frontend', 'react.js', 'reactjs', 'react js'),
  s('Next.js', 'frontend', 'nextjs', 'next js'),
  s('Angular', 'frontend', 'angularjs', 'angular.js'),
  s('Vue', 'frontend', 'vue.js', 'vuejs', 'nuxt', 'nuxt.js'),
  s('Svelte', 'frontend', 'sveltekit'),
  s('Redux', 'frontend', 'redux toolkit', 'rtk'),
  s('HTML', 'frontend', 'html5'),
  s('CSS', 'frontend', 'css3', 'scss', 'sass', 'less'),
  s('Tailwind CSS', 'frontend', 'tailwind', 'tailwindcss'),
  s('Webpack', 'frontend', 'vite', 'rollup', 'esbuild'),
  s('GraphQL', 'backend', 'apollo', 'graph ql'),
  // Backend
  s('Node.js', 'backend', 'nodejs', 'node js', 'node'),
  s('Express', 'backend', 'express.js', 'expressjs'),
  s('NestJS', 'backend', 'nest.js'),
  s('Django', 'backend', 'django rest framework', 'drf'),
  s('Flask', 'backend'),
  s('FastAPI', 'backend', 'fast api'),
  s('Spring Boot', 'backend', 'springboot', 'spring framework', 'spring mvc'),
  s('Hibernate', 'backend', 'jpa'),
  s('Ruby on Rails', 'backend', 'rails', 'ror'),
  s('Laravel', 'backend'),
  s('.NET', 'backend', 'dotnet', 'asp.net', '.net core', 'dot net'),
  s('gRPC', 'backend', 'protobuf', 'protocol buffers'),
  s('REST APIs', 'backend', 'restful', 'rest api', 'restful apis', 'api design'),
  s(
    'Microservices',
    'backend',
    'microservice',
    'micro services',
    'service oriented architecture',
    'soa',
  ),
  s('Distributed Systems', 'backend', 'distributed computing'),
  s('System Design', 'backend', 'high level design', 'low level design', 'hld', 'lld'),
  s('Kafka', 'backend', 'apache kafka'),
  s('RabbitMQ', 'backend', 'rabbit mq', 'amqp'),
  s('Redis', 'database'),
  s('Elasticsearch', 'database', 'elastic search', 'opensearch', 'elk'),
  // Databases
  s('PostgreSQL', 'database', 'postgres', 'psql'),
  s('MySQL', 'database', 'mariadb'),
  s('MongoDB', 'database', 'mongo'),
  s('Cassandra', 'database', 'apache cassandra'),
  s('DynamoDB', 'database', 'dynamo db'),
  s('Oracle', 'database', 'oracle db'),
  s('SQLite', 'database'),
  s('ClickHouse', 'database'),
  s('Neo4j', 'database'),
  // Mobile
  s('Android', 'mobile', 'android sdk', 'jetpack compose'),
  s('iOS', 'mobile', 'swiftui', 'uikit', 'xcode'),
  s('React Native', 'mobile', 'react-native'),
  s('Flutter', 'mobile'),
  // Data
  s('Spark', 'data', 'apache spark', 'pyspark', 'spark sql'),
  s('Hadoop', 'data', 'hdfs', 'mapreduce', 'hive'),
  s('Airflow', 'data', 'apache airflow'),
  s('dbt', 'data', 'data build tool'),
  s('Snowflake', 'data'),
  s('BigQuery', 'data', 'big query'),
  s('Redshift', 'data', 'amazon redshift'),
  s('Databricks', 'data'),
  s('ETL', 'data', 'elt', 'data pipelines', 'data pipeline'),
  s('Pandas', 'data'),
  s('NumPy', 'data', 'numpy'),
  s('Tableau', 'data'),
  s('Power BI', 'data', 'powerbi'),
  s('Looker', 'data', 'lookml'),
  s('MS Excel', 'data', 'advanced excel', 'microsoft excel'),
  s(
    'Statistics',
    'data',
    'statistical analysis',
    'hypothesis testing',
    'a/b testing',
    'ab testing',
  ),
  // ML
  s('Machine Learning', 'ml', 'ml'),
  s('Deep Learning', 'ml', 'dl', 'neural networks'),
  s('PyTorch', 'ml', 'torch'),
  s('TensorFlow', 'ml', 'tensor flow', 'keras'),
  s('scikit-learn', 'ml', 'sklearn', 'scikit learn'),
  s('NLP', 'ml', 'natural language processing'),
  s('Computer Vision', 'ml', 'opencv'),
  s('LLMs', 'ml', 'llm', 'large language models', 'gpt', 'generative ai', 'genai', 'gen ai'),
  s('RAG', 'ml', 'retrieval augmented generation', 'vector database', 'vector db', 'embeddings'),
  s('LangChain', 'ml', 'llamaindex'),
  s('Hugging Face', 'ml', 'huggingface', 'transformers'),
  s('MLOps', 'ml', 'mlflow', 'kubeflow'),
  s('XGBoost', 'ml', 'lightgbm'),
  // Cloud & DevOps
  s('AWS', 'cloud', 'amazon web services', 'ec2', 's3', 'lambda', 'ecs', 'eks'),
  s('GCP', 'cloud', 'google cloud', 'google cloud platform', 'gke'),
  s('Azure', 'cloud', 'microsoft azure', 'aks'),
  s('Docker', 'devops', 'containers', 'containerization'),
  s('Kubernetes', 'devops', 'k8s', 'helm'),
  s('Terraform', 'devops', 'iac', 'infrastructure as code', 'pulumi'),
  s('Ansible', 'devops', 'chef', 'puppet'),
  s(
    'CI/CD',
    'devops',
    'ci cd',
    'continuous integration',
    'continuous delivery',
    'continuous deployment',
  ),
  s('Jenkins', 'devops'),
  s('GitHub Actions', 'devops', 'gitlab ci', 'circleci'),
  s('Linux', 'devops', 'unix', 'ubuntu', 'centos'),
  s('Prometheus', 'devops', 'grafana'),
  s('Observability', 'devops', 'monitoring', 'datadog', 'new relic', 'opentelemetry'),
  s('Nginx', 'devops'),
  s('Git', 'practice', 'github', 'gitlab', 'bitbucket', 'version control'),
  s('Networking', 'devops', 'tcp/ip', 'dns', 'load balancing', 'http'),
  // Testing
  s('Unit Testing', 'testing', 'unit tests', 'tdd', 'test driven development'),
  s('Jest', 'testing', 'vitest', 'mocha'),
  s('Selenium', 'testing', 'webdriver'),
  s('Cypress', 'testing', 'playwright'),
  s('JUnit', 'testing', 'testng', 'mockito'),
  s('Pytest', 'testing'),
  s('Appium', 'testing'),
  s('Postman', 'testing', 'api testing'),
  s('Performance Testing', 'testing', 'jmeter', 'load testing', 'gatling', 'k6'),
  // Security
  s('Application Security', 'security', 'appsec', 'owasp', 'secure coding'),
  s('Penetration Testing', 'security', 'pentesting', 'pen testing', 'burp suite'),
  s('SIEM', 'security', 'splunk'),
  s(
    'IAM',
    'security',
    'identity and access management',
    'oauth',
    'oauth2',
    'sso',
    'saml',
    'openid connect',
  ),
  s('Cryptography', 'security', 'encryption', 'tls', 'pki'),
  // Design & product
  s('Figma', 'design'),
  s('User Research', 'design', 'usability testing', 'user interviews'),
  s('Prototyping', 'design', 'wireframing', 'wireframes'),
  s('Design Systems', 'design', 'design system'),
  s('Product Management', 'practice', 'product roadmap', 'roadmapping', 'prd', 'prds'),
  s('Agile', 'practice', 'scrum', 'kanban', 'sprint planning'),
  s('Jira', 'practice', 'confluence'),
  s('Data Structures', 'practice', 'data structures and algorithms', 'dsa', 'algorithms'),
  s(
    'OOP',
    'practice',
    'object oriented programming',
    'object-oriented',
    'design patterns',
    'solid principles',
  ),
  s('Multithreading', 'practice', 'concurrency', 'multi-threading', 'parallel programming'),
  s('Caching', 'practice', 'memcached', 'cdn'),
  s('Payments', 'practice', 'upi', 'payment gateway', 'pci dss'),
  s('Blockchain', 'practice', 'web3', 'ethereum', 'smart contracts'),
];

const escape = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Single-letter / very short names need explicit context to avoid false positives. */
const AMBIGUOUS = new Set([
  'c',
  'r',
  'go',
  'ts',
  'js',
  'py',
  'rn',
  'cv',
  'dl',
  'ml',
  'rest',
  'spring',
  'node',
  'http',
  'dns',
  'iac',
  'oracle',
  'excel',
  'git',
]);

interface Matcher {
  skill: SkillDef;
  re: RegExp;
}

let matchers: Matcher[] | null = null;

function getMatchers(): Matcher[] {
  if (matchers) return matchers;
  matchers = SKILLS.map((skill) => {
    const parts = skill.aliases.map((a) => {
      const low = a.toLowerCase();
      if (AMBIGUOUS.has(low)) {
        // Only when it looks like a listed skill: preceded/followed by list punctuation or "in/with".
        if (low === 'c')
          return '(?:^|[\\s,(/|•])c(?=\\s*(?:[,/)|•]|$|\\s+(?:and|programming|language)))';
        if (low === 'r')
          return '(?:^|[\\s,(/|•])r(?=\\s*(?:[,/)|•]|$|\\s+(?:programming|language|studio)))';
        if (low === 'go')
          return '(?:^|[\\s,(/|•])go(?=\\s*(?:[,/)|•]|$|\\s+(?:programming|language|developer|engineer|microservices)))';
      }
      return `(?<![a-z0-9+#.])${escape(low)}(?![a-z0-9+#]|\\.[a-z])`;
    });
    return { skill, re: new RegExp(parts.join('|'), 'im') };
  });
  return matchers;
}

/** Canonical skills mentioned in a text. */
export function extractSkills(text: string): SkillDef[] {
  const t = ` ${text.replace(/\s+/g, ' ')} `;
  return getMatchers()
    .filter((m) => m.re.test(t))
    .map((m) => m.skill);
}

export function skillByName(name: string): SkillDef | undefined {
  const low = name.toLowerCase();
  return SKILLS.find((x) => x.aliases.includes(low));
}
