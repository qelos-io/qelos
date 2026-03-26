# Publishing qelos-sdk to PyPI

This guide walks you through publishing the `qelos-sdk` Python package to [PyPI](https://pypi.org/) (Python Package Index).

## Prerequisites

1. **Python 3.9+** installed
2. **A PyPI account** — sign up at https://pypi.org/account/register/
3. **A PyPI API token** — create one at https://pypi.org/manage/account/token/

## One-time setup

### 1. Install build tools

```bash
pip install build twine
```

### 2. Configure PyPI credentials

Create or edit `~/.pypirc`:

```ini
[distutils]
index-servers =
    pypi
    testpypi

[pypi]
username = __token__
password = pypi-YOUR_API_TOKEN_HERE

[testpypi]
repository = https://test.pypi.org/legacy/
username = __token__
password = pypi-YOUR_TEST_API_TOKEN_HERE
```

Alternatively, you can pass credentials as environment variables or via `twine` prompts.

## Publishing steps

### 1. Navigate to the package directory

```bash
cd packages/python-sdk
```

### 2. Update the version

Edit `pyproject.toml` and update the `version` field:

```toml
[project]
version = "3.11.10"  # bump this
```

### 3. Clean previous builds

```bash
rm -rf dist/ build/ *.egg-info
```

### 4. Build the package

```bash
python -m build
```

This creates:
- `dist/qelos_sdk-X.Y.Z.tar.gz` (source distribution)
- `dist/qelos_sdk-X.Y.Z-py3-none-any.whl` (wheel)

### 5. Verify the package (optional but recommended)

```bash
twine check dist/*
```

### 6. Test publish (optional but recommended)

Publish to TestPyPI first to verify everything works:

```bash
twine upload --repository testpypi dist/*
```

Then test installing from TestPyPI:

```bash
pip install --index-url https://test.pypi.org/simple/ --extra-index-url https://pypi.org/simple/ qelos-sdk
```

### 7. Publish to PyPI

```bash
twine upload dist/*
```

Your package is now live at `https://pypi.org/project/qelos-sdk/`!

## Publishing with GitHub Actions (CI/CD)

For automated publishing, add this workflow at `.github/workflows/publish-python-sdk.yml`:

```yaml
name: Publish Python SDK to PyPI

on:
  release:
    types: [published]
  workflow_dispatch:

jobs:
  publish:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: packages/python-sdk

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install build tools
        run: pip install build twine

      - name: Build package
        run: python -m build

      - name: Publish to PyPI
        env:
          TWINE_USERNAME: __token__
          TWINE_PASSWORD: ${{ secrets.PYPI_API_TOKEN }}
        run: twine upload dist/*
```

### Setup for GitHub Actions

1. Go to your repository **Settings > Secrets and variables > Actions**
2. Add a new secret named `PYPI_API_TOKEN` with your PyPI API token value
3. Create a GitHub release or manually trigger the workflow

## Using Trusted Publishers (recommended for GitHub Actions)

PyPI supports [Trusted Publishers](https://docs.pypi.org/trusted-publishers/) which eliminates the need for API tokens:

1. Go to https://pypi.org/manage/project/qelos-sdk/settings/publishing/
2. Add a new GitHub publisher:
   - **Repository owner**: `qelos-io`
   - **Repository name**: `qelos`
   - **Workflow name**: `publish-python-sdk.yml`
   - **Environment**: `pypi` (optional)
3. Update the workflow to use OIDC:

```yaml
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
    defaults:
      run:
        working-directory: packages/python-sdk

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install build
      - run: python -m build
      - uses: pypa/gh-action-pypi-publish@release/v1
        with:
          packages-dir: packages/python-sdk/dist/
```

## Versioning

Keep the Python SDK version in sync with the JavaScript SDK version in `packages/sdk/package.json`. Both SDKs should target the same API version.

## Verifying the published package

After publishing, verify the package works:

```bash
pip install qelos-sdk
python -c "from qelos_sdk import QelosSDK; print('OK')"
```
