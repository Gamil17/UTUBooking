#!/usr/bin/env python3
"""
UTUBooking Translation Completeness Audit
Base locale: en.json
"""

import json
import os
from pathlib import Path

LOCALES_DIR = Path(__file__).parent

LOCALE_FILES = [
    "ar", "de", "en-GB", "en-US", "es-419", "es", "fa", "fr",
    "hi", "id", "it", "ja", "ko", "ms", "nl", "pl", "pt-BR",
    "ru", "sv", "th", "tr", "ur", "vi", "zh-CN", "zh-HK", "zh-TW"
]


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_all_keys(obj, prefix=""):
    """Recursively get all dot-separated keys from a nested dict."""
    keys = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            full_key = f"{prefix}.{k}" if prefix else k
            keys.add(full_key)
            keys |= get_all_keys(v, full_key)
    return keys


def get_top_level_keys(obj):
    return set(obj.keys()) if isinstance(obj, dict) else set()


def audit_locale(en_data, locale_data, en_all_keys):
    """
    Returns:
        present_count: how many en keys exist in locale
        missing_sections: top-level sections entirely absent
        partial_sections: top-level sections present but incomplete
    """
    locale_all_keys = get_all_keys(locale_data)

    # Count how many EN keys are present in this locale
    present_keys = en_all_keys & locale_all_keys
    present_count = len(present_keys)

    # Analyse per top-level section
    missing_sections = []
    partial_sections = []

    for section in sorted(en_data.keys()):
        section_en_keys = {k for k in en_all_keys if k == section or k.startswith(section + ".")}
        section_locale_keys = {k for k in locale_all_keys if k == section or k.startswith(section + ".")}

        present_in_section = section_en_keys & section_locale_keys
        missing_in_section = section_en_keys - section_locale_keys

        if len(present_in_section) == 0:
            missing_sections.append(section)
        elif len(missing_in_section) > 0:
            partial_sections.append(f"{section} ({len(missing_in_section)} missing)")

    return present_count, missing_sections, partial_sections


def main():
    en_path = LOCALES_DIR / "en.json"
    en_data = load_json(en_path)
    en_all_keys = get_all_keys(en_data)
    total_en_keys = len(en_all_keys)
    top_level_sections = sorted(en_data.keys())

    print("=" * 80)
    print("UTUBooking Translation Completeness Audit")
    print(f"Reference: en.json")
    print(f"Total top-level sections: {len(top_level_sections)}")
    print(f"Total recursive keys:     {total_en_keys}")
    print("=" * 80)
    print(f"\nTop-level sections in en.json:")
    for i, s in enumerate(top_level_sections, 1):
        sub_count = len([k for k in en_all_keys if k.startswith(s + ".") or k == s])
        print(f"  {i:2}. {s:<30} ({sub_count} keys incl. nested)")

    print("\n" + "=" * 80)
    print("PER-LOCALE AUDIT")
    print("=" * 80)

    results = []

    for locale in LOCALE_FILES:
        path = LOCALES_DIR / f"{locale}.json"
        if not path.exists():
            results.append({
                "locale": locale,
                "present": 0,
                "total": total_en_keys,
                "pct": 0.0,
                "missing": list(top_level_sections),
                "partial": [],
                "missing_file": True,
            })
            continue

        try:
            locale_data = load_json(path)
        except Exception as e:
            print(f"  ERROR loading {locale}.json: {e}")
            continue

        present_count, missing_sections, partial_sections = audit_locale(
            en_data, locale_data, en_all_keys
        )
        pct = (present_count / total_en_keys * 100) if total_en_keys else 0

        results.append({
            "locale": locale,
            "present": present_count,
            "total": total_en_keys,
            "pct": pct,
            "missing": missing_sections,
            "partial": partial_sections,
            "missing_file": False,
        })

    # Sort by coverage descending
    results.sort(key=lambda x: -x["pct"])

    # Print detailed results
    for r in results:
        print(f"\n{'─'*60}")
        if r.get("missing_file"):
            print(f"  LOCALE: {r['locale']} — FILE NOT FOUND")
            continue

        pct_bar = int(r['pct'] / 5)
        bar = "█" * pct_bar + "░" * (20 - pct_bar)
        print(f"  LOCALE : {r['locale']}")
        print(f"  Keys   : {r['present']}/{r['total']}  [{bar}]  {r['pct']:.1f}%")

        if r['missing']:
            print(f"  MISSING sections ({len(r['missing'])}):")
            for s in r['missing']:
                print(f"    ✗ {s}")
        else:
            print(f"  MISSING sections: none")

        if r['partial']:
            print(f"  PARTIAL sections ({len(r['partial'])}):")
            for s in r['partial']:
                print(f"    ~ {s}")
        else:
            print(f"  PARTIAL sections: none")

    # Summary table
    print("\n\n" + "=" * 100)
    print("SUMMARY TABLE")
    print("=" * 100)
    header = f"{'Locale':<12} {'Keys Present':>13} {'Total Keys':>11} {'Coverage %':>11}  {'Missing Sections':>5}  {'Partial Sections':>5}"
    print(header)
    print("-" * 100)

    for r in results:
        if r.get("missing_file"):
            print(f"{'['+r['locale']+']':<12} {'FILE NOT FOUND':>13}")
            continue
        flag = ""
        if r['pct'] == 100.0:
            flag = " COMPLETE"
        elif r['pct'] >= 90:
            flag = " GOOD"
        elif r['pct'] >= 70:
            flag = " PARTIAL"
        else:
            flag = " LOW"

        print(
            f"{r['locale']:<12} {r['present']:>13,} {r['total']:>11,} {r['pct']:>10.1f}%"
            f"  {len(r['missing']):>16}  {len(r['partial']):>16}{flag}"
        )

    print("=" * 100)

    # Critical gaps summary
    print("\n\nCRITICAL GAPS (coverage < 80%):")
    low = [r for r in results if r['pct'] < 80 and not r.get("missing_file")]
    if low:
        for r in low:
            print(f"  {r['locale']:<12}  {r['pct']:.1f}%  —  Missing: {', '.join(r['missing'][:5])}"
                  + ("..." if len(r['missing']) > 5 else ""))
    else:
        print("  None — all locales >= 80%")

    print("\nAudit complete.")


if __name__ == "__main__":
    main()
