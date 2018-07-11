const util = require('util');
const exec = util.promisify(require('child_process').exec);

const name = process.argv[2];

const release = async () => {
    const { stdout, stderr } = await exec(`npm view ${name} version`);
    const versions = stdout.split('.');
    await exec(`npm version ${versions[0]}.${versions[1]}.${versions[2] + 1}`);
};

release();