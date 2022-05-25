const fs = require('fs')
const os = require('os')
const yaml = require('js-yaml')

const core = require('@actions/core')
const {Octokit} = require('@octokit/rest')
const {App} = require('@octokit/app')
const {retry} = require('@octokit/plugin-retry')
const {throttling} = require('@octokit/plugin-throttling')
const _Octokit = Octokit.plugin(retry, throttling)

const appID = core.getInput('app-id', {required: false, trimWhitespace: true})
const privateKey = core.getInput('private-key', {required: false, trimWhitespace: true})
const baseURL = core.getInput('url', {required: true, trimWhitespace: true})
const groups = core.getInput('groups', {required: true, trimWhitespace: true}).split('\n').map(group => group.trim())
const org = core.getInput('org', {required: true, trimWhitespace: true})
const repo = core.getInput('repo', {required: true, trimWhitespace: true})
const token = core.getInput('token', {required: false, trimWhitespace: true})

async function newClient() {
    return new _Octokit({
        auth: token,
        baseUrl: baseURL,
        throttle: {
            onRateLimit: (retryAfter, options, octokit) => {
                octokit.log.warn(`Request quota exhausted for request ${options.method} ${options.url}`)
                if (options.request.retryCount <= 1) {
                    octokit.log.info(`Retrying after ${retryAfter} seconds!`)
                    return true
                }
            },
            onAbuseLimit: (retryAfter, options, octokit) => {
                octokit.log.warn(`Abuse detected for request ${options.method} ${options.url}`)
            },
        }
    })
}

async function newAppClient() {
    return new App({
        appId: appID,
        privateKey: privateKey,
        Octokit: _Octokit.defaults({
            request: {
                retries: 3
            },
            baseUrl: baseURL,
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
                }
            }
        })
    });
}

async function retrieveFiles(client, group, ref) {
    try {
        core.info(`Retrieving files for group ${group}`)
        if (ref) {
            const {data: files} = await client.repos.getContent({
                owner: org,
                repo: repo,
                path: group,
            })
            return files
        } else {
            const {data: files} = await client.repos.getContent({
                owner: org,
                repo: repo,
                path: group,
            })
            return files
        }
    } catch (err) {
        core.setFailed(`Fail to retrieve files ${group}: ${err.message}`)
        process.exit(1)
    }
}

async function retrieveFile(client, path, ref) {
    try {
        core.info(`Retrieving file ${path}`)
        if (ref) {
            const {data: file} = await client.repos.getContent({
                owner: org,
                repo: repo,
                path: path,
                ref: ref
            })
            return file.content
        } else {
            const {data: file} = await client.repos.getContent({
                owner: org,
                repo: repo,
                path: path,
            })
            return file.content
        }
    } catch (err) {
        core.setFailed(`Fail to retrieve file ${path}: ${err.message}`)
        process.exit(1)
    }
}

async function processVariables(rawContent) {
    try {
        const content = Buffer.from(rawContent, 'base64').toString('utf8')
        const group = yaml.load(content, 'utf8')
        for (const variable of group.variables) {
            core.info(`Appending variable ${variable.key} to environment`)
            await fs.appendFileSync(process.env.GITHUB_ENV, `${variable.key}=${variable.value}${os.EOL}`)
        }
    } catch (err) {
        core.setFailed(`Failed to process variables: ${err.message}`)
        process.exit(1)
    }
}

async function main() {
    try {
        let client
        if (appID && privateKey) {
            client = await newAppClient()
        } else {
            client = newClient()
        }
        
        for (let group of groups) {
            core.info(`Processing group ${group}`)
            let ref
            if (group.includes('@')) {
                [group, ref] = group.split('@')
            }
            const files = await retrieveFiles(client, group, ref)
            if (Array.isArray(files)) {
                for (const _file of files) {
                    const file = await retrieveFile(client, _file.path)
                    await processVariables(file)
                }
            } else {
                await processVariables(files.content)
            }
        }
    } catch (error) {
        core.setFailed(`Failed processing files: ${error.message}`)
        process.exit(1)
    }
}

main()
