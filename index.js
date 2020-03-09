const core = require('@actions/core');
const api = require("swagger-cli");

try {
    const files = core.getInput('files');

    var file_list = files.split(" ");

    file_list.forEach(file => {
        console.log(`Validating file: ${file}`);

        validate(file, {
            format: 2,
            type: "yaml",
            wrap: Infinity
        });
    });

} catch (error) {

}

async function validate(file, options) {
    try {
        await api.validate(file, options);
        console.log(file, " is valid");
        core.setOutput(`${file} is valid`);
    } catch (error) {
        console.log(error.message);
        core.setFailed(`${file} is invalid`, error.message);
    }
}