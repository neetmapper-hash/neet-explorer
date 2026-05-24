#!/usr/bin/env python3
"""
relink_pipeline.py  v3
======================
Re-runs ONLY the linking stage using split class files.

Loads only the classes needed:
  Class 9  → reference: class8   | relink: class9
  Class 10 → reference: class8+9 | relink: class10
  Class 11 → reference: class8-10| relink: class11
  Class 12 → reference: class8-11| relink: class12

Pre-filtering pipeline (all FREE — no API calls):
  1. Subject filter       — only same-subject concepts
  2. Domain match         — same/related domain concepts only
  3. Difficulty filter    — no harder-than-current concepts
  4. Keyword match        — concept_name + key_terms overlap scoring
  5. Previous chapter     — always inject full previous chapter
  6. Main topic boost     — main topics ranked higher
  7. Cap at 60 candidates — focused list to Claude

Usage:
    python3 relink_pipeline.py --subject physics --class 9
    python3 relink_pipeline.py --subject biology --class 11
    python3 relink_pipeline.py --subject chemistry --class 11
    python3 relink_pipeline.py --subject physics --class 11 --chapter 4
    python3 relink_pipeline.py --subject physics --class 9 --dry-run

Setup:
    export ANTHROPIC_API_KEY=sk-ant-...
"""

import os, sys, json, time, logging, datetime, argparse, re
import anthropic

# ── Config ─────────────────────────────────────────────────────────────────────

BASE_DIR      = os.path.expanduser("~/neet_pipeline")
CONCEPTS_DIR  = os.path.join(BASE_DIR, "concepts")
LOG_DIR       = os.path.join(BASE_DIR, "logs")
RELINK_CACHE  = os.path.join(BASE_DIR, "relink_cache")

MODEL           = "claude-haiku-4-5-20251001"
MAX_RETRIES     = 2
RATE_LIMIT_WAIT = 35
CHAPTER_DELAY   = 3
MAX_BUILDS_UPON = 3
MAX_REF_SIZE    = 60   # max candidates per concept sent to Claude

# File naming convention: {subject}_concepts_class{N}.json
# Biology uses biology_, Chemistry uses chem_, Physics uses physics_
SUBJECT_PREFIX = {
    "physics":   "physics",
    "chemistry": "chem",
    "biology":   "biology",
}

# Related domain groups — concepts from related domains can be prerequisites
DOMAIN_GROUPS = {
    "physics": {
        "mechanics":           {"mechanics", "thermodynamics", "waves"},
        "thermodynamics":      {"thermodynamics", "mechanics", "waves"},
        "waves":               {"waves", "mechanics", "optics"},
        "optics":              {"optics", "waves", "electrostatics"},
        "electrostatics":      {"electrostatics", "current_electricity", "magnetism"},
        "current_electricity": {"current_electricity", "electrostatics", "magnetism"},
        "magnetism":           {"magnetism", "current_electricity", "electrostatics"},
        "modern_physics":      {"modern_physics", "electrostatics", "magnetism", "optics"},
        "astronomy":           {"astronomy", "mechanics"},
        "both":                None,
    },
    "chemistry": {
        "physical":  {"physical", "inorganic"},
        "inorganic": {"inorganic", "physical"},
        "organic":   {"organic", "physical"},
        "both":      None,
    },
    "biology": {
        "botany":           {"botany", "both"},
        "zoology":          {"zoology", "both"},
        "both":             None,
        "cell_biology":     {"cell_biology", "both", "botany", "zoology"},
        "genetics":         {"genetics", "both", "cell_biology"},
        "ecology":          {"ecology", "both"},
        "physiology":       {"physiology", "zoology", "both"},
        "plant_physiology": {"plant_physiology", "botany", "both"},
        "evolution":        {"evolution", "both"},
        "biotechnology":    {"biotechnology", "both", "genetics"},
        "microbiology":     {"microbiology", "both"},
    },
}

DIFFICULTY_ORDER = {"basic": 0, "intermediate": 1, "advanced": 2}

STOP_WORDS = {
    'and','or','of','the','in','a','an','to','for','is','are','was','its',
    'it','by','on','at','as','with','from','this','that','be','been','has',
    'have','not','no','into','through','during','between','each','their',
    'they','which','when','how','all','any','both','under','over','such',
    'than','then','these','can','may','using','used','due','also','other',
    'more','only','upon','its','their','there','where','while',
}

# ── Logging ────────────────────────────────────────────────────────────────────

