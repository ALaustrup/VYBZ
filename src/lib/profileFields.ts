// ---------------------------------------------------------------------------
// Profile data points — the declarative catalog of "bits of info" a creator can
// share. Single source of truth for BOTH the profile editor UI and the matching
// engine, so every signal we collect becomes a personalization + compatibility
// input.
//
// VYBZ music catalog. Roles a creator OFFERS/SEEKS live in dedicated relational
// tables (creator_roles / creator_seeks) because complementarity is a join;
// genres/DAWs/plugins/influences are overlap signals stored in the owner-private
// profiles.profile jsonb (inheriting privacy + the GIN index).
//
// Ids here MUST match the seeded taxonomy in
// supabase/migrations/20260705_0002_creator_identity.sql.
// ---------------------------------------------------------------------------

import type { ProfileDetails } from "@/types";

export interface ChoiceField {
  /** Top-level key in ProfileDetails (also the privacy unit). */
  key: keyof ProfileDetails & string;
  label: string;
  hint?: string;
  /** Whether this field accepts many values (chips) or a single choice. */
  multi: boolean;
  /** Whether overlap on this field feeds the compatibility score. */
  matchable: boolean;
  options: string[];
}

/** A labeled taxonomy entry (DAWs, plugins) stored by id. */
export interface CatalogItem {
  id: string;
  label: string;
}

// ── Roles (§7.2) — the atoms of complementary matching ──────────────────────
export type RoleFamily =
  | "instrument"
  | "vocal"
  | "production"
  | "engineering"
  | "performance"
  | "business";

export interface RoleDef {
  id: string;
  label: string;
  family: RoleFamily;
}

export const ROLE_FAMILIES: { id: RoleFamily; label: string }[] = [
  { id: "instrument", label: "Instruments" },
  { id: "vocal", label: "Vocal" },
  { id: "production", label: "Production" },
  { id: "engineering", label: "Engineering" },
  { id: "performance", label: "Performance" },
  { id: "business", label: "Business" },
];

// ── Professions (music-first; other crafts are optional secondaries) ─────────
export interface Profession { id: string; label: string; blurb: string; icon: string }
/** Primary product lane — music production & collaboration. */
export const PRIMARY_PROFESSION = "music";
export const PROFESSIONS: Profession[] = [
  { id: "music", label: "Music", blurb: "Produce, write, mix, perform — find your collaborators", icon: "Music2" },
  { id: "visual_art", label: "Visual art", blurb: "Optional secondary — cover art, design, illustration", icon: "Palette" },
  { id: "film_video", label: "Video", blurb: "Optional secondary — edits, film, visuals for tracks", icon: "Clapperboard" },
  { id: "game_dev", label: "Games", blurb: "Optional secondary — audio + interactive projects", icon: "Gamepad2" },
];
export const PROFESSION_LABEL: Record<string, string> = Object.fromEntries(PROFESSIONS.map((p) => [p.id, p.label]));
/** Soft-scope Find/Spark/FeedHero: unset craft → music (product default). */
export function craftScope(profession?: string | null): string {
  return profession && PROFESSIONS.some((p) => p.id === profession) ? profession : PRIMARY_PROFESSION;
}

/** Discover + module-attrs catalogs (union of discipline_field_schemas seeds). */
export const SOFTWARE = [
  "Premiere Pro", "DaVinci Resolve", "Final Cut Pro", "After Effects", "Avid",
  "Procreate", "Photoshop", "Clip Studio", "Illustrator", "Krita",
  "Blender", "Maya", "ZBrush", "3ds Max", "Cinema 4D", "Substance",
  "InDesign", "Figma",
];
export const STYLES = [
  "Realism", "Anime / Manga", "Cartoon", "Vector", "Painterly", "Line art", "Pixel",
];
export const ENGINES = ["Unity", "Unreal", "Godot", "GameMaker", "Bevy", "Custom"];

