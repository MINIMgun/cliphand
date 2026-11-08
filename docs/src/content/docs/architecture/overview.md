---
title: Architecture overview
description: How cliphand is structured and why.
---

cliphand follows a **hexagonal architecture** (ports and adapters). The core contains the domain
logic and defines _ports_, interfaces for everything it needs from the outside world. _Adapters_
implement those ports for a concrete technology, e.g. detecting cards on Linux or serving the web UI.

The core never depends on an adapter. Because every layer is its own crate in a Cargo workspace,
this rule is enforced by the compiler: a crate can only use what is listed in its `Cargo.toml`.

## Crates

| Crate           | Role                                                            |
| --------------- | --------------------------------------------------------------- |
| `cliphand-core` | Domain model and ports. No I/O, no async runtime.               |
| `cliphand`      | The binary. Composition root that wires adapters into the core. |

More crates are added as features arrive, for example adapters for media detection, metadata
extraction, file delivery, the web UI and the hardware status display.

## Core principle: never lose a clip

The card is only cleaned after every file has been copied, delivered and verified against the
hash calculated while reading it from the card. Any failure along the way leaves the card untouched.