def setup_logging(subject, class_num):
    os.makedirs(LOG_DIR, exist_ok=True)
    today    = datetime.date.today().isoformat()
    log_file = os.path.join(LOG_DIR, f"relink_{subject}_c{class_num}_{today}.log")
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-8s  %(message)s",
        datefmt="%H:%M:%S",
        handlers=[
            logging.FileHandler(log_file, encoding="utf-8"),
            logging.StreamHandler(sys.stdout)
        ]
    )
    return logging.getLogger(__name__)

# ── File helpers ───────────────────────────────────────────────────────────────

def class_file(subject, class_num):
    prefix = SUBJECT_PREFIX[subject]
    return os.path.join(CONCEPTS_DIR, f"{prefix}_concepts_class{class_num}.json")

def load_class(subject, class_num):
    path = class_file(subject, class_num)
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_class(subject, class_num, concepts):
    path = class_file(subject, class_num)
    tmp  = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(concepts, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)

# ── Claude API ─────────────────────────────────────────────────────────────────

def call_claude(client, messages, max_tokens=24000, retries=MAX_RETRIES, log=None):
    for attempt in range(retries + 1):
        try:
            full_text = ""
            with client.messages.stream(
                model=MODEL,
                max_tokens=max_tokens,
                messages=messages,
                extra_headers={"anthropic-beta": "prompt-caching-2024-07-31"}
            ) as stream:
                for text in stream.text_stream:
                    full_text += text
            return full_text
        except anthropic.RateLimitError:
            if attempt < retries:
                wait = RATE_LIMIT_WAIT * (attempt + 1)
                if log: log.warning(f"Rate limit — waiting {wait}s")
                time.sleep(wait)
            else:
                raise
        except anthropic.APIStatusError as e:
            err_type = ""
            try:
                err_type = e.body.get("error", {}).get("type", "") if isinstance(e.body, dict) else str(e)
            except Exception:
                err_type = str(e)
            if err_type == "overloaded_error" and attempt < retries:
                wait = RATE_LIMIT_WAIT * (attempt + 1)
                if log: log.warning(f"Overloaded — waiting {wait}s")
                time.sleep(wait)
            else:
                raise

def sanitize_json_escapes(text):
    valid_escapes = set('"\\\/bfnrtu')
    result = []; i = 0
    while i < len(text):
        if text[i] == '\\' and i + 1 < len(text):
            if text[i+1] in valid_escapes:
                result.append(text[i]); result.append(text[i+1]); i += 2
            else:
                result.append('\\\\'); i += 1
        else:
            result.append(text[i]); i += 1
    return ''.join(result)

def parse_json_response(raw):
    cleaned = raw.strip()
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned)
    if m:
        cleaned = m.group(1).strip()
    else:
        m = re.match(r"```(?:json)?\s*([\s\S]*)", cleaned)
        if m:
            cleaned = m.group(1).strip()
    cleaned = sanitize_json_escapes(cleaned)

    obj_start = cleaned.find("{"); obj_end = cleaned.rfind("}")
    if obj_start != -1 and obj_end != -1:
        try:
            obj = json.loads(cleaned[obj_start:obj_end+1])
            if isinstance(obj, dict) and "concepts" in obj:
                return [c for c in obj["concepts"] if isinstance(c, dict)], False
        except json.JSONDecodeError:
            pass

    first = cleaned.find("["); last = cleaned.rfind("]")
    if first != -1 and last != -1:
        cleaned = cleaned[first:last+1]
    try:
        result = json.loads(cleaned)
        if isinstance(result, list):
            return [c for c in result if isinstance(c, dict)], False
    except json.JSONDecodeError:
        pass

    last_obj = cleaned.rfind("},")
    if last_obj != -1:
        try:
            result = json.loads(cleaned[:last_obj+1] + "]")
            return [c for c in result if isinstance(c, dict)], True
        except json.JSONDecodeError:
            pass

    raise ValueError("Could not parse JSON from Claude response")

# ── Keyword extraction ─────────────────────────────────────────────────────────

def extract_keywords(concept):
    words = set()
    for src in [
        concept.get("concept_name", ""),
        " ".join(concept.get("key_terms", [])),
        concept.get("summary", "")[:150],
    ]:
        for w in re.split(r"[\s\-–/,.:;()'\"]", str(src)):
            w = w.strip().lower()
            if w and len(w) > 2 and w not in STOP_WORDS:
                words.add(w)
    return words

def keyword_score(candidate_kws, target_kws):
    """Count overlapping keywords between candidate and target concept."""
    if not target_kws:
        return 0
    return len(candidate_kws & target_kws)

