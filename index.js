const SwaggerParser = require('@apidevtools/swagger-parser');

async function run(core) {
    const files = core.getInput('files', { required: true }).trim();
    const separator = core.getInput('space_separated').trim().toLowerCase();
    if (!['', '1', '0', 'true', 'false'].includes(separator)) {
        throw new Error('space_separated must be true, false, 1, or 0');
    }

    const spaceSeparated = !['false', '0'].includes(separator);
    const fileList = files.split(spaceSeparated ? /\s+/ : /\r?\n/)
        .map(file => file.trim()).filter(Boolean);
    const invalidFiles = [];
    const validFiles = [];

    for (const file of fileList) {
        core.info(`Validating file: ${file}`);
        try {
            await SwaggerParser.validate(file);
            validFiles.push(file);
            core.info(`${file} is valid`);
        } catch (error) {
            invalidFiles.push(file);
            core.error(`${file} is invalid\n${error.message}`);
        }
    }

    core.setOutput('invalidFiles', invalidFiles);
    core.setOutput('validFiles', validFiles);
    if (invalidFiles.length) {
        core.setFailed(`${invalidFiles.length} OpenAPI document(s) failed validation`);
    }
}

import('@actions/core').then(async core => {
    try {
        await run(core);
    } catch (error) {
        core.setFailed(error.message);
    }
}).catch(error => {
    console.error(error);
    process.exitCode = 1;
});
