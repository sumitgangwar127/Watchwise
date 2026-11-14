export const COUNTRIES = [
  ["IN", "India"], ["US", "United States"], ["GB", "United Kingdom"], ["CA", "Canada"],
  ["AU", "Australia"], ["NZ", "New Zealand"], ["IE", "Ireland"], ["DE", "Germany"],
  ["FR", "France"], ["ES", "Spain"], ["IT", "Italy"], ["NL", "Netherlands"],
  ["BE", "Belgium"], ["CH", "Switzerland"], ["AT", "Austria"], ["SE", "Sweden"],
  ["NO", "Norway"], ["DK", "Denmark"], ["FI", "Finland"], ["PL", "Poland"],
  ["PT", "Portugal"], ["TR", "Türkiye"], ["RU", "Russia"], ["UA", "Ukraine"],
  ["AE", "United Arab Emirates"], ["SA", "Saudi Arabia"], ["EG", "Egypt"],
  ["ZA", "South Africa"], ["NG", "Nigeria"], ["KE", "Kenya"],
  ["JP", "Japan"], ["KR", "South Korea"], ["CN", "China"], ["HK", "Hong Kong"],
  ["TW", "Taiwan"], ["SG", "Singapore"], ["MY", "Malaysia"], ["ID", "Indonesia"],
  ["TH", "Thailand"], ["VN", "Vietnam"], ["PH", "Philippines"], ["PK", "Pakistan"],
  ["BD", "Bangladesh"], ["LK", "Sri Lanka"], ["NP", "Nepal"],
  ["BR", "Brazil"], ["MX", "Mexico"], ["AR", "Argentina"], ["CL", "Chile"], ["CO", "Colombia"],
].sort((a, b) => a[1].localeCompare(b[1]));

export const flag = (code) =>
  code && code.length === 2
    ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)))
    : "🌍";

// regions: null = available almost everywhere; otherwise the countries where it matters most.
// color/mono are used for the brand-colored tiles and "Watch on" buttons.
export const PLATFORMS = [
  { id: "netflix", name: "Netflix", mono: "N", color: "#E50914", regions: null },
  { id: "prime", name: "Prime Video", mono: "P", color: "#0891C9", regions: null },
  { id: "disney", name: "Disney+", mono: "D+", color: "#1B3FD6", regions: null },
  { id: "apple", name: "Apple TV+", mono: "tv", color: "#52525b", regions: null },
  { id: "youtube", name: "YouTube", mono: "Y", color: "#E02424", regions: null },
  { id: "mubi", name: "MUBI", mono: "M", color: "#3730A3", regions: null },
  { id: "max", name: "Max (HBO)", mono: "max", color: "#5B2BD6", regions: ["US", "GB", "CA", "AU", "ES", "FR", "DE", "IT", "BR", "MX", "SE", "NO", "DK", "FI", "NL", "PL", "PT"] },
  { id: "hulu", name: "Hulu", mono: "H", color: "#12A35A", regions: ["US"] },
  { id: "peacock", name: "Peacock", mono: "P", color: "#B7791F", regions: ["US"] },
  { id: "paramount", name: "Paramount+", mono: "P+", color: "#0B5FFF", regions: ["US", "GB", "CA", "AU", "DE", "FR", "IT", "BR", "MX"] },
  { id: "hotstar", name: "JioHotstar", mono: "H", color: "#1F80E0", regions: ["IN"] },
  { id: "sonyliv", name: "SonyLIV", mono: "S", color: "#2B4ACB", regions: ["IN"] },
  { id: "zee5", name: "ZEE5", mono: "Z", color: "#8230C6", regions: ["IN"] },
  { id: "jiocinema", name: "JioCinema", mono: "J", color: "#D6177F", regions: ["IN"] },
  { id: "bbc", name: "BBC iPlayer", mono: "B", color: "#DB2777", regions: ["GB"] },
  { id: "itvx", name: "ITVX", mono: "I", color: "#0D9488", regions: ["GB"] },
  { id: "crave", name: "Crave", mono: "C", color: "#1D7BD8", regions: ["CA"] },
  { id: "stan", name: "Stan", mono: "S", color: "#2563EB", regions: ["AU"] },
  { id: "crunchyroll", name: "Crunchyroll", mono: "C", color: "#F47521", regions: null },
  { id: "viki", name: "Viki", mono: "V", color: "#0EA5A0", regions: ["KR", "JP", "TW", "SG", "MY", "TH", "ID", "PH", "IN", "US", "GB"] },
  { id: "tving", name: "TVING", mono: "T", color: "#E11D48", regions: ["KR"] },
  { id: "unext", name: "U-NEXT", mono: "U", color: "#16A34A", regions: ["JP"] },
];

export const platformById = (id) => PLATFORMS.find((p) => p.id === id);

export const platformsFor = (code) =>
  PLATFORMS.filter((p) => p.regions === null || p.regions.includes(code));

/**
 * Where "Watch on <platform>" sends you.
 * Platforms with a known search URL open that platform's own search for the title.
 * Others fall back to a web search for "watch <title> on <platform>".
 * Exact per-title deep links will come from the live catalog later.
 */
const DIRECT = {
  netflix: (q) => `https://www.netflix.com/search?q=${q}`,
  prime: (q) => `https://www.primevideo.com/search/?phrase=${q}`,
  apple: (q) => `https://tv.apple.com/search?term=${q}`,
  youtube: (q) => `https://www.youtube.com/results?search_query=${q}`,
  hulu: (q) => `https://www.hulu.com/search?q=${q}`,
  crunchyroll: (q) => `https://www.crunchyroll.com/search?q=${q}`,
  mubi: (q) => `https://mubi.com/en/search/films?query=${q}`,
  paramount: (q) => `https://www.paramountplus.com/search/?q=${q}`,
  zee5: (q) => `https://www.zee5.com/search?q=${q}`,
  bbc: (q) => `https://www.bbc.co.uk/iplayer/search?q=${q}`,
};

export function watchUrl(platform, title) {
  const q = encodeURIComponent(title);
  const direct = DIRECT[platform.id];
  return direct
    ? direct(q)
    : `https://www.google.com/search?q=${encodeURIComponent(`watch ${title} on ${platform.name}`)}`;
}

export const GENRES = [
  "Action", "Adventure", "Animation", "Anime", "Comedy", "Crime", "Documentary",
  "Drama", "Family", "Fantasy", "Historical", "Horror", "Musical", "Mystery",
  "Reality", "Romance", "Sci-Fi", "Sports", "Thriller", "War", "Western",
];

export const guessCountry = () => {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region;
    return COUNTRIES.some(([c]) => c === region) ? region : "";
  } catch {
    return "";
  }
};
