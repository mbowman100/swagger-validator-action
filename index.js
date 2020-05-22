const core = require('@actions/core');
const api = require("swagger-cli");

try {
    const files = core.getInput('files', { required: true }).trim();
    // Bail if no files
    if (files !== '') {
        return core.setOutput('No files to validate')
    }
    
    files.split(" ").forEach(file => {
        console.log(`Validating file: ${file}`);

        validate(file, {
            format: 2,
            type: "yaml",
            wrap: Infinity
        });
    });
} catch (error) { /* NOOP */ }

async function validate(file, options) {
    try {
        await api.validate(file, options);
        console.log(file, " is valid");
        core.setOutput(`${file} is valid`);
    } catch (error) {
        console.error(error.message);
        core.setFailed(`${file} is invalid`);
    }
}