// ── Role Class (Phase O1) — demand-side identities around music collabs ─────
// `creator` is the default; adjacent classes book/support/curate musicians.
export interface RoleClass { id: string; label: string; blurb: string; icon: string; adjacent: boolean }
export const ROLE_CLASSES: RoleClass[] = [
  { id: "creator",   label: "Creator",            blurb: "I make music — produce, write, perform, mix", icon: "Sparkles",   adjacent: false },
  { id: "supporter", label: "Supporter / Patron", blurb: "I follow & fund creators I love",   icon: "Heart",      adjacent: true  },
  { id: "booker",    label: "Booker / Manager",   blurb: "I book, manage or scout talent",     icon: "Briefcase",  adjacent: true  },
  { id: "curator",   label: "Curator",            blurb: "I discover & platform creative work", icon: "Compass",   adjacent: true  },
  { id: "brand",     label: "Brand / Marketing",  blurb: "I commission & partner with creators", icon: "Megaphone", adjacent: true },
  { id: "educator",  label: "Educator / Student", blurb: "I teach or I'm here to learn",        icon: "GraduationCap", adjacent: true },
];
export const ROLE_CLASS_LABEL: Record<string, string> = Object.fromEntries(ROLE_CLASSES.map((c) => [c.id, c.label]));
export const ADJACENT_CLASS_IDS = new Set(ROLE_CLASSES.filter((c) => c.adjacent).map((c) => c.id));
export const isAdjacentClass = (id?: string | null): boolean => !!id && ADJACENT_CLASS_IDS.has(id);

// What a creator-adjacent account is here for — drives their default feed.
export const ADJACENT_INTENTS = [
  "Support creators", "Book talent", "Hire a creative", "Commission work",
  "Curate & discover", "Learn", "Just exploring",
];

export const ROLES: RoleDef[] = [
  { id: "drums", label: "Drums", family: "instrument" },
  { id: "percussion", label: "Percussion", family: "instrument" },
  { id: "piano", label: "Pianist", family: "instrument" },
  { id: "keys_synth", label: "Keys / Synth", family: "instrument" },
  { id: "guitar_electric", label: "Electric Guitar", family: "instrument" },
  { id: "guitar_acoustic", label: "Acoustic Guitar", family: "instrument" },
  { id: "bass", label: "Bass", family: "instrument" },
  { id: "violin", label: "Violin", family: "instrument" },
  { id: "cello", label: "Cello", family: "instrument" },
  { id: "saxophone", label: "Saxophone", family: "instrument" },
  { id: "trumpet", label: "Trumpet", family: "instrument" },
  { id: "flute", label: "Flute", family: "instrument" },
  { id: "strings_section", label: "Strings Section", family: "instrument" },
  { id: "brass_section", label: "Brass Section", family: "instrument" },
  { id: "dj_turntables", label: "DJ / Turntables", family: "instrument" },
  { id: "other_instrument", label: "Other Instrument", family: "instrument" },
  { id: "vocals_lead", label: "Lead Vocalist", family: "vocal" },
  { id: "vocals_backing", label: "Backing Vocalist", family: "vocal" },
  { id: "rapper", label: "Rapper", family: "vocal" },
  { id: "topliner", label: "Topliner", family: "vocal" },
  { id: "songwriter_lyricist", label: "Songwriter / Lyricist", family: "vocal" },
  { id: "spoken_word", label: "Spoken Word", family: "vocal" },
  { id: "producer", label: "Producer", family: "production" },
  { id: "beatmaker", label: "Beatmaker", family: "production" },
  { id: "sound_designer", label: "Sound Designer", family: "production" },
  { id: "composer", label: "Composer", family: "production" },
  { id: "arranger", label: "Arranger", family: "production" },
  { id: "remixer", label: "Remixer", family: "production" },
  { id: "sampler", label: "Sampler", family: "production" },
  { id: "mix_engineer", label: "Mix Engineer", family: "engineering" },
  { id: "master_engineer", label: "Mastering Engineer", family: "engineering" },
  { id: "recording_engineer", label: "Recording Engineer", family: "engineering" },
  { id: "vocal_tuning_editor", label: "Vocal Tuning / Editing", family: "engineering" },
  { id: "band", label: "Band", family: "performance" },
  { id: "live_performer", label: "Live Performer", family: "performance" },
  { id: "session_musician", label: "Session Musician", family: "performance" },
  { id: "manager", label: "Manager", family: "business" },
  { id: "a_and_r", label: "A&R", family: "business" },
  { id: "sync_licensing", label: "Sync / Licensing", family: "business" },
  { id: "studio_owner", label: "Studio Owner", family: "business" },
];

