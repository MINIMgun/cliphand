# cliphand

Headless media ingest for creators. Insert a recording card and cliphand copies, verifies and
renames your clips by their metadata, delivers them to a local folder or network share, and cleans
the card for the next shoot.

> [!WARNING]
> cliphand is in early development and not usable yet. The feature plan in
> [`docs/src/content/docs/getting-started/feature-plan.md`](docs/src/content/docs/getting-started/feature-plan.md)
> shows what is planned.

## Platforms

| Platform | Architecture  |        Release binary        |
| -------- | ------------- | :--------------------------: |
| Linux    | x86_64, ARM64 |              ✅              |
| Windows  | x86_64        |              ✅              |
| Docker   | amd64, arm64  |              ✅              |
| macOS    | ARM64         | Build from source (untested) |

The Linux binaries are statically linked (musl) and run on any distribution, including Raspberry Pi OS (currently untested).

## Installation

Download the archive for your platform from the
[releases](https://github.com/MINIMgun/cliphand/releases) and verify it:

```sh
sha256sum --check --ignore-missing SHA256SUMS
gh attestation verify cliphand-*.tar.gz --repo MINIMgun/cliphand
```

Or run the Docker image:

```sh
docker run --rm ghcr.io/minimgun/cliphand:latest
```

## Building from source

Requires [rustup](https://rustup.rs). The toolchain version is pinned in `rust-toolchain.toml` and
installed automatically.

```sh
cargo build --release
cargo test
```

### Docker image

The Dockerfile packages a prebuilt static binary. To build the image locally:

```sh
rustup target add x86_64-unknown-linux-musl
cargo build --release --target x86_64-unknown-linux-musl
mkdir -p dist/linux/amd64
cp target/x86_64-unknown-linux-musl/release/cliphand dist/linux/amd64/
docker build -t cliphand .
```

## Contributing

Commits and pull request titles follow [Conventional Commits](https://www.conventionalcommits.org).
Releases and the [changelog](CHANGELOG.md) are generated from them.

## License

[MIT](LICENSE)
