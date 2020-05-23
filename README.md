# Validate Swagger API Documentation

This action uses the swagger-cli to validate a given swagger file(s).

## Inputs

### `files`

**Required** The name of the file(s) to validate. Can be a single file path or a list of files.

See example for suggested command for finding all files ending in "openapi.yaml".

## Outputs

`example.openapi.yaml is valid`

`example.openapi.yaml is invalid`

## Example usage

```yaml

uses: mbowman100/swagger-validator-action@master
with:
  files: |
    example.openapi.yaml

```

## Example of usage from within a repo

```yaml
on: push
name: Validate API swagger documentation
jobs:
  validate:

    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2
    - name: Get OpenAPI files
      run:  |
        FILES="$(find . \( -iname "*openapi.yaml" -or -iname "*openapi.yml" \) -not -path "./.github/*")"
        FILES_C="$(echo "$FILES" | sed '/^\s*$/d' | wc -l)"
        echo ::set-env name=FILE_LIST::$FILES
        echo ::set-env name=FILE_COUNT::$FILES_C
        echo "Found files:"
        echo "$FILES"
    - name: swagger-validator
      uses: mbowman100/swagger-validator-action@master
      if: env.FILE_COUNT != '0' # Comment out if you want it to fail if no files found
      with:
        files: ${{ env.FILE_LIST }}
```
