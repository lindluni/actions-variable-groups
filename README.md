# actions-variable-groups

```yaml
variables:
  - key: Key1
    value: Value1
  - key: Key2
    value: Value2

```

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
