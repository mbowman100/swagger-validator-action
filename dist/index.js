module.exports =
/******/ (function(modules, runtime) { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	__webpack_require__.ab = __dirname + "/";
/******/
/******/ 	// the startup function
/******/ 	function startup() {
/******/ 		// Load entry module and return exports
/******/ 		return __webpack_require__(622);
/******/ 	};
/******/
/******/ 	// run startup
/******/ 	return startup();
/******/ })
/************************************************************************/
/******/ ({

/***/ 622:
/***/ (function(__unusedmodule, __unusedexports, __webpack_require__) {

const core = __webpack_require__(968);
const api = __webpack_require__(783);

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

/***/ }),

/***/ 783:
/***/ (function() {

eval("require")("swagger-cli");


/***/ }),

/***/ 968:
/***/ (function() {

eval("require")("@actions/core");


/***/ })

/******/ });