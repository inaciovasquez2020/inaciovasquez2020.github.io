import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = ROOT / "infra" / "schema" / "admissible_certificate.json"
CERT_PATH = ROOT / "infra" / "certificates" / "example_certificate.json"


def _validate_by_schema(value, schema, path="$"):
    schema_type = schema.get("type")

    if schema_type == "object":
        if not isinstance(value, dict):
            raise AssertionError(f"{path}: expected object")
        required = schema.get("required", [])
        properties = schema.get("properties", {})
        for key in required:
            if key not in value:
                raise AssertionError(f"{path}: missing required key '{key}'")
        for key, subschema in properties.items():
            if key in value:
                _validate_by_schema(value[key], subschema, f"{path}.{key}")
        return

    if schema_type == "number":
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            raise AssertionError(f"{path}: expected number")
        return

    raise AssertionError(f"{path}: unsupported schema type '{schema_type}'")


def _assert_positive_numbers(cert):
    positive_fields = ["n", "c0", "Ccap", "k", "Cloc", "c1", "c2", "Vmax"]
    for key in positive_fields:
        if cert[key] <= 0:
            raise AssertionError(f"$.{key}: must be > 0")

    for key, value in cert["constants"].items():
        if value <= 0:
            raise AssertionError(f"$.constants.{key}: must be > 0")


def verify(cert, schema):
    _validate_by_schema(cert, schema)
    _assert_positive_numbers(cert)
    return True


if __name__ == "__main__":
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema = json.load(f)
    with open(CERT_PATH, "r", encoding="utf-8") as f:
        cert = json.load(f)
    print({"valid": verify(cert, schema)})