# ── Pre-filtering ──────────────────────────────────────────────────────────────

def build_shortlist(reference_concepts, chapter_concepts, subject,
                    current_class, current_chapter, log=None):
    """
    For the entire chapter, build ONE shortlist of reference candidates.
    Uses all 5 filters + previous chapter injection + main topic boost.
    Returns: (cross_candidates, same_ch_candidates)
    """
    # Collect all keywords from all concepts in this chapter
    chapter_kws = set()
    chapter_domains = set()
    chapter_difficulties = set()
    for c in chapter_concepts:
        chapter_kws |= extract_keywords(c)
        if c.get("domain"):
            chapter_domains.add(c["domain"])
        if c.get("difficulty_level"):
            chapter_difficulties.add(c["difficulty_level"])

    # Max difficulty in this chapter
    max_diff = max(
        (DIFFICULTY_ORDER.get(d, 1) for d in chapter_difficulties),
        default=1
    )

    # Related domains for this chapter
    domain_map = DOMAIN_GROUPS.get(subject, {})
    allowed_domains = set()
    for d in chapter_domains:
        related = domain_map.get(d)
        if related is None:
            allowed_domains = None; break  # None = all domains
        allowed_domains |= related
    if allowed_domains is not None:
        allowed_domains.add("both")  # always include 'both' domain

    # Score each reference concept
    scored = []
    prev_chapter_ids = set()

    for c in reference_concepts:
        cid   = c.get("id", "")
        cls   = c.get("class", 0)
        chnum = c.get("chapter_number", 0)

        # 1. Subject filter — skip wrong subject
        if c.get("subject") and c.get("subject") != subject:
            continue

        # 2. Difficulty filter — skip harder concepts
        cand_diff = DIFFICULTY_ORDER.get(c.get("difficulty_level", "basic"), 0)
        if cand_diff > max_diff:
            continue

        # 3. Domain filter — skip unrelated domains
        if allowed_domains is not None:
            cand_domain = c.get("domain", "both")
            if cand_domain not in allowed_domains:
                continue

        # 4. Keyword score
        cand_kws = extract_keywords(c)
        kw_score = keyword_score(cand_kws, chapter_kws)

        # 5. Previous chapter boost — always include full previous chapter
        is_prev_chapter = (
            (cls == current_class and chnum == current_chapter - 1) or
            (cls == current_class - 1)  # entire previous class gets a boost
        )
        if is_prev_chapter:
            prev_chapter_ids.add(cid)
            kw_score += 5  # boost previous chapter concepts

        # 6. Main topic boost
        if c.get("is_main_topic"):
            kw_score += 2

        # 7. Cross-class boost
        if cls < current_class:
            kw_score += 3

        scored.append((kw_score, c))

    # Sort by score descending
    scored.sort(key=lambda x: -x[0])

    # Always include previous chapter concepts regardless of score
    forced = [c for score, c in scored if c["id"] in prev_chapter_ids]
    rest   = [c for score, c in scored if c["id"] not in prev_chapter_ids and score > 0]

    # Cap total
    shortlist = forced + rest
    shortlist = shortlist[:MAX_REF_SIZE]

    if log:
        cross = sum(1 for c in shortlist if c.get("class", current_class) < current_class
                    or c.get("chapter_number") != current_chapter)
        log.info(f"     Shortlist: {len(shortlist)} candidates "
                 f"({len(forced)} prev-chapter forced, {cross} cross-chapter)")

    return shortlist

# ── Reference list formatter ───────────────────────────────────────────────────

def format_reference_list(shortlist, current_class, current_chapter):
    """Format shortlist into two labelled sections for Claude."""
    cross_lines = []
    same_lines  = []

    for c in shortlist:
        level  = "main" if c.get("is_main_topic") else "sub"
        parent = c.get("parent_concept_name") or "—"
        line   = (
            f"{c['id']} | {c['concept_name']} | Class {c['class']} | "
            f"Ch {c['chapter_number']} | {c['chapter_name']} | {level} | {parent}"
        )
        if c["class"] == current_class and c["chapter_number"] == current_chapter:
            same_lines.append("[SAME-CHAPTER] " + line)
        else:
            cross_lines.append(line)

    sections = []
    if cross_lines:
        sections.append("=== EARLIER CHAPTERS (prefer these) ===")
        sections.extend(cross_lines)
    if same_lines:
        sections.append("")
        sections.append("=== SAME CHAPTER (last resort only — max 1 per concept) ===")
        sections.extend(same_lines)

    return "\n".join(sections) if sections else "No prior concepts available."

