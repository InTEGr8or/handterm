for file in $(git diff --name-only); do npx eslint $file --quiet --format json | jq -e '.[0].messages | length == 0' && git add $file; done