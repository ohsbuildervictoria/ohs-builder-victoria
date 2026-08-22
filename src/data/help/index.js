// ============================================================================
// Help Centre data — single entry point.
//
// GUIDES drives /help and the role guide pages; findArticleByPath powers the
// contextual ❓ Help drawer in both app shells; searchHelp backs the Help
// Centre search box across every article and FAQ.
// ============================================================================

import { builderGuide } from "./builderGuide.js";
import { stakeholderGuide } from "./stakeholderGuide.js";
import { adminGuide } from "./adminGuide.js";
import { educationGuide } from "./educationGuide.js";
import { FAQ_CATEGORIES } from "./faq.js";

export const GUIDES = [builderGuide, stakeholderGuide, adminGuide, educationGuide];

export const guideByRole = (role) =>
  GUIDES.find((g) => g.role === String(role || "").toLowerCase()) || null;

// Contextual help: longest route prefix wins, so "/builder/incidents/near-miss"
// resolves to the Incidents article rather than nothing. Hash suffixes on
// routes ("/builder/policies#branding") mark deep-linked sections of a page
// that has its own primary article — they're ignored for path matching.
export function findArticleByPath(pathname) {
  let best = null;
  let bestLen = -1;
  for (const guide of GUIDES) {
    for (const article of guide.articles) {
      for (const route of article.routes) {
        if (route.includes("#")) continue;
        if (pathname.startsWith(route) && route.length > bestLen) {
          best = { guide, article };
          bestLen = route.length;
        }
      }
    }
  }
  return best;
}

// Extra articles for one page — e.g. Policies hosts branding, settings and
// billing articles behind "#" routes; the drawer offers them as related reads.
export function relatedArticlesByPath(pathname, excludeSlug) {
  const related = [];
  for (const guide of GUIDES) {
    for (const article of guide.articles) {
      if (article.slug === excludeSlug) continue;
      const matches = article.routes.some((r) => {
        const base = r.split("#")[0];
        return base === pathname || (r.includes("#") && pathname.startsWith(base));
      });
      if (matches) {
        related.push({ guide, article });
      }
    }
  }
  return related;
}

// Flat search across articles and FAQs for the Help Centre search box.
export function searchHelp(query) {
  const q = String(query || "").trim().toLowerCase();
  if (q.length < 2) return [];
  const results = [];

  for (const guide of GUIDES) {
    for (const article of guide.articles) {
      const haystack = `${article.title} ${article.summary} ${article.purpose}`.toLowerCase();
      if (haystack.includes(q)) {
        results.push({
          type: "article",
          icon: article.icon,
          title: article.title,
          snippet: article.summary,
          badge: guide.title,
          href: `/help/${guide.role}/${article.slug}`,
        });
      }
    }
  }

  for (const cat of FAQ_CATEGORIES) {
    for (const item of cat.items) {
      if (`${item.q} ${item.a}`.toLowerCase().includes(q)) {
        results.push({
          type: "faq",
          icon: cat.icon,
          title: item.q,
          snippet: item.a,
          badge: `FAQ · ${cat.title}`,
          href: "/help/faq",
        });
      }
    }
  }

  return results.slice(0, 8);
}
