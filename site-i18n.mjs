/* Static site interface translation. Mathematical claims, status codes and evidence stay in source language. */
const translations={
  "en": {
    "research": "Research",
    "verification": "Verification",
    "lab": "Math Lab",
    "publications": "Publications",
    "contact": "Contact",
    "intro": "Mathematics, computer science and mathematical physics—developed through explicit assumptions, executable checks and formal proof where available.",
    "secondary": "Every claim has a boundary. Verified intermediate results are distinguished from conditional reductions and unsolved global obligations.",
    "programs": "Explore the research programs",
    "methodTitle": "Evidence without overclaiming",
    "accessTitle": "Inspect. Reproduce. Challenge.",
    "all": "All programs",
    "mathematics": "Mathematics",
    "computer-science": "Computer Science",
    "physics": "Physics",
    "infrastructure": "Infrastructure",
    "language": "Language"
  },
  "es": {
    "research": "Investigación",
    "verification": "Verificación",
    "lab": "Laboratorio matemático",
    "publications": "Publicaciones",
    "contact": "Contacto",
    "intro": "Matemáticas, informática y física matemática, desarrolladas mediante hipótesis explícitas, comprobaciones ejecutables y demostraciones formales cuando están disponibles.",
    "secondary": "Cada afirmación tiene límites. Los resultados intermedios verificados se distinguen de las reducciones condicionales y de las obligaciones globales abiertas.",
    "programs": "Explorar los programas de investigación",
    "methodTitle": "Evidencia sin afirmaciones excesivas",
    "accessTitle": "Examinar. Reproducir. Cuestionar.",
    "all": "Todos los programas",
    "mathematics": "Matemáticas",
    "computer-science": "Informática",
    "physics": "Física",
    "infrastructure": "Infraestructura",
    "language": "Idioma"
  },
  "pt-BR": {
    "research": "Pesquisa",
    "verification": "Verificação",
    "lab": "Laboratório de Matemática",
    "publications": "Publicações",
    "contact": "Contato",
    "intro": "Matemática, ciência da computação e física matemática, desenvolvidas com hipóteses explícitas, testes executáveis e provas formais quando disponíveis.",
    "secondary": "Cada afirmação tem limites. Resultados intermediários verificados são distintos de reduções condicionais e obrigações globais ainda abertas.",
    "programs": "Explorar os programas de pesquisa",
    "methodTitle": "Evidências sem exagerar conclusões",
    "accessTitle": "Examinar. Reproduzir. Questionar.",
    "all": "Todos os programas",
    "mathematics": "Matemática",
    "computer-science": "Ciência da Computação",
    "physics": "Física",
    "infrastructure": "Infraestrutura",
    "language": "Idioma"
  },
  "zh-Hans": {
    "research": "研究",
    "verification": "验证",
    "lab": "数学实验室",
    "publications": "出版物",
    "contact": "联系",
    "intro": "数学、计算机科学与数学物理研究：明确假设，采用可执行检查，并在可行时提供形式化证明。",
    "secondary": "每项论断都有明确范围。已验证的中间结果、条件性归约与尚未解决的全局义务分别标示。",
    "programs": "浏览研究项目",
    "methodTitle": "证据与适度主张",
    "accessTitle": "检查、复现、质疑。",
    "all": "全部项目",
    "mathematics": "数学",
    "computer-science": "计算机科学",
    "physics": "物理",
    "infrastructure": "基础设施",
    "language": "语言"
  },
  "fr": {
    "research": "Recherche",
    "verification": "Vérification",
    "lab": "Laboratoire de mathématiques",
    "publications": "Publications",
    "contact": "Contact",
    "intro": "Mathématiques, informatique et physique mathématique, avec hypothèses explicites, contrôles exécutables et preuves formelles lorsque disponibles.",
    "secondary": "Chaque affirmation a ses limites. Les résultats intermédiaires vérifiés sont distingués des réductions conditionnelles et des obligations globales ouvertes.",
    "programs": "Explorer les programmes de recherche",
    "methodTitle": "Des preuves sans exagération",
    "accessTitle": "Examiner. Reproduire. Critiquer.",
    "all": "Tous les programmes",
    "mathematics": "Mathématiques",
    "computer-science": "Informatique",
    "physics": "Physique",
    "infrastructure": "Infrastructure",
    "language": "Langue"
  },
  "de": {
    "research": "Forschung",
    "verification": "Verifikation",
    "lab": "Mathematiklabor",
    "publications": "Publikationen",
    "contact": "Kontakt",
    "intro": "Mathematik, Informatik und mathematische Physik – mit expliziten Annahmen, ausführbaren Prüfungen und formalen Beweisen, sofern verfügbar.",
    "secondary": "Jede Aussage hat eine klare Grenze. Verifizierte Zwischenergebnisse werden von bedingten Reduktionen und offenen globalen Verpflichtungen unterschieden.",
    "programs": "Forschungsprogramme erkunden",
    "methodTitle": "Belege ohne Übertreibung",
    "accessTitle": "Prüfen. Reproduzieren. Hinterfragen.",
    "all": "Alle Programme",
    "mathematics": "Mathematik",
    "computer-science": "Informatik",
    "physics": "Physik",
    "infrastructure": "Infrastruktur",
    "language": "Sprache"
  }
};
const selector=document.getElementById('site-language');
const label=document.querySelector('.site-language-label');
const params=new URLSearchParams(location.search);
function apply(lang){
 const chosen=Object.hasOwn(translations,lang)?lang:'en';
 for(const node of document.querySelectorAll('[data-site-i18n]')){
   const value=translations[chosen][node.dataset.siteI18n];
   if(value)node.textContent=value;
 }
 label.firstChild.textContent=translations[chosen].language+' ';
 document.documentElement.lang=chosen;
 selector.value=chosen;
 const lab=document.querySelector('a[href^="math-lab/index.html"]');
 if(lab)lab.href='math-lab/index.html?lang='+encodeURIComponent(chosen);
}
selector.addEventListener('change',()=>apply(selector.value));
apply(params.get('lang')||'en');
