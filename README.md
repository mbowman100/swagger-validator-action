# Validate Swagger API Documentation

This action uses the swagger-cli to validate a given swagger file(s).

## Inputs

### `files`

**Required** The name of the file(s) to validate. Can be a single file path or a list of files.

See example for suggested command for finding all files ending in "openapi.yaml".

## Outputs

`api.openapi.yaml is valid`

`api.openapi.yaml is invalid`

## Example usage

```yaml

uses: mbowman100/swagger-validator-action@v1
with:
  files:
    api.openapi.example.yaml

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
      run: |
        FILES="$(find . -iname "*openapi.yaml")"
        echo ::set-env name=FILE_LIST::$FILES
    - name: swagger-validator
      uses: mbowman100/swagger-validator-action@master
      with:
        files: ${{ env.FILE_LIST }}
```