export const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ROLES.map((r) => [r.id, r.label])
);

// ── Genres (§9) — labels are the overlap join key stored in profile jsonb ────
export const GENRES: string[] = [
  "Hip-Hop", "Trap", "R&B", "Neo-Soul", "Pop", "Afrobeats", "Amapiano", "House",
  "Techno", "Drum & Bass", "Dubstep", "EDM", "Lo-Fi", "Jazz", "Funk", "Soul",
  "Rock", "Metal", "Punk", "Indie", "Folk", "Country", "Reggae", "Dancehall",
  "Latin", "Reggaeton", "Classical", "Ambient", "Experimental", "Gospel",
  "Blues", "World",
];

// ── DAWs (§8.3) — stored by id ───────────────────────────────────────────────
export const DAWS: CatalogItem[] = [
  { id: "ableton", label: "Ableton Live" },
  { id: "fl_studio", label: "FL Studio" },
  { id: "logic", label: "Logic Pro" },
  { id: "pro_tools", label: "Pro Tools" },
  { id: "reaper", label: "Reaper" },
  { id: "studio_one", label: "Studio One" },
  { id: "bitwig", label: "Bitwig" },
  { id: "cubase", label: "Cubase" },
  { id: "reason", label: "Reason" },
  { id: "garageband", label: "GarageBand" },
];
export const DAW_LABEL: Record<string, string> = Object.fromEntries(
  DAWS.map((d) => [d.id, d.label])
);

