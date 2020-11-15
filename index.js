const core = require('@actions/core');
const api = require("@apidevtools/swagger-cli");

try {
    const files = core.getInput(
        'files',
        { required: true }
    ).trim();

    const space_separated = core.getInput(
        'space_separated',
        {
            required: false,
            default: '1'
        }
    ).trim();

    // Bail if no files
    if (files == '') {
        return core.info('No files to validate');
    }

    if(space_separated == 1) {
        files = files.replace(/(\.ya?ml)\s/g, `$1\n`);
    }

    var invalidFiles = [];
    var validFiles = [];
    files.split(/\n/).forEach(file => {
        core.info(`Validating file: ${file}`);

        var error = validate(file, {
            format: 2,
            type: "yaml",
            wrap: Infinity
        });

        if(error) {
            invalidFiles.push(file);
        } else {
            validFiles.push(file);
        }
    });

    core.setOutput('invalidFiles', invalidFiles);
    core.setOutput('validFiles', validFiles);
} catch (error) {
    core.setFailed(error);
}

async function validate(file, options) {
    var error;
    try {
        await api.validate(file, options);
        core.info(`${file} is valid`);
    } catch (error) {
        core.setFailed(`${file} is invalid\n${error.message}`);
    }
    return error;
}
