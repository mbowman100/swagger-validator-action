# Validate Swagger API Documentation

This action uses the swagger-cli to validate a given swagger file(s).

## Inputs

### `files`

**Required** The name of the file(s) to validate. Can be a single file path or a list of files.

See example for suggested command for finding all files ending in "openapi.yaml".

### `space_separated`

**Optional** Defaults to true.

For use when passing in a list of files that are space separated.

## Example output

```
Validating file: example.openapi.yaml
example.openapi.yaml is valid
```

## Output variables

### invalidFiles
List of files that failed to validate.

### validFiles
List of valid files.

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
    - name: Get OpenAPI files
      id: getfiles
      uses: actions/checkout@v2
      run:  |
        # Using github env (newline separated file list)
        echo 'FILE_LIST<<EOF' >> $GITHUB_ENV
        find lib -type f -iname "*openapi.yaml" >> $GITHUB_ENV
        echo 'EOF' >> $GITHUB_ENV

        # Using step output (space separated file list)
        FILES="$(find lib -type f -iname "*openapi.yaml")"
        echo "::set-output name=file_list::$FILES"
    - name: swagger-validator
      uses: mbowman100/swagger-validator-action@master
      if: env.FILE_COUNT != '0' # Comment out if you want it to fail if no files found
      with:
        files: ${{ env.FILE_LIST }}
        # files: ${{ steps.getfiles.outputs.file_list }} # For if you're using output
```
