# Updating the upstream version

## Determining the upstream version

The package runs the upstream image `prom/alertmanager`, pinned at `images.alertmanager.source.dockerTag` in `startos/manifest/index.ts`. The latest release:

```bash
gh release view -R prometheus/alertmanager --json tagName -q .tagName
```

Confirm the tag is published for both architectures before pinning it:

```bash
docker manifest inspect prom/alertmanager:<tag> | jq -r '.manifests[].platform.architecture'
```

## Applying the bump

Set `dockerTag` to `prom/alertmanager:<tag>`. Docker Hub tags keep the leading `v` (`v0.35.0`); the package version in `startos/versions/current.ts` drops it.

Read the release notes for removed or renamed command-line flags: the package passes `--config.file`, `--storage.path`, `--web.listen-address` and `--cluster.listen-address` in `startos/main.ts`.
