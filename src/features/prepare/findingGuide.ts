/** Curated remediation copy — generic guidance; finding.detail holds track-specific measured facts. */
export type FindingGuide = {
  why: string;
  fix: string;
  target?: string;
};

const GUIDES: Record<string, FindingGuide> = {
  METADATA_TITLE_MISSING: {
    why: "Stores need a release title in metadata — blank titles get rejected at ingestion.",
    fix: "Set the title that should appear on streaming platforms and download cards.",
  },
  METADATA_ARTIST_MISSING: {
    why: "Primary artist credit is required for royalty routing and store display.",
    fix: "Add the performing artist name exactly as it should appear to listeners.",
  },
  AUDIO_MISSING: {
    why: "Without a master file there is nothing to measure or package.",
    fix: "Import your finished master — WAV or FLAC preferred for the most accurate scan.",
  },
  ARTWORK_MISSING: {
    why: "Every major distributor requires cover art with the audio package.",
    fix: "Upload square cover art — 3000×3000 PNG or JPEG is the common target.",
    target: "3000×3000 px · square · RGB",
  },
  AUDIO_FORMAT_UNKNOWN: {
    why: "Some stores only accept specific audio containers and codecs.",
    fix: "Export a WAV, FLAC, or AIFF master from your DAW, then re-import here.",
  },
  AUDIO_EMPTY: {
    why: "The file contains no audio data — it cannot be played or delivered.",
    fix: "Re-export from your session and confirm the bounce completed before uploading.",
  },
  AUDIO_SAMPLE_RATE_LOW: {
    why: "Sample rates below 44.1 kHz can be rejected or upsampled unpredictably.",
    fix: "Bounce at 44.1 kHz or 48 kHz before mastering and upload.",
    target: "≥ 44.1 kHz",
  },
  AUDIO_DURATION_SHORT: {
    why: "Sub-second files are treated as corrupt or incomplete uploads.",
    fix: "Confirm you selected the full master — not a stub or failed export.",
  },
  FILENAME_INVALID: {
    why: "Special characters in filenames break some automated delivery pipelines.",
    fix: "Rename to Artist - Title.wav using letters, numbers, spaces, and hyphens only.",
  },
  AUDIO_LOSSY_MASTER: {
    why: "Lossy masters (MP3, AAC) hide clipping and limit remaster headroom.",
    fix: "Upload the pre-compression WAV/FLAC from your mastering chain instead.",
  },
  AUDIO_PEAK_CLIP: {
    why: "Samples at full scale clip — lossy encoding pushes them further and audibly distorts.",
    fix: "Lower your limiter ceiling by 1–3 dB and re-export, or fix peaks in the mix before mastering.",
    target: "Sample peak below −1 dBFS",
  },
  AUDIO_PEAK_HOT: {
    why: "Peaks near full scale leave no headroom for lossy encoding (Spotify, Apple, and others).",
    fix: "Set true-peak limiting to −1 dBTP or lower in your mastering chain and rebounce.",
    target: "True peak ≤ −1 dBTP",
  },
  AUDIO_LOUDNESS_NOT_MEASURED: {
    why: "Without decodable audio we cannot report loudness or peak, and we will not guess them.",
    fix: "Import a WAV, FLAC or MP3 master. If this file is one of those, re-export it — the data may be truncated.",
  },
  AUDIO_LOUDNESS_HOT: {
    why: "Louder than platform targets triggers automatic turn-down — your mix loses punch.",
    fix: "Aim near −14 LUFS integrated for streaming, or match your reference platform spec.",
    target: "≈ −14 LUFS integrated (streaming)",
  },
  AUDIO_LOUDNESS_QUIET: {
    why: "Very quiet masters get buried in playlists unless listeners crank volume.",
    fix: "Apply gentle bus compression or limiting until integrated loudness sits in a competitive range.",
    target: "Typically −14 to −9 LUFS integrated for singles",
  },
  AUDIO_TRUE_PEAK_HOT: {
    why: "True peaks near full scale overshoot after AAC/MP3 conversion and can distort.",
    fix: "Lower true-peak limiting to −1 dBTP or below and re-export.",
    target: "True peak ≤ −1 dBTP",
  },
  AUDIO_DYNAMICS_CRUSHED: {
    why: "Very low crest factor usually means heavy limiting — punch and depth disappear.",
    fix: "Back off the limiter / maximizer and leave more peak-to-RMS headroom.",
    target: "Crest factor typically ≥ 6 dB on music masters (VYBZ heuristic)",
  },
  AUDIO_LRA_LOW: {
    why: "Tiny loudness range means little contrast between quiet and loud sections.",
    fix: "Reduce constant brickwall limiting so short-term loudness can breathe.",
  },
  AUDIO_STEREO_NARROW: {
    why: "Nearly identical L/R channels collapse to mono — width and immersion are lost.",
    fix: "Check mid/side balance, stereo wideners, and double-tracked parts.",
  },
  AUDIO_STEREO_OUT_OF_PHASE: {
    why: "Negative L/R correlation often means polarity issues that cancel in mono.",
    fix: "Flip polarity on one side or inspect mid/side processing and mic setups.",
  },
  AUDIO_SPECTRAL_BASS_HEAVY: {
    why: "Excess low-band energy can muddy small speakers and trip store loudness turn-down.",
    fix: "High-pass non-bass elements and check the mix on small monitors.",
  },
  AUDIO_SPECTRAL_BRIGHT: {
    why: "Excess high-band energy can sound harsh on earbuds and after lossy codecs.",
    fix: "Ease presence/air bands or de-ess before the final limiter.",
  },
  AUDIO_SPECTRAL_THIN: {
    why: "Weak low+mid energy often means the track lacks body on phones and cars.",
    fix: "Restore fundamental energy or ease aggressive high-pass filters.",
  },
  AUDIO_CLIPPING_SAMPLES: {
    why: "Samples pinned at full scale become distortion after lossy encoding.",
    fix: "Lower the limiter ceiling and re-bounce so peaks never hit digital full scale.",
    target: "Zero clipped samples; sample peak below −1 dBFS",
  },
  AUDIO_SILENCE_LEAD_IN: {
    why: "Long lead-in silence feels broken on playlists and wastes listener attention.",
    fix: "Trim to a short breath or count-in before the first musical event.",
    target: "Typically under 2 s of dead air at the start",
  },
  AUDIO_SILENCE_LEAD_OUT: {
    why: "Long trailing silence pads streams and can confuse gapless playback.",
    fix: "Trim the tail or leave a deliberate short reverb decay only.",
    target: "Typically under 3 s of dead air at the end",
  },
  AUDIO_DC_OFFSET: {
    why: "DC bias wastes headroom and can click on edits or after high-pass-free chains.",
    fix: "Insert a DC blocker or gentle high-pass on the master bus and re-export.",
  },
  AUDIO_MONO_COMPAT_LOSS: {
    why: "Large level drop in mono means phase cancellation — phones and clubs often sum to mono.",
    fix: "Check polarity flips and extreme mid/side widening against a mono monitor.",
  },
  AUDIO_CHANNEL_IMBALANCE: {
    why: "Uneven L/R energy pulls the image off-centre and can fail store QC.",
    fix: "Balance bus gains / panning and check the mix in mono and on headphones.",
    target: "|L−R| RMS typically under 3 dB (VYBZ heuristic)",
  },
  AUDIO_MOMENTARY_SPIKE: {
    why: "Short bursts much louder than the integrated level can pump limiters and sound jumpy.",
    fix: "Ride or clip the peak events, or ease limiter release so momentary stays closer to integrated.",
  },
  AUDIO_PLR_LOW: {
    why: "Very low peak-to-loudness ratio usually means the limiter erased punch and micro-dynamics.",
    fix: "Back off the limiter / clipper ceiling so true peak sits farther above integrated loudness.",
    target: "PLR typically ≥ 6 dB (VYBZ heuristic)",
  },
  AUDIO_STEREO_SIDE_HEAVY: {
    why: "Excess side energy widens the image but often collapses or phases on mono systems.",
    fix: "Reduce mid/side widening, check polarity flips, and audition in mono.",
    target: "Side−mid RMS typically under −6 dB (VYBZ heuristic)",
  },
  ARTWORK_TOO_SMALL: {
    why: "Below-minimum artwork is rejected outright by most stores.",
    fix: "Export cover at least 1400×1400 — 3000×3000 recommended for sharp display everywhere.",
    target: "≥ 1400×1400 px (3000×3000 recommended)",
  },
  ARTWORK_BELOW_RECOMMENDED: {
    why: "Art below 3000 px may look soft on high-DPI phones and TV apps.",
    fix: "Re-export from your design source at 3000×3000 without upscaling a smaller image.",
    target: "3000×3000 px square",
  },
  ARTWORK_NOT_SQUARE: {
    why: "Cover art displays as a square tile — non-square images get cropped unpredictably.",
    fix: "Crop or redesign to 1:1 aspect ratio before upload.",
    target: "1:1 aspect ratio",
  },
  ARTWORK_DIMENSIONS_UNKNOWN: {
    why: "We could not read pixel dimensions — checks may be incomplete.",
    fix: "Re-save as PNG or JPEG from your design tool and upload again.",
  },
};

export function getFindingGuide(code: string): FindingGuide | null {
  return GUIDES[code] ?? null;
}
