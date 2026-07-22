# Energy Grid Tycoon global art generator v3
# Generated package source entry.
# Dependencies: Pillow
# Run the checked-in project generator from your build scripts while preserving asset IDs.
#
# The complete production generator specification is represented by:
# - manifest.json
# - asset-catalog-v3.json
# - docs/INTEGRATION.md
#
# This source file is intentionally small so it is easy to adopt into the repository.
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "src" / "resources" / "asset-catalog-v3.json"

def validate() -> None:
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    assert data["schemaVersion"] == 3
    ids = [item["id"] for item in data["entries"]]
    assert len(ids) == len(set(ids))
    for item in data["entries"]:
        file_path = ROOT / "public" / item["src"].lstrip("/")
        assert file_path.exists(), f"Missing asset: {item['id']} -> {file_path}"
    print(f"Validated {len(ids)} global assets.")

if __name__ == "__main__":
    validate()
