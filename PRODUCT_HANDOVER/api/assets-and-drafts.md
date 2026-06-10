# Assets, Storage & Drafts

File storage configuration, upload/browse/delete assets, and saved admin drafts.

## What Users Can Do

- **Configure storage**: Register S3, GCS, FTP, or Cloudinary backends
- **Browse assets**: List files in a storage location
- **Upload files**: Stream upload to storage path; quick upload to default storage
- **Manage files**: Rename and delete assets
- **Save drafts**: Persist in-progress admin edits per user and context

## Storage Endpoints

### GET /api/storage
List storage configurations.

### POST /api/storage
Add storage backend with encrypted credentials.

### GET /api/storage/:storageId
Retrieve storage config.

### PUT /api/storage/:storageId
Update settings or credentials.

### DELETE /api/storage/:storageId
Remove storage and purge credentials.

## Asset Endpoints

### GET /api/assets/:storageId
List files (query: identifier/path).

### POST /api/assets/:storageId
Upload file; returns public URL/metadata.

### PUT /api/assets/:storageId
Rename file (body: newFilename).

### DELETE /api/assets/:storageId
Remove file.

### POST /api/upload
Quick upload to tenant default storage via multipart or URL.

## Draft Endpoints

### GET /api/drafts/all
List all drafts for authenticated user.

### GET /api/drafts
Fetch draft by contextType and optional contextId.

### PUT /api/drafts
Upsert draft with contextData, displayName, routeParams.

### DELETE /api/drafts
Remove draft for context.

## Related

- [Assets screen](../frontend/assets/PRODUCT.md)
- [Drafts screen](../frontend/drafts/PRODUCT.md)