// ── Plugins (§5.5) — curated launch seed; stored by id ───────────────────────
export interface PluginDef extends CatalogItem {
  vendor: string;
  category: string;
}
export const PLUGINS: PluginDef[] = [
  { id: "serum", label: "Serum", vendor: "Xfer Records", category: "synth" },
  { id: "serum2", label: "Serum 2", vendor: "Xfer Records", category: "synth" },
  { id: "massive", label: "Massive", vendor: "Native Instruments", category: "synth" },
  { id: "massive_x", label: "Massive X", vendor: "Native Instruments", category: "synth" },
  { id: "omnisphere", label: "Omnisphere", vendor: "Spectrasonics", category: "synth" },
  { id: "keyscape", label: "Keyscape", vendor: "Spectrasonics", category: "sampler" },
  { id: "trilian", label: "Trilian", vendor: "Spectrasonics", category: "sampler" },
  { id: "sylenth1", label: "Sylenth1", vendor: "LennarDigital", category: "synth" },
  { id: "spire", label: "Spire", vendor: "Reveal Sound", category: "synth" },
  { id: "nexus", label: "Nexus", vendor: "reFX", category: "synth" },
  { id: "vital", label: "Vital", vendor: "Vital Audio", category: "synth" },
  { id: "phase_plant", label: "Phase Plant", vendor: "Kilohearts", category: "synth" },
  { id: "pigments", label: "Pigments", vendor: "Arturia", category: "synth" },
  { id: "diva", label: "Diva", vendor: "u-he", category: "synth" },
  { id: "repro", label: "Repro", vendor: "u-he", category: "synth" },
  { id: "kontakt", label: "Kontakt", vendor: "Native Instruments", category: "sampler" },
  { id: "battery", label: "Battery", vendor: "Native Instruments", category: "drum_machine" },
  { id: "maschine", label: "Maschine", vendor: "Native Instruments", category: "drum_machine" },
  { id: "nnxt", label: "NN-XT", vendor: "Reason Studios", category: "sampler" },
  { id: "fabfilter_pro_q3", label: "FabFilter Pro-Q 3", vendor: "FabFilter", category: "eq" },
  { id: "fabfilter_pro_c2", label: "FabFilter Pro-C 2", vendor: "FabFilter", category: "compressor" },
  { id: "fabfilter_pro_l2", label: "FabFilter Pro-L 2", vendor: "FabFilter", category: "mastering" },
  { id: "fabfilter_pro_r", label: "FabFilter Pro-R", vendor: "FabFilter", category: "reverb" },
  { id: "fabfilter_saturn2", label: "FabFilter Saturn 2", vendor: "FabFilter", category: "saturation" },
  { id: "ozone", label: "Ozone", vendor: "iZotope", category: "mastering" },
  { id: "neutron", label: "Neutron", vendor: "iZotope", category: "utility" },
  { id: "rx", label: "RX", vendor: "iZotope", category: "utility" },
  { id: "nectar", label: "Nectar", vendor: "iZotope", category: "fx" },
  { id: "waves_ssl", label: "Waves SSL E-Channel", vendor: "Waves", category: "eq" },
  { id: "waves_cla76", label: "Waves CLA-76", vendor: "Waves", category: "compressor" },
  { id: "waves_h_delay", label: "Waves H-Delay", vendor: "Waves", category: "delay" },
  { id: "soundtoys_decapitator", label: "Decapitator", vendor: "Soundtoys", category: "saturation" },
  { id: "soundtoys_echoboy", label: "EchoBoy", vendor: "Soundtoys", category: "delay" },
  { id: "soundtoys_littleplate", label: "Little Plate", vendor: "Soundtoys", category: "reverb" },
  { id: "valhalla_vintageverb", label: "Valhalla VintageVerb", vendor: "Valhalla DSP", category: "reverb" },
  { id: "valhalla_supermassive", label: "Valhalla Supermassive", vendor: "Valhalla DSP", category: "reverb" },
  { id: "valhalla_delay", label: "ValhallaDelay", vendor: "Valhalla DSP", category: "delay" },
  { id: "gullfoss", label: "Gullfoss", vendor: "Soundtheory", category: "eq" },
  { id: "sausage_fattener", label: "Sausage Fattener", vendor: "Dada Life", category: "saturation" },
  { id: "ott", label: "OTT", vendor: "Xfer Records", category: "compressor" },
  { id: "effectrix", label: "Effectrix", vendor: "Sugar Bytes", category: "fx" },
  { id: "portal", label: "Portal", vendor: "Output", category: "fx" },
  { id: "arcade", label: "Arcade", vendor: "Output", category: "sampler" },
  { id: "addictive_drums2", label: "Addictive Drums 2", vendor: "XLN Audio", category: "drum_machine" },
  { id: "superior_drummer3", label: "Superior Drummer 3", vendor: "Toontrack", category: "drum_machine" },
  { id: "ez_keys", label: "EZkeys", vendor: "Toontrack", category: "sampler" },
  { id: "electra2", label: "Electra2", vendor: "Tone2", category: "synth" },
  { id: "gladiator", label: "Gladiator 3", vendor: "Tone2", category: "synth" },
  { id: "sforzando", label: "sforzando", vendor: "Plogue", category: "sampler" },
  { id: "autotune_pro", label: "Auto-Tune Pro", vendor: "Antares", category: "fx" },
  { id: "melodyne", label: "Melodyne", vendor: "Celemony", category: "utility" },
  { id: "komplete", label: "Komplete", vendor: "Native Instruments", category: "sampler" },
  { id: "spitfire_labs", label: "Spitfire LABS", vendor: "Spitfire Audio", category: "orchestral" },
  { id: "bbc_so", label: "BBC Symphony Orchestra", vendor: "Spitfire Audio", category: "orchestral" },
];
export const PLUGIN_LABEL: Record<string, string> = Object.fromEntries(
  PLUGINS.map((p) => [p.id, p.label])
);

// ── Musical keys ─────────────────────────────────────────────────────────────
export const MUSICAL_KEYS: string[] = [
  "C major", "C minor", "C# / Db major", "C# / Db minor", "D major", "D minor",
  "D# / Eb major", "D# / Eb minor", "E major", "E minor", "F major", "F minor",
  "F# / Gb major", "F# / Gb minor", "G major", "G minor", "G# / Ab major",
  "G# / Ab minor", "A major", "A minor", "A# / Bb major", "A# / Bb minor",
  "B major", "B minor",
];

/**
 * INTERESTS — lightweight "scene / vibe" tags. Genres/DAWs/plugins carry the
 * heavy matchmaking signal; these add flavor.
 */
