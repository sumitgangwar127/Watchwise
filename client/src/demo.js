/**
 * SAMPLE CATALOG. Placeholder titles so the UI can be designed and tested before the
 * live catalog exists. Platform availability here is illustrative, not guaranteed.
 * Blurbs are original one-liners. Posters are generated from `palette`.
 * This file gets replaced by real catalog data from the database.
 */
const IN = ["IN"];

export const DEMO = [
  { id: "stranger-things", title: "Stranger Things", year: 2016, type: "tv", genres: ["Sci-Fi", "Fantasy", "Horror"], platforms: ["netflix"], palette: ["#e11d48", "#1e1b4b"], blurb: "Kids in a small town uncover a hidden world next door.", new: false },
  { id: "dark", title: "Dark", year: 2017, type: "tv", genres: ["Sci-Fi", "Mystery", "Thriller"], platforms: ["netflix"], palette: ["#0ea5e9", "#0f172a"], blurb: "A vanished child unravels four families across time.", new: false },
  { id: "money-heist", title: "Money Heist", year: 2017, type: "tv", genres: ["Crime", "Thriller", "Action"], platforms: ["netflix"], palette: ["#dc2626", "#450a0a"], blurb: "A mastermind recruits a crew for the biggest robbery ever planned.", new: false },
  { id: "squid-game", title: "Squid Game", year: 2021, type: "tv", genres: ["Thriller", "Drama"], platforms: ["netflix"], palette: ["#ec4899", "#064e3b"], blurb: "Desperate players risk everything in deadly children's games.", new: false },
  { id: "breaking-bad", title: "Breaking Bad", year: 2008, type: "tv", genres: ["Crime", "Drama", "Thriller"], platforms: ["netflix"], palette: ["#84cc16", "#1a2e05"], blurb: "A teacher turns to crime and cannot turn back.", new: false },
  { id: "peaky-blinders", title: "Peaky Blinders", year: 2013, type: "tv", genres: ["Crime", "Drama", "Historical"], platforms: ["netflix"], palette: ["#a8a29e", "#1c1917"], blurb: "A gang boss builds an empire in post-war Birmingham.", new: false },
  { id: "arcane", title: "Arcane", year: 2021, type: "tv", genres: ["Animation", "Fantasy", "Action"], platforms: ["netflix"], palette: ["#22d3ee", "#7c3aed"], blurb: "Two sisters land on opposite sides of a city divided.", new: true },
  { id: "wednesday", title: "Wednesday", year: 2022, type: "tv", genres: ["Comedy", "Fantasy", "Mystery"], platforms: ["netflix"], palette: ["#a78bfa", "#111827"], blurb: "A deadpan teen investigates mysteries at a school for outcasts.", new: false },
  { id: "bridgerton", title: "Bridgerton", year: 2020, type: "tv", genres: ["Romance", "Drama", "Historical"], platforms: ["netflix"], palette: ["#f9a8d4", "#9d174d"], blurb: "Love, scandal and rivalry in Regency-era high society.", new: false },
  { id: "drive-to-survive", title: "Drive to Survive", year: 2019, type: "tv", genres: ["Documentary", "Sports", "Reality"], platforms: ["netflix"], palette: ["#f87171", "#18181b"], blurb: "Inside the rivalries and pressure of a Formula 1 season.", new: false },
  { id: "our-planet", title: "Our Planet", year: 2019, type: "tv", genres: ["Documentary"], platforms: ["netflix"], palette: ["#34d399", "#064e3b"], blurb: "A sweeping look at nature's most fragile places.", new: false },
  { id: "sacred-games", title: "Sacred Games", year: 2018, type: "tv", genres: ["Crime", "Thriller", "Drama"], platforms: ["netflix"], palette: ["#f59e0b", "#7f1d1d"], blurb: "A cop gets 25 days to stop a catastrophe in Mumbai.", new: false },
  { id: "delhi-crime", title: "Delhi Crime", year: 2019, type: "tv", genres: ["Crime", "Drama"], platforms: ["netflix"], palette: ["#38bdf8", "#1e293b"], blurb: "Investigators chase suspects after a shocking crime in Delhi.", new: false },
  { id: "kota-factory", title: "Kota Factory", year: 2019, type: "tv", genres: ["Drama", "Comedy"], platforms: ["netflix"], palette: ["#fbbf24", "#111827"], blurb: "Coaching-city dreams, pressure and friendship.", new: false, regions: IN },

  { id: "the-boys", title: "The Boys", year: 2019, type: "tv", genres: ["Action", "Comedy", "Sci-Fi"], platforms: ["prime"], palette: ["#ef4444", "#1e3a8a"], blurb: "Vigilantes take on superheroes who abuse their power.", new: false },
  { id: "panchayat", title: "Panchayat", year: 2020, type: "tv", genres: ["Comedy", "Drama"], platforms: ["prime"], palette: ["#34d399", "#14532d"], blurb: "A city graduate becomes a village panchayat secretary.", new: false, regions: IN },
  { id: "mirzapur", title: "Mirzapur", year: 2018, type: "tv", genres: ["Crime", "Action", "Thriller"], platforms: ["prime"], palette: ["#f97316", "#292524"], blurb: "Power struggles inside a mafia-run empire.", new: false, regions: IN },
  { id: "fleabag", title: "Fleabag", year: 2016, type: "tv", genres: ["Comedy", "Drama"], platforms: ["prime"], palette: ["#fb7185", "#be123c"], blurb: "A sharp, messy look at love, grief and family.", new: false },
  { id: "reacher", title: "Reacher", year: 2022, type: "tv", genres: ["Action", "Thriller", "Crime"], platforms: ["prime"], palette: ["#94a3b8", "#0f172a"], blurb: "A drifter with a sense of justice stumbles into trouble.", new: true },
  { id: "invincible", title: "Invincible", year: 2021, type: "tv", genres: ["Animation", "Action", "Sci-Fi"], platforms: ["prime"], palette: ["#facc15", "#1d4ed8"], blurb: "A teen discovers what his superhero father is really like.", new: false },
  { id: "interstellar", title: "Interstellar", year: 2014, type: "movie", genres: ["Sci-Fi", "Adventure", "Drama"], platforms: ["prime"], palette: ["#fbbf24", "#0c1222"], blurb: "Explorers cross a wormhole to save humanity.", new: false },
  { id: "everything-everywhere", title: "Everything Everywhere All at Once", year: 2022, type: "movie", genres: ["Sci-Fi", "Comedy", "Adventure"], platforms: ["prime"], palette: ["#f472b6", "#4c1d95"], blurb: "A tired laundromat owner jumps between wild universes.", new: false },

  { id: "mandalorian", title: "The Mandalorian", year: 2019, type: "tv", genres: ["Sci-Fi", "Adventure", "Action"], platforms: ["disney"], palette: ["#f59e0b", "#1c1917"], blurb: "A lone bounty hunter guards a mysterious child.", new: false },
  { id: "andor", title: "Andor", year: 2022, type: "tv", genres: ["Sci-Fi", "Thriller", "Drama"], platforms: ["disney"], palette: ["#64748b", "#0f172a"], blurb: "A thief becomes a rebel in a galaxy under tightening control.", new: false },

  { id: "severance", title: "Severance", year: 2022, type: "tv", genres: ["Sci-Fi", "Thriller", "Mystery"], platforms: ["apple"], palette: ["#67e8f9", "#0c4a6e"], blurb: "Workers split their memories between job and life.", new: true },
  { id: "ted-lasso", title: "Ted Lasso", year: 2020, type: "tv", genres: ["Comedy", "Sports", "Drama"], platforms: ["apple"], palette: ["#60a5fa", "#14532d"], blurb: "An upbeat coach takes on a football club in England.", new: false },
  { id: "silo", title: "Silo", year: 2023, type: "tv", genres: ["Sci-Fi", "Mystery", "Drama"], platforms: ["apple"], palette: ["#fb923c", "#1f2937"], blurb: "Thousands live underground, and asking questions is forbidden.", new: false },

  { id: "succession", title: "Succession", year: 2018, type: "tv", genres: ["Drama", "Comedy"], platforms: ["max", "hotstar"], palette: ["#a1a1aa", "#18181b"], blurb: "A media dynasty's heirs battle for control.", new: false },
  { id: "chernobyl", title: "Chernobyl", year: 2019, type: "tv", genres: ["Historical", "Drama", "Thriller"], platforms: ["max", "hotstar"], palette: ["#a3e635", "#1c1917"], blurb: "The human cost of one of history's worst disasters.", new: false },
  { id: "last-of-us", title: "The Last of Us", year: 2023, type: "tv", genres: ["Drama", "Horror", "Adventure"], platforms: ["max", "hotstar"], palette: ["#65a30d", "#7f1d1d"], blurb: "A smuggler escorts a teen across a ruined America.", new: false },
  { id: "band-of-brothers", title: "Band of Brothers", year: 2001, type: "tv", genres: ["War", "Historical", "Drama"], platforms: ["max", "hotstar"], palette: ["#78716c", "#1c1917"], blurb: "One army company's journey through World War II.", new: false },
  { id: "spirited-away", title: "Spirited Away", year: 2001, type: "movie", genres: ["Animation", "Fantasy", "Family"], platforms: ["max"], palette: ["#f472b6", "#0e7490"], blurb: "A girl wanders into a spirit world and must work to escape.", new: false },

  { id: "the-bear", title: "The Bear", year: 2022, type: "tv", genres: ["Drama", "Comedy"], platforms: ["hulu", "hotstar"], palette: ["#f87171", "#292524"], blurb: "A chef returns home to run his family's sandwich shop.", new: false },
  { id: "shogun", title: "Shōgun", year: 2024, type: "tv", genres: ["Historical", "Drama", "War"], platforms: ["hulu", "hotstar"], palette: ["#dc2626", "#0c0a09"], blurb: "Power, honor and betrayal in feudal Japan.", new: true },
  { id: "only-murders", title: "Only Murders in the Building", year: 2021, type: "tv", genres: ["Comedy", "Mystery", "Crime"], platforms: ["hulu", "hotstar"], palette: ["#fbbf24", "#1e3a8a"], blurb: "Neighbors podcast their way into a murder mystery.", new: false },
  { id: "parasite", title: "Parasite", year: 2019, type: "movie", genres: ["Thriller", "Drama", "Comedy"], platforms: ["hulu"], palette: ["#4ade80", "#1c1917"], blurb: "A poor family schemes its way into a wealthy home.", new: false },

  { id: "scam-1992", title: "Scam 1992", year: 2020, type: "tv", genres: ["Drama", "Historical", "Crime"], platforms: ["sonyliv"], palette: ["#facc15", "#292524"], blurb: "The rise and fall of a stock-market giant.", new: false, regions: IN },
  { id: "gullak", title: "Gullak", year: 2019, type: "tv", genres: ["Comedy", "Family", "Drama"], platforms: ["sonyliv"], palette: ["#fbbf24", "#7c2d12"], blurb: "Everyday chaos and warmth in a middle-class family.", new: false, regions: IN },
  { id: "rocket-boys", title: "Rocket Boys", year: 2022, type: "tv", genres: ["Drama", "Historical"], platforms: ["sonyliv"], palette: ["#60a5fa", "#0b1020"], blurb: "Two scientists lay the foundations of India's space and nuclear programs.", new: false, regions: IN },
  { id: "asur", title: "Asur", year: 2020, type: "tv", genres: ["Thriller", "Mystery", "Crime"], platforms: ["jiocinema"], palette: ["#ef4444", "#18181b"], blurb: "Forensic experts hunt a killer with a mythic obsession.", new: false, regions: IN },

  { id: "demon-slayer", title: "Demon Slayer", year: 2019, type: "tv", genres: ["Anime", "Action", "Fantasy"], platforms: ["crunchyroll"], palette: ["#f97316", "#7f1d1d"], blurb: "A boy takes up the sword to cure his sister.", new: false },
  { id: "frieren", title: "Frieren: Beyond Journey's End", year: 2023, type: "tv", genres: ["Anime", "Fantasy", "Adventure"], platforms: ["crunchyroll"], palette: ["#a5b4fc", "#1e1b4b"], blurb: "An elf mage reflects on a quest that's already over.", new: true },

  { id: "yellowstone", title: "Yellowstone", year: 2018, type: "tv", genres: ["Drama", "Western"], platforms: ["paramount", "peacock"], palette: ["#d97706", "#1c1917"], blurb: "A ranching dynasty fights to protect its land.", new: false },
  { id: "inception", title: "Inception", year: 2010, type: "movie", genres: ["Sci-Fi", "Action", "Thriller"], platforms: ["netflix", "prime"], palette: ["#93c5fd", "#1e293b"], blurb: "A thief enters dreams to plant an idea.", new: false },
  { id: "oppenheimer", title: "Oppenheimer", year: 2023, type: "movie", genres: ["Historical", "Drama"], platforms: ["prime", "peacock"], palette: ["#fb923c", "#1c1917"], blurb: "The scientist behind the atomic bomb and its consequences.", new: false },
];

export const byId = (id) => DEMO.find((t) => t.id === id);
