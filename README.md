# actions-variable-groups

**NOTICE**: This Action is not meant for secure variables. Environment variables created as part of this Action will be
injected into your Action's environment and will be available as plaintext in your Actions logs.

Actions Variable Groups is a GitHub Action that allows you to centrally store and manage common variables needed by your
GitHub Actions. The Action will then inject the variables you have stored into your Actions environment at runtime.

This is an attempt to mimic Azure DevOps Variable Groups.

### Setup

Variables are managed by creating one or more YAML files containing a single `variables` array, which contains one or
more `key/value` pair objects. These files may be stored in a single file or directory in GitHub repository, or many
directories, and a directory may contain one or more variable group files.

```yaml
variables:
  - key: Key1
    value: Value1
  - key: Key2
    value: Value2

```

### Usage

You may then consume the Action by adding the following to your GitHub Actions workflow, which will read in all variable
group files and directories and inject them into your GitHub Actions environment:

**Note**: If you store your variables in a public or internal repository, you do not need to provide a token to use this
actions.

```yaml
steps:
  - uses: lindluni/actions-variable-groups@main
    with:
      org: <org hosting the repo with variable group files>
      repo: <repo containing the variable group files>
      token: <token with access to repo if it is not an internal rep>
      groups: |
        <path to a directory in the above repo containing variable group files>
        <path to a variable group file in the above repo>
        ...
```

## Example

```yaml
name: Inject Variables
on:
  pull:
jobs:
  name: Echo Environment
  runs-on: ubuntu-latest
  steps:
    - uses: lindluni/actions-variable-groups@v1.0.0
      with:
        org: lindluni
        repo: variable-groups
        groups: |
          projectAlpha/variables # This is a path in the lindluni/variable-groups repository, so all variable group files in the directory will be injected
          projectBeta/variables/nodejs.yml # This is a file in the lindluni/variable-groups repository, so only variable groups in the file will be injected
          projectGamma/variables/golang.yml # This is a file in the lindluni/variable-groups repository, so only variable groups in the file will be injected
```
