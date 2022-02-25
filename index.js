const fs = require('fs');
const os = require('os');
const yaml = require('js-yaml');
const core = require('@actions/core');

const {Octokit} = require("@octokit/rest");
const {retry} = require("@octokit/plugin-retry");
const {throttling} = require("@octokit/plugin-throttling");
const _Octokit = Octokit.plugin(retry, throttling);

const groups = core.getInput('groups', {required: true, trimWhitespace: true}).split('\n');
const org = core.getInput('ORG', {required: true, trimWhitespace: true});
const repo = core.getInput('REPO', {required: true, trimWhitespace: true});
const token = core.getInput('TOKEN', {required: true, trimWhitespace: true});

const client = new _Octokit({
    auth: token,
    throttle: {
        onRateLimit: (retryAfter, options, octokit) => {
            octokit.log.warn(`Request quota exhausted for request ${options.method} ${options.url}`);
            if (options.request.retryCount <= 1) {
                octokit.log.info(`Retrying after ${retryAfter} seconds!`);
                return true;
            }
        },
        onAbuseLimit: (retryAfter, options, octokit) => {
            octokit.log.warn(`Abuse detected for request ${options.method} ${options.url}`);
        },
    }

});

(async function () {
    try {
        for (const group of groups) {
            const files = retrieveFiles(group);
            if (Array.isArray(files)) {
                for (const _file of files) {
                    const file = await retrieveFile(_file.path);
                    const content = Buffer.from(file.content, 'base64').toString('utf8')
                    await processVariables(content)
                }
            } else {
                await processVariables(files.content)
            }
        }
    } catch (error) {
        core.setFailed(`Failed processing files: ${error.message}`);
    }
})()

async function retrieveFiles(group) {
    try {
        const {data: files} = await client.repos.getContent({
            owner: org,
            repo: repo,
            path: group
        })
        return files
    } catch (err) {
        core.setFailed(`Fail to retrieve files ${group}: ${err.message}`)
    }
}

async function retrieveFile(path) {
    try {
        const {data: file} = await client.repos.getContent({
            owner: org,
            repo: repo,
            path: path
        })
        return Buffer.from(file.content, 'base64').toString('utf8')
    } catch (err) {
        core.setFailed(`Fail to retrieve file ${path}: ${err.message}`)
    }
}

async function processVariables(file) {
    try {
        const content = Buffer.from(file.content, 'base64').toString('utf8')
        const group = yaml.load(content, "utf8")
        for (const variable of group.variables) {
            await fs.appendFileSync(process.env.GITHUB_ENV, `${variable.name}=${variable.value}${os.EOL}`)
        }
    } catch (err) {
        core.setFailed(`Fail to process variables: ${err.message}`)
    }
}
