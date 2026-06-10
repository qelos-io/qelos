# Storage & Assets

File storage backends and asset management panel.

## What Users Can Do

- **List storages**: View configured backends at `/assets`
- **Add storage**: Configure S3, GCS, FTP, or Cloudinary at `/assets/new`
- **Edit storage**: Update credentials and settings at `/assets/:id`
- **Browse/upload (Manager mode)**: Slide-out assets panel while editing pages

## Interface Elements

| Screen | Route | Key elements |
|--------|-------|--------------|
| **Storage list** | `/assets` | Table of backends with kind, name, default flag |
| **Add storage** | `/assets/new` | Provider selection, credentials, metadata |
| **Edit storage** | `/assets/:id` | Settings form, credential rotation |
| **Assets panel** | Manager mode overlay | Storage picker, file browser, uploader |

## Storage Providers

S3, Google Cloud Storage, FTP, Cloudinary — with optional image optimization on upload.

## Related

- [Assets API](../../api/assets-and-drafts.md)
- [Play mode](../play-mode/PRODUCT.md) — Manager mode assets panel