export const INTERESTS: string[] = [
  "Sampling", "Vinyl digging", "Field recording", "Modular", "Analog gear",
  "Live looping", "Songwriting", "Topline", "Freestyle", "Sound design",
  "Film scoring", "Game audio", "Podcasting", "Mixing", "Mastering",
  "Music theory", "Improv", "Jam sessions", "Touring", "Studio sessions",
  "Beat battles", "Cyphers", "Open mics", "DJing", "Crate digging",
];

/** Single-choice fields. Each is matchable so overlap nudges affinity. */
export const CHOICE_FIELDS: ChoiceField[] = [
  {
    key: "lookingFor",
    label: "Looking for",
    hint: "What you're here to find — drives who you're shown.",
    multi: true,
    matchable: true,
    options: [
      "Collaborator", "Band member", "Session work", "Co-writer", "Feedback",
      "Sample trade", "Ghost production", "Remix", "Sync", "Mixing", "Mastering",
    ],
  },
  {
    key: "languages",
    label: "Languages",
    hint: "Helps surface people you can actually work with.",
    multi: true,
    matchable: true,
    options: ["English", "Español", "Français", "Deutsch", "Português", "Italiano", "العربية", "中文", "日本語", "한국어", "हिन्दी", "Русский", "Türkçe", "Nederlands"],
  },
];

/** Free-text, music-flavored prompts — the human spark. */
export const PROMPTS: string[] = [
  "The record that changed me…",
  "My signature sound is…",
  "I'm looking to level up my…",
  "Dream collaborator…",
  "My go-to when I'm stuck…",
  "The best session I ever had…",
  "A sound I can't stop chasing…",
  "I'll always say yes to…",
];

/** Single-select workflow/personality traits (matchable, lightweight). */
export interface TraitField {
  key: string;
  label: string;
  options: string[];
}

export const TRAITS: TraitField[] = [
  { key: "workflow", label: "Workflow", options: ["Fast", "Balanced", "Meticulous"] },
  { key: "session", label: "Session style", options: ["In-person", "Remote", "Both"] },
  { key: "room_role", label: "In the room I'm", options: ["Leader", "Supporter", "Flexible"] },
  { key: "experience", label: "Experience", options: ["Emerging", "Gigging", "Professional"] },
];

export const MAX_INTERESTS = 10;
export const MAX_GENRES = 8;
export const MAX_PLUGINS = 20;
export const MAX_PROMPTS = 3;
export const MAX_BIO = 280;
export const MAX_INFLUENCES = 200;

/** Default empty details object. */
export const EMPTY_DETAILS: ProfileDetails = {};

/** Whether a top-level section is currently marked private. */
export function isHidden(details: ProfileDetails, key: string): boolean {
  return (details.hidden ?? []).includes(key);
}

/** Toggle a section's private flag, returning a new details object. */
export function toggleHidden(details: ProfileDetails, key: string): ProfileDetails {
  const hidden = new Set(details.hidden ?? []);
  if (hidden.has(key)) hidden.delete(key);
  else hidden.add(key);
  return { ...details, hidden: [...hidden] };
}

/**
 * Completeness meter. Roles offered/sought live outside `details` (relational),
 * so pass their counts to weight them — matchmaking-first fields count most.
 */
export function completeness(
  details: ProfileDetails,
  roles?: { offers: number; seeks: number }
): number {
  let filled = 0;
  const total = 9;
  if ((roles?.offers ?? 0) > 0) filled++;
  if ((roles?.seeks ?? 0) > 0) filled++;
  if (details.genres?.length) filled++;
  if (details.daws?.length) filled++;
  if (details.plugins?.length) filled++;
  if (details.influences?.trim()) filled++;
  if (details.bio?.trim()) filled++;
  if (details.lookingFor?.length) filled++;
  if (details.prompts?.some((p) => p.a.trim())) filled++;
  return Math.round((filled / total) * 100);
}

/** Local overlap percentage between two string arrays (for previews). */
export function interestMatch(a: string[] = [], b: string[] = []): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b.map((x) => x.toLowerCase()));
  const shared = a.filter((x) => setB.has(x.toLowerCase())).length;
  const union = new Set([...a, ...b].map((x) => x.toLowerCase())).size;
  return union ? Math.round((shared / union) * 100) : 0;
}