# ── Linking prompt ─────────────────────────────────────────────────────────────

def linking_prompt(subject, class_num, chapter_name, chapter_concepts, reference_text):
    slim_concepts = [{
        "id":                  c.get("id"),
        "concept_name":        c.get("concept_name"),
        "summary":             c.get("summary", "")[:200],
        "domain":              c.get("domain", ""),
        "difficulty_level":    c.get("difficulty_level", ""),
        "is_main_topic":       c.get("is_main_topic"),
        "parent_concept_name": c.get("parent_concept_name", ""),
        "key_terms":           c.get("key_terms", [])[:6],
        "builds_upon":         [],
    } for c in chapter_concepts]

    return f"""You are an NCERT {subject.capitalize()} curriculum expert building a NEET concept prerequisite graph.

CHAPTER: Class {class_num} — "{chapter_name}"

═══════════════════════════════════════
TASK
═══════════════════════════════════════

Fill in builds_upon for each concept. The reference list has been pre-filtered
to show ONLY relevant candidates. Every concept in the list is a plausible prerequisite.

═══════════════════════════════════════
RULES
═══════════════════════════════════════

RULE 1 — CROSS-CHAPTER FIRST (MANDATORY)
  For every concept, find a prerequisite from an EARLIER chapter first.
  Earlier class = best. Earlier chapter in same class = also good.
  Ask: "What must a student know BEFORE this concept makes sense?"

RULE 2 — SAME-CHAPTER IS LAST RESORT
  [SAME-CHAPTER] links = only if NO earlier chapter concept qualifies.
  Max 1 same-chapter link per concept. Most concepts = zero same-chapter links.

RULE 3 — NEVER LINK SIBLINGS (CRITICAL)
  Each concept has a parent_concept_name field.
  NEVER link concept A to concept B if they share the same parent_concept_name.
  These are SIBLINGS — taught together, neither is prerequisite of the other.
  Example: "Concave Mirror" and "Convex Mirror" both have parent "Spherical Mirrors"
           → NEVER link Concave Mirror → Convex Mirror or vice versa.
  ONLY allowed same-chapter link: subtopic → its OWN parent main topic.
  Example: "Mirror Formula" (child) → "Spherical Mirrors" (parent) = OK
           "Mirror Formula" (child) → "Laws of Reflection" (sibling) = BANNED

RULE 4 — DIRECT PREREQUISITE ONLY
  "Would A be impossible to understand without B?" → YES = link. MAYBE = skip.

RULE 5 — SPECIFIC OVER GENERAL
  Link to subtopics over main topics when possible.

RULE 6 — MAX 3 LINKS per concept. 1-2 is ideal.

RULE 7 — EMPTY IS OK
  Brand-new concept with no earlier prerequisite → builds_upon: []

RULE 8 — STEP BY STEP for each concept:
  1. Read concept_name, parent_concept_name, key_terms, summary
  2. Note your parent — you cannot link to any concept with the same parent (siblings)
  3. Scan EARLIER CHAPTERS section → find best match
  4. Only if nothing fits → check SAME CHAPTER (parent link only)
  5. Write builds_upon

═══════════════════════════════════════
CONCEPTS TO LINK
═══════════════════════════════════════

{json.dumps(slim_concepts, ensure_ascii=False, indent=2)}

═══════════════════════════════════════
REFERENCE LIST (pre-filtered, relevant candidates only)
═══════════════════════════════════════

{reference_text}

═══════════════════════════════════════
OUTPUT
═══════════════════════════════════════

Return SAME JSON array with builds_upon filled in.
builds_upon item format:
  {{"concept_id":"id","concept_name":"name","class":N,"chapter_name":"name","chapter_number":N,"is_main_topic":false}}

Return ONLY valid JSON array. First char [, last char ].

VERIFY:
✓ ≥70% of links point to EARLIER CHAPTERS
✓ Same-chapter links ≤15% of total, and ONLY parent-child (not siblings)
✓ Zero sibling links — concepts with same parent_concept_name never linked to each other
✓ Every concept_id exists in reference list above
✓ No forward links
✓ Max 3 per concept
✓ More sibling links than cross-chapter links = FAILED, redo"""

# ── Validate links ─────────────────────────────────────────────────────────────

