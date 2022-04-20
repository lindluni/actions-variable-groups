# actions-variable-groups

**NOTICE**: This Action is not meant for secure variables. Environment variables created as part of this Action will be
injected into your Action's environment and will be available as plaintext in your Actions logs.

Actions Variable Groups is a GitHub Action that allows you to centrally store and manage common variables needed by your
GitHub Actions. The Action will then inject the variables you have stored into your Actions environment at runtime.

This is an attempt to mimic non-secret Azure DevOps Variable Groups.

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
group files and directories and inject them into your GitHub Actions environment. You may specify a `ref` using the `@`
syntax to check out a specific version. If you do not specify a ref, the default branch will be chosen.

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
        <path to a directory in the above repo containing variable group files versioned on a specific ref>@<branch/tag/commit>
        <path to a variable group file in the above repo>
        <path to a variable group file in the above repo versioned on a specific ref>@<branch/tag/commit>
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
    - name: Inject Variables
      uses: lindluni/actions-variable-groups@v1.0.0
      with:
        org: lindluni
        repo: variable-groups
        groups: |
          projectAlpha/variables # This is a path in the lindluni/variable-groups repository, so all variable group files in the directory will be injected
          projectAlpha/variables@main # TSame as above, but references a specific version via branch
          projectBeta/variables/nodejs.yml # This is a file in the lindluni/variable-groups repository, so only variable groups in the file will be injected
          projectBeta/variables/nodejs.yml@v1.0.0 # Same as above, but references a specific version via tag
          projectGamma/variables/golang.yml # This is a file in the lindluni/variable-groups repository, so only variable groups in the file will be injected
          projectGamma/variables/golang.yml@9969a43ca477571f91073abf66dfceaf1d3d069a # Same as above, but references a specific version via commit
    - name: Print Environment
      run: env | sort
```
