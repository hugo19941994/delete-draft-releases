# GitHub Action - Delete Draft Releases

This GitHub Action (written in JavaScript) wraps the [GitHub Release API](https://developer.github.com/v3/repos/releases/) to allow you to leverage GitHub Actions to delete draft releases.

[![Tests](https://github.com/hugo19941994/delete-draft-releases/workflows/Tests/badge.svg)](https://github.com/hugo19941994/delete-draft-releases/actions?query=workflow%3ATests)

## Usage

### Pre-requisites

Create a workflow `.yml` file in your `.github/workflows` directory. An [example workflow](#example-workflow) is available below. For more information, reference the GitHub Help Documentation for [Creating a workflow file](https://help.github.com/en/articles/configuring-a-workflow#creating-a-workflow-file).

**No outputs are available in this version.**

**Only the first 30 releases from a repo are checked.**

### Example workflows

On every `push` it deletes any release marked as a draft:

```yaml
on:
  push:

name: Delete Draft Releases

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Delete drafts
        uses: hugo19941994/delete-draft-releases@v1.0.0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

To delete drafts older than a certain amount of time you can use the threshold input

```yaml
on:
  push:

name: Delete Draft Releases older than 5 days

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Delete drafts
        uses: hugo19941994/delete-draft-releases@v1.0.0
        with:
          threshold: 5d
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The minimum amount of time is 1 second

[Available units of time](https://github.com/jkroso/parse-duration#readme):

* seconds `s`
* minutes `m` `min`
* hours `h` `hr`
* days `d`
* weeks `w` `wk`
* months
* years `y` `yr`

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
