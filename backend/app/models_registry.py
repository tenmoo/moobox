from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

import yaml


@dataclass
class ModelEntry:
    id: str
    name: str
    provider: str
    api_key_env: str
    api_base_env: str | None = None

    @property
    def api_key(self) -> str | None:
        return os.environ.get(self.api_key_env)

    @property
    def api_base(self) -> str | None:
        if self.api_base_env:
            return os.environ.get(self.api_base_env)
        return None


@dataclass
class ModelRegistry:
    models: list[ModelEntry] = field(default_factory=list)
    _index: dict[str, ModelEntry] = field(default_factory=dict, repr=False)

    def get(self, model_id: str) -> ModelEntry | None:
        return self._index.get(model_id)

    def list_models(self) -> list[dict]:
        return [{"id": m.id, "name": m.name, "provider": m.provider} for m in self.models]


def load_registry(path: str | Path) -> ModelRegistry:
    path = Path(path)
    with path.open() as f:
        data = yaml.safe_load(f)

    entries = []
    for item in data.get("models", []):
        entries.append(
            ModelEntry(
                id=item["id"],
                name=item["name"],
                provider=item["provider"],
                api_key_env=item.get("api_key_env", ""),
                api_base_env=item.get("api_base_env"),
            )
        )

    registry = ModelRegistry(models=entries)
    registry._index = {e.id: e for e in entries}
    return registry
