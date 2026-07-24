from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one match, found {count}: {old[:100]!r}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')


planner = 'src/presentation/CommercialCityLifePlanner.ts'
replace_once(
    planner,
    """  return [
    define('west-market', 30, 50, 4.8, 3.6, 2.8, 'mixed', 0.28, 101),
    define('north-terraces', 36, 35, 4.6, 3.4, 3.2, 'residential', 0.22, 113),
    define('central-exchange', 57, 50, 5.2, 4, 3.8, 'mixed', 0.16, 127),
    define('park-edge', 62, 35, 4.4, 3.2, 2.6, 'residential', 0.36, 139),
    define('civic-north', 49, 62, 4.8, 3.8, 2.8, 'service', 0.12, 151),
    define('south-market', 36, 69, 4.5, 3.4, 2.5, 'mixed', 0.44, 163),
    define('industrial-south', 68, 62, 5.2, 4, 2.4, 'warehouse', 0.58, 179),
    define('east-workshops', 82, 51, 4.6, 3.6, 2.7, 'warehouse', 0.68, 191),
    define('old-town-gate', 75, 73, 4.2, 3.2, 2.4, 'mixed', 0.82, 211)
  ];
""",
    """  return [
    define('west-market', 31, 48, 4.2, 3.2, 1.7, 'mixed', 0.28, 101),
    define('north-terraces', 38, 36, 4, 3, 1.9, 'residential', 0.22, 113),
    define('central-exchange', 56, 49, 4.6, 3.4, 2.1, 'mixed', 0.16, 127),
    define('park-edge', 62, 36, 3.8, 2.8, 1.6, 'residential', 0.36, 139),
    define('civic-north', 50, 60, 4, 3.1, 1.7, 'service', 0.12, 151),
    define('industrial-south', 70, 59, 4.4, 3.4, 1.5, 'warehouse', 0.58, 179),
    define('east-workshops', 81, 52, 4, 3, 1.6, 'warehouse', 0.68, 191)
  ];
"""
)

test = Path('src/presentation/CommercialCityLifePlanner.test.ts')
text = test.read_text(encoding='utf-8')
old_count = text.count("    expect(plan.infill).toHaveLength(9);\n")
if old_count != 2:
    raise RuntimeError(f'expected two infill length assertions, found {old_count}')
text = text.replace(
    "    expect(plan.infill).toHaveLength(9);\n",
    "    expect(plan.infill).toHaveLength(7);\n"
)
needle = "    expect(plan.infill.some((block) => !block.powered)).toBe(true);\n"
if text.count(needle) != 1:
    raise RuntimeError('expected one unpowered infill assertion')
text = text.replace(
    needle,
    needle + "    expect(plan.infill.every((block) => block.point.z <= 60)).toBe(true);\n",
    1
)
test.write_text(text, encoding='utf-8')
