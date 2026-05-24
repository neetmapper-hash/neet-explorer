#!/usr/bin/env python3
"""
split_concepts.py
=================
Splits a concepts JSON file into one file per class.

Usage:
    python3 split_concepts.py --subject physics
    python3 split_concepts.py --subject biology
    python3 split_concepts.py --subject chemistry
    python3 split_concepts.py --all
"""

import os, sys, json, argparse

BASE_DIR = os.path.expanduser("~/neet_pipeline/concepts")

SUBJECT_FILES = {
    "physics":   os.path.join(BASE_DIR, "physics_concepts.json"),
    "chemistry": os.path.join(BASE_DIR, "chem_concepts.json"),
    "biology":   os.path.join(BASE_DIR, "biology_concepts_new.json"),
}

def split(subject, src_file):
    if not os.path.exists(src_file):
        print(f"  File not found: {src_file}")
        return

    with open(src_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    by_class = {}
    for c in data:
        cls = c.get("class")
        if cls not in by_class:
            by_class[cls] = []
        by_class[cls].append(c)

    print(f"\n{subject.upper()} — {len(data)} concepts → splitting by class")
    for cls in sorted(by_class.keys()):
        out_file = os.path.join(BASE_DIR, f"{subject}_concepts_class{cls}.json")
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(by_class[cls], f, ensure_ascii=False, indent=2)
        print(f"  Class {cls}: {len(by_class[cls])} concepts → {os.path.basename(out_file)}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--subject", choices=["physics", "chemistry", "biology"])
    parser.add_argument("--all", action="store_true")
    args = parser.parse_args()

    subjects = list(SUBJECT_FILES.keys()) if args.all else [args.subject]
    if not subjects or subjects == [None]:
        parser.print_help(); sys.exit(1)

    for s in subjects:
        split(s, SUBJECT_FILES[s])

    print("\nDone.")

if __name__ == "__main__":
    main()