def validate_links(concepts, valid_ids, current_class, current_chapter, log=None):
    stripped   = 0
    siblings   = 0
    cross_chap = 0
    same_ch    = 0

    # Build parent map for sibling detection
    id_to_parent = {c.get("id"): c.get("parent_concept_name", "") for c in concepts}

    for c in concepts:
        valid = []
        c_parent = c.get("parent_concept_name", "")
        for link in c.get("builds_upon", []):
            if not isinstance(link, dict):
                stripped += 1; continue
            lid  = link.get("concept_id", "")
            lc   = link.get("class", 0)
            lch  = link.get("chapter_number", 0)
            if lid not in valid_ids:
                stripped += 1; continue
            if lc > current_class:
                stripped += 1; continue
            if lc == current_class and lch > current_chapter:
                stripped += 1; continue
            # Strip sibling links: same chapter + same parent = sibling
            if lc == current_class and lch == current_chapter and c_parent:
                linked_parent = id_to_parent.get(lid, "")
                if linked_parent == c_parent and linked_parent != "":
                    siblings += 1; continue  # strip sibling
            valid.append(link)
            if lc < current_class or lch != current_chapter:
                cross_chap += 1
            else:
                same_ch += 1
        c["builds_upon"] = valid[:MAX_BUILDS_UPON]

    if stripped and log:
        log.warning(f"     Stripped {stripped} invalid links")
    if siblings and log:
        log.warning(f"     Stripped {siblings} sibling links")
    if log:
        log.info(f"     Cross-chapter: {cross_chap} | Parent-child: {same_ch} | Siblings stripped: {siblings}")
    return concepts

# ── Main relink ────────────────────────────────────────────────────────────────

