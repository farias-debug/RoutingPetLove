"""Helpers para persistir artefatos intermediarios do TMS em Google Cloud Storage."""

from __future__ import annotations

import os
from pathlib import Path

from google.cloud import storage

DEFAULT_GCS_PREFIX = "tms-monitoramento"


def _normalize_prefix(prefix: str) -> str:
    return prefix.strip().strip("/")


class GCSStorageManager:
    """Gerencia o bucket usado pelo pipeline para incrementais e consolidado."""

    def __init__(self, bucket_name: str, prefix: str = DEFAULT_GCS_PREFIX):
        bucket_name = bucket_name.strip()
        if not bucket_name:
            raise ValueError("bucket_name obrigatorio")

        self.client = storage.Client()
        self.bucket_name = bucket_name
        self.prefix = _normalize_prefix(prefix or DEFAULT_GCS_PREFIX)
        self.bucket = self.client.bucket(bucket_name)

    @classmethod
    def from_env(
        cls,
        bucket_name: str | None = None,
        prefix: str | None = None,
    ) -> "GCSStorageManager | None":
        resolved_bucket = (bucket_name or os.getenv("TMS_GCS_BUCKET", "")).strip()
        if not resolved_bucket:
            return None

        resolved_prefix = prefix or os.getenv("TMS_GCS_PREFIX", DEFAULT_GCS_PREFIX)
        return cls(resolved_bucket, resolved_prefix)

    def build_path(self, *parts: str) -> str:
        cleaned = [self.prefix] if self.prefix else []
        cleaned.extend(str(part).strip("/") for part in parts if str(part).strip("/"))
        return "/".join(cleaned)

    def uri(self, *parts: str) -> str:
        return f"gs://{self.bucket_name}/{self.build_path(*parts)}"

    def blob_exists(self, *parts: str) -> bool:
        return self.bucket.blob(self.build_path(*parts)).exists(self.client)

    def list_blobs(self, *parts: str) -> list[storage.Blob]:
        prefix = self.build_path(*parts)
        return list(self.client.list_blobs(self.bucket, prefix=prefix))

    def download_blob(self, blob_name: str, destination: Path) -> Path:
        destination.parent.mkdir(parents=True, exist_ok=True)
        self.bucket.blob(blob_name).download_to_filename(str(destination))
        return destination

    def download_if_exists(self, destination: Path, *parts: str) -> Path | None:
        blob_name = self.build_path(*parts)
        if not self.bucket.blob(blob_name).exists(self.client):
            return None
        return self.download_blob(blob_name, destination)

    def upload_file(self, source: Path, *parts: str) -> str:
        blob_name = self.build_path(*parts)
        blob = self.bucket.blob(blob_name)
        blob.upload_from_filename(str(source))
        return blob_name

    def move_blob(self, source_blob_name: str, destination_blob_name: str) -> None:
        source_blob = self.bucket.blob(source_blob_name)
        self.bucket.copy_blob(source_blob, self.bucket, destination_blob_name)
        source_blob.delete()
