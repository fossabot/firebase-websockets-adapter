const packageJson = require('./package.json');
const fetch = require('node-fetch');
fetch(`http://registry.npmjs.com/${packageJson.name}/latest`)
    .then(res => res.json())
    .then((packageJsonFromRegistry) => {
        const version = packageJsonFromRegistry.version;
        console.log(`Updating from ${version}`);
        const versionSegments = version.split('.');
        const updatedVersion = `${versionSegments[0]}.${versionSegments[1]}.${parseInt(versionSegments[2]) + 1}`;
        packageJson.version = updatedVersion;
        const fs = require('fs');
        fs.writeFile('./package.json', JSON.stringify(packageJson), function(err) {
            if(err) {
                process.exit(1);
                return console.log(err);
            }
            console.log(`Updated to ${updatedVersion}`);
        });
    });