def relink_class(client, subject, class_num, filter_chapter, dry_run, log):

    # Load target class (to relink)
    target_concepts = load_class(subject, class_num)
    if not target_concepts:
        log.error(f"No concepts found for {subject} class {class_num}")
        log.error(f"Expected: {class_file(subject, class_num)}")
        sys.exit(1)
    log.info(f"Loaded {len(target_concepts)} concepts from class{class_num} file")

    # Load reference classes (all earlier classes)
    reference_concepts = []
    for ref_cls in range(8, class_num):
        ref_data = load_class(subject, ref_cls)
        if ref_data:
            reference_concepts.extend(ref_data)
            log.info(f"  + Class {ref_cls}: {len(ref_data)} reference concepts")
    log.info(f"Total reference pool: {len(reference_concepts)} concepts")
    log.info("")

    # Build valid ID set across all concepts
    all_concepts = reference_concepts + target_concepts
    valid_ids    = {c["id"] for c in all_concepts}

    # Get chapters to process
    chapters = {}
    for c in target_concepts:
        chnum = c.get("chapter_number")
        if chnum not in chapters:
            chapters[chnum] = c.get("chapter_name", f"Chapter {chnum}")
    chapters = dict(sorted(chapters.items()))
    if filter_chapter:
        chapters = {k: v for k, v in chapters.items() if k == filter_chapter}

    log.info(f"Chapters to relink: {list(chapters.keys())}")
    log.info("")

    total_cross  = 0
    total_same   = 0
    total_linked = 0

    for chnum, chname in chapters.items():
        log.info(f"── Class {class_num} Ch {chnum}: {chname}")

        # Concepts in this chapter
        ch_concepts = [c for c in target_concepts if c.get("chapter_number") == chnum]
        if not ch_concepts:
            log.warning(f"   No concepts — skipping")
            continue
        log.info(f"   {len(ch_concepts)} concepts")

        # Also add same-class earlier chapters to reference pool
        earlier_same_class = [
            c for c in target_concepts
            if c.get("chapter_number", 0) < chnum
        ]
        full_reference = reference_concepts + earlier_same_class

        if dry_run:
            shortlist = build_shortlist(
                full_reference, ch_concepts, subject, class_num, chnum, log
            )
            ref_text = format_reference_list(shortlist, class_num, chnum)
            log.info(f"   DRY RUN — prompt would be {len(ref_text)} chars reference")
            continue

        # Build shortlist using all 5 filters
        shortlist = build_shortlist(
            full_reference, ch_concepts, subject, class_num, chnum, log
        )
        ref_text = format_reference_list(shortlist, class_num, chnum)

        # Save cache key
        cache_path = os.path.join(
            RELINK_CACHE,
            f"{subject}_c{class_num}_ch{str(chnum).zfill(2)}_v3_relink.txt"
        )
        os.makedirs(RELINK_CACHE, exist_ok=True)

        # Build prompt and call Claude
        prompt = linking_prompt(subject, class_num, chname, ch_concepts, ref_text)
        messages = [{
            "role": "user",
            "content": [{"type": "text", "text": prompt, "cache_control": {"type": "ephemeral"}}]
        }]

        try:
            raw = call_claude(client, messages, max_tokens=24000, log=log)
        except Exception as e:
            log.error(f"   API call failed: {e}")
            continue

        with open(cache_path, "w", encoding="utf-8") as f:
            f.write(raw)

        try:
            linked, truncated = parse_json_response(raw)
            if truncated:
                log.warning(f"   Response truncated — {len(linked)} parsed")
        except ValueError as e:
            log.error(f"   Parse failed: {e} — raw saved to {cache_path}")
            continue

        # Apply links back to target_concepts
        linked_map = {}
        for i, lc in enumerate(linked):
            cid = lc.get("id")
            if not cid and i < len(ch_concepts):
                cid = ch_concepts[i]["id"]
            if cid:
                links = [l for l in lc.get("builds_upon", []) if isinstance(l, dict)]
                linked_map[cid] = links

        for c in target_concepts:
            if c.get("chapter_number") == chnum and c["id"] in linked_map:
                c["builds_upon"] = linked_map[c["id"]]

        # Validate
        ch_updated = [c for c in target_concepts if c.get("chapter_number") == chnum]
        validate_links(ch_updated, valid_ids, class_num, chnum, log)

        # Stats
        ch_cross = sum(
            1 for c in ch_updated
            for l in c.get("builds_upon", [])
            if l.get("class", class_num) < class_num or l.get("chapter_number", chnum) != chnum
        )
        ch_same = sum(
            1 for c in ch_updated
            for l in c.get("builds_upon", [])
            if l.get("class", class_num) == class_num and l.get("chapter_number", chnum) == chnum
        )
        ch_linked = sum(1 for c in ch_updated if c.get("builds_upon"))
        total_cross  += ch_cross
        total_same   += ch_same
        total_linked += ch_linked

        log.info(f"   Updated: {len(linked_map)} | Linked: {ch_linked} | "
                 f"Cross-chap: {ch_cross} | Same-ch: {ch_same}")

        # Save class file after every chapter
        save_class(subject, class_num, target_concepts)
        log.info(f"   ✓ Saved → {os.path.basename(class_file(subject, class_num))}")

        if list(chapters.keys()).index(chnum) < len(chapters) - 1:
            time.sleep(CHAPTER_DELAY)

    log.info("")
    log.info("=" * 60)
    log.info(f"CLASS {class_num} RELINK COMPLETE")
    log.info(f"  Total linked:        {total_linked}")
    log.info(f"  Cross-chap links:    {total_cross}")
    log.info(f"  Same-ch links:       {total_same}")
    total = total_cross + total_same
    if total:
        pct = round(total_cross / total * 100)
        verdict = "✓ GOOD" if pct >= 60 else "⚠ BELOW TARGET"
        log.info(f"  Cross-chap %:        {pct}%  (target ≥60%) {verdict}")
    log.info("=" * 60)

# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Relink NEET concepts using split class files")
    parser.add_argument("--subject",  required=True, choices=["physics", "chemistry", "biology"])
    parser.add_argument("--class",    type=int, dest="class_num", required=True)
    parser.add_argument("--chapter",  type=int, help="Relink specific chapter only")
    parser.add_argument("--dry-run",  action="store_true")
    args = parser.parse_args()

    log = setup_logging(args.subject, args.class_num)
    log.info("=" * 60)
    log.info(f"Relink Pipeline v3 — {args.subject.capitalize()} Class {args.class_num}")
    log.info(f"Model: {MODEL} | Max ref size: {MAX_REF_SIZE}")
    if args.dry_run:
        log.info("MODE: DRY RUN")
    log.info("=" * 60)

    if args.class_num == 8:
        log.info("Class 8 has no earlier classes to link to — skipping.")
        sys.exit(0)

    if not args.dry_run:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            log.error("ANTHROPIC_API_KEY not set")
            sys.exit(1)
        client = anthropic.Anthropic(api_key=api_key)
    else:
        client = None

    # Verify class file exists
    if not os.path.exists(class_file(args.subject, args.class_num)):
        log.error(f"Class file not found: {class_file(args.subject, args.class_num)}")
        log.error(f"Run split_concepts.py first.")
        sys.exit(1)

    relink_class(client, args.subject, args.class_num, args.chapter, args.dry_run, log)


if __name__ == "__main__":
    main()