/**
 * Humanise le ton du rapport (moins de formulations type document IA).
 * Appelé avant merge : node scripts/humanize-report-fr.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { normalizePunctuation } from "./normalize-report-punctuation-fr.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const REPORT = path.join(ROOT, "reports", "Seller-Helper-Application-Documentation-fr.md");

/**
 * @param {string} text
 * @param {{ preserveChapter11?: boolean }} [options]
 */
export function humanize(text, options = {}) {
  const preserveChapter11 = options.preserveChapter11 === true;
  let t = text;

  const replacements = [
    [/Ce rapport présente un \*\*système intelligent/g, "Ce document décrit un système"],
    [/matérialisé par l'application/g, "intégré à l'application"],
    [/La première partie pose le \*\*cadre du projet\*\*[^.]*\./g,
      "La première partie situe le projet : contexte, difficultés rencontrées par les marchands, outils existants et motivations."],
    [/La deuxième partie présente la \*\*stack technique\*\*[^.]*\./g,
      "La deuxième partie expose les choix techniques, la collecte et le traitement des données, puis l'interface Seller Helper."],
    [/L'ensemble forme une boucle \*\*observer[^*]+\*\*\./g,
      "Le marchand peut ainsi suivre l'activité, lancer une analyse, agir sur la boutique et mesurer l'effet de ses décisions."],
    [/Dans ce contexte, l'enjeu n'est plus seulement/g, "L'enjeu n'est plus seulement"],
    [/Le présent travail vise à concevoir/g, "Le travail présenté ici vise à concevoir"],
    [/Ce document a pour objectifs de :\n\n- formaliser/g, "Ce rapport vise à formaliser"],
    [/- expliquer \*\*pourquoi\*\*/g, "- expliquer pourquoi"],
    [/- présenter la \*\*stack technique\*\*/g, "- décrire les technologies employées"],
    [/- présenter l'\*\*application Seller Helper\*\*/g, "- présenter l'interface Seller Helper"],
    [/- décrire les \*\*politiques de confidentialité\*\*/g, "- aborder la confidentialité et la sécurité"],
    [/auxquelles Seller Helper apporte une réponse structurée\./g,
      "que Seller Helper prend en charge de manière coordonnée."],
    [/\*\*Réponse Seller Helper\*\* :/g, "Seller Helper répond par"],
    [/\*\*Réponse\*\* :/g, "Réponse prévue :"],
    [/constat frappant/g, "constat fréquent sur le terrain"],
    [/démocratiser l'expertise e-commerce/g, "rendre plus accessibles des pratiques e-commerce"],
    [/Le besoin est double :\n\n-/g, "Deux besoins principaux se dégagent :\n\n-"],
    [/Grâce aux avancées en \*\*intelligence artificielle\*\*/g, "Les modèles de langage récents"],
    [/Notre motivation est de concevoir une plateforme \*\*accessible et centrée sur l'action\*\*/g,
      "Nous avons orienté le développement vers une interface simple et orientée action"],
    [/Les chapitres suivants décrivent/g, "Les sections suivantes présentent"],
    [/— développée dans les chapitres/g, ", développée aux chapitres"],
    [/Ce chapitre présente les choix technologiques/g, "Nous passons ici en revue les choix technologiques"],
    [/stack moderne \*\*full stack TypeScript\*\*/g, "application TypeScript"],
    [/Les critères retenus sont : \*\*maintenabilité\*\*/g, "Nous avons privilégié la maintenabilité"],
    [/Cette architecture \*\*double fournisseur\*\*/g, "Deux fournisseurs d'API"],
    [/Le présent chapitre explique \*\*quels groupes/g, "Nous précisons quels groupes"],
    [/comme un laboratoire commercial/g, "comme un tableau de bord terrain"],
    [/\*\*Données concernées\.\*\*/g, "Données enregistrées."],
    [/\*\*Pourquoi nous les collectons\.\*\*\n\n/g, "Intérêt pour le projet :\n\n"],
    [/Ce groupe répond à la question/g, "Ces données permettent de répondre à la question"],
    [/impossible avec seuls des compteurs/g, "difficile avec de simples compteurs"],
    ...(preserveChapter11 ?
      []
    : [
        [/Ce chapitre détaille chaque écran/g, "Nous décrivons ci-dessous chaque écran"],
        [/\*\*Rôle\.\*\* ([^\n]+)\n\n\*\*Éléments principaux\.\*\*\n\n/g, "$1\n\nFonctionnalités :\n\n"],
        [/\*\*Impact\.\*\* ([^\n]+)\n/g, "Usage attendu : $1\n"],
      ]),
    [/Le parcours type d'un marchand suit quatre phases :\n\n\*\*Observer\*\*/g,
      "En pratique, le marchand commence par consulter le Dashboard"],
    [/\*\*Analyser\*\* —/g, "Il lance ensuite"],
    [/\*\*Agir\*\* —/g, "Pour la mise en œuvre,"],
    [/\*\*Mesurer\*\* —/g, "Enfin, il"],
    [/Les chapitres 6 et 7 ont posé/g, "Après la collecte et l'analyse (chapitres 6 et 7),"],
    [/Le présent chapitre décrit comment les résultats sont \*\*restitués\*\*/g,
      "Cette section explique comment les résultats s'affichent"],
    [/\*\*Garde-fous\.\*\*/g, "Contrôles prévus :"],
    [/\*\*Pourquoi un LLM plutôt que des règles seules \?\*\*/g, "Intérêt du modèle de langage"],
    [/Au terme de ce projet, nous avons conçu et déployé un \*\*système intelligent[^*]+\*\*[^,]*,/g,
      "Ce projet a abouti à un système d'analyse et de recommandation"],
    [/incarné par l'application \*\*Seller Helper\*\*/g, ", déployé via Seller Helper"],
    [/Le rapport a montré que la valeur ne réside pas seulement dans l'interface/g,
      "L'essentiel ne se limite pas à l'interface"],
    [/Les apports essentiels sont :\n\n1\./g, "Retenons notamment :\n\n-"],
    [/2\. \*\*Données pertinentes\*\*/g, "- Données structurées"],
    [/3\. \*\*Analyse intelligente\*\*/g, "- Analyse par règles et par modèle de langage"],
    [/4\. \*\*Actionnabilité\*\*/g, "- Actions possibles depuis l'interface"],
    [/5\. \*\*Traçabilité\*\*/g, "- Suivi dans le temps via la Timeline"],
    [/6\. \*\*Confiance\*\*/g, "- Respect de la confidentialité"],
    [/7\. \*\*Stack moderne\*\*/g, "- Chaîne technique cohérente (Neon, Vercel, Brevo, etc.)"],
    [/au service d'une ambition simple : \*\*aider chaque marchand[^*]+\*\*\./g,
      "afin d'aider le marchand à prioriser ses décisions sur la boutique."],
    [/Seller Helper se distingue par trois apports :\n\n-/g, "Trois points forts ressortent :\n\n-"],
    [/Il ferme la boucle entre/g, "Il relie"],
    [/angle mort/g, "lacune"],
    [/actionnable/g, "utilisable sur le terrain"],
    [/alignée sur les objectifs business/g, "adaptée aux objectifs de la boutique"],
    [/Le commerce électronique s'est imposé comme un pilier majeur de l'économie numérique/g,
      "Le commerce en ligne occupe aujourd'hui une place centrale dans l'économie numérique"],
    [/une large majorité des visiteurs quittent les sites sans acheter/g,
      "beaucoup de visiteurs repartent sans acheter"],
    [/faute d'une compréhension fine de leur comportement/g,
      "faute d'une lecture claire de leur comportement"],
    [/outils d'aide à la décision réellement exploitables/g,
      "outils d'aide à la décision vraiment utilisables au quotidien"],
    [/L'enjeu n'est plus seulement de collecter des données, mais de les transformer en actions concrètes/g,
      "Il ne suffit plus de collecter des données : il faut en tirer des actions concrètes"],
    [/rapproche les indicateurs du terrain/g, "rapproche les chiffres de la réalité de la boutique"],
    [/environnement concurrentiel et complexe/g, "contexte concurrentiel et exigeant"],
    [/cristallise les décisions/g, "concentre les décisions"],
    [/sans cadre unifié pour les interpréter et agir/g,
      "sans vue d'ensemble pour les interpréter et agir"],
    [/au cœur du projet/g, "au centre du projet"],
    [/Nous les regroupons en six thèmes/g, "Nous les avons regroupés en six thèmes"],
    [/comblent cette lacune/g, "répondent à ce manque"],
    [/adressent ce sujet/g, "traitent ce point"],
    [/Ce chapitre détaille chaque écran : son rôle/g,
      "Ce chapitre présente chaque écran, son rôle"],
    [/sont restitués dans Seller Helper/g, "s'affichent dans Seller Helper"],
    [/sont maintenus à jour/g, "restent à jour"],
    [/garantit la cohérence/g, "assure la cohérence"],
    [/garantit un affichage cohérent/g, "évite les chiffres contradictoires à l'écran"],
    [/constitue la valeur du travail/g, "donne sa valeur au travail réalisé"],
    [/formalisent un modèle d'événements/g, "ont permis de formaliser un modèle d'événements"],
    [/Le prototype reste évolutif/g, "Le prototype peut encore évoluer"],
    [/constitue déjà une base solide/g, "offre déjà une base solide"],
    [/ont été mobilisés de façon cohérente/g, "ont été utilisés de manière cohérente"],
    [/La seconde expose/g, "La deuxième partie présente"],
    [/La première partie situe le projet, contexte/g,
      "La première partie situe le projet : contexte"],
  ];

  for (const [from, to] of replacements) {
    t = t.replace(from, to);
  }

  if (!preserveChapter11) {
    t = t.replace(/\*\*Rôle\.\*\* /g, "");
    t = t.replace(/\*\*Éléments principaux\.\*\*\n\n/g, "Contenu de l'écran :\n\n");
    t = t.replace(/\*\*Impact\.\*\* /g, "Usage : ");
  }
  t = t.replace(/\*\*Pourquoi nous les collectons\.\*\*\n\n/g, "Justification :\n\n");
  t = t.replace(/pourquoi\*\* chacun/g, "pourquoi chacun");
  t = t.replace(/actions intelligentes/g, "recommandations issues de l'analyse");

  t = t
    .split("\n")
    .map((line) => {
      if (/^\s*[|#\-*0-9]/.test(line) || line.includes("|")) return line;
      return line.replace(/\*\*([^*]{3,80})\*\*/g, (_, inner) => {
        const keep =
          /^(Seller Helper|Vitrina|Dashboard|Timeline|Analyze now|Send email|Inbox|Brevo|Neon|Vercel|Google|Gemini|OpenRouter|TypeScript|Next\.js|PostgreSQL|Better Auth|LLM|SKU|OAuth|React|Tailwind|Drizzle|heatmap\.js|Swiper|Sonner)$/i.test(
            inner.trim()
          );
        return keep ? `**${inner}**` : inner;
      });
    })
    .join("\n");

  return normalizePunctuation(t);
}

function main() {
  if (!fs.existsSync(REPORT)) {
    console.error("Rapport introuvable. Lancez d'abord merge-application-report-fr.mjs");
    process.exit(1);
  }
  const raw = fs.readFileSync(REPORT, "utf8");
  const preserveChapter11 =
    process.env.REPORT_PRESERVE_CH11 === "1" || process.argv.includes("--preserve-ch11");
  const humanized = humanize(raw, { preserveChapter11 });
  fs.writeFileSync(REPORT, humanized, "utf8");

  const start = humanized.search(/^## Chapitre 6[.:] Collecte/m);
  if (start >= 0) {
    const tailPath = path.join(ROOT, "reports", "seller-helper-technique-tail-fr.md");
    fs.writeFileSync(tailPath, humanized.slice(start).trim() + "\n", "utf8");
    console.log("Tail technique :", tailPath);
  }

  console.log("Rapport humanisé :", REPORT);
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  main();
}
