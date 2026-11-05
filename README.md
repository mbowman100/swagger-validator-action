# Validate Swagger and OpenAPI

Validate JSON or YAML API documents using Swagger Parser. Invalid documents fail the step, while every supplied file is checked. The action runs on Node.js 24 and includes its dependencies in `dist/`; callers do not need to install Node.js or npm packages.

## Inputs

- `files` (required): whitespace-separated file paths by default. Both JSON and YAML are supported.
- `space_separated` (default: `true`): set to `false` for newline-separated paths containing spaces. Legacy `1` and `0` values are also supported.

## Outputs

- `validFiles`: JSON array of valid file paths.
- `invalidFiles`: JSON array of invalid file paths.

Both outputs are written after validation finishes, including when documents fail validation. Outputs use GitHub's environment files rather than the deprecated `set-output` command.

## Usage

```yaml
name: Validate API documentation
on: [push, pull_request]

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - name: Validate OpenAPI
        id: validate
        uses: mbowman100/swagger-validator-action@master
        with:
          files: |
            docs/api.openapi.json
            example.openapi.yaml
          space_separated: 'false'
      - name: Show results
        if: always()
        env:
          VALID_FILES: ${{ steps.validate.outputs.validFiles }}
          INVALID_FILES: ${{ steps.validate.outputs.invalidFiles }}
        run: |
          printf 'Valid files: %s\n' "$VALID_FILES"
          printf 'Invalid files: %s\n' "$INVALID_FILES"
```

For production use, pin the validator action to a reviewed commit containing these changes. Existing pins keep using the older runtime and implementation until updated.

To discover files in a workflow, use an environment file:

```yaml
- name: Find OpenAPI files
  run: |
    echo 'FILE_LIST<<EOF' >> "$GITHUB_ENV"
    find lib doc/openapi -type f \( -iname '*openapi.yaml' -o -iname '*openapi.yml' -o -iname '*.openapi.json' \) >> "$GITHUB_ENV"
    echo 'EOF' >> "$GITHUB_ENV"
- uses: mbowman100/swagger-validator-action@master
  with:
    files: ${{ env.FILE_LIST }}
    space_separated: 'false'
```

Only supplied files are validated. Include generated JSON documents as well as source YAML, and run validation after documentation generation. Remote `$ref` targets must be reachable. Validation checks document structure and references; it does not compare documentation with application handlers.

## Development

Use Node.js 24:

```sh
npm ci
npm run build
npm test
```

Commit `dist/` and `package-lock.json` when changing the action or its dependencies. CI checks that the bundle matches its source and tests both entry points.

The build uses esbuild targeting Node.js 24 to preserve variable-based dynamic imports of Node built-ins used by the remote reference resolver. It replaces `dist/` on each build and includes third-party license notices. Avoid bundlers that turn these imports into empty module contexts: local documents can pass while remote `$ref` downloads fail with `Cannot find module 'node:dns/promises'`.

The tests cover both source and standalone bundle execution, including valid and invalid remote references over HTTP and HTTPS with gzip responses. DNS and transport are redirected to an isolated local fixture server; the suite does not contact external services.
