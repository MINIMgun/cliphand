---
title: Feature plan
description: What is planned for cliphand, grouped into milestones.
---

The plan is ordered roughly by implementation sequence. Each milestone is split into small,
independently testable steps. Details will change as the project grows.

| Status | Meaning               |
| :----: | --------------------- |
|   ✅   | Done                  |
|   🚧   | In progress           |
|   📋   | Planned               |
|   💭   | Idea, not yet decided |

## Foundation

| Status | Feature                                                        |
| :----: | -------------------------------------------------------------- |
|   ✅   | Cargo workspace with core library and binary                   |
|   ✅   | CI: formatting, linting, tests on Linux, Windows and macOS     |
|   ✅   | Conventional commits, semantic versioning, automated changelog |
|   🚧   | Documentation site                                             |
|   📋   | Release binaries for Linux (x86_64, ARM64) and Windows         |
|   📋   | Docker image                                                   |

## Configuration

| Status | Feature                                                   |
| :----: | --------------------------------------------------------- |
|   📋   | Single TOML config file, no other state on the host       |
|   📋   | Validation with clear, actionable error messages          |
|   📋   | `check-config` command to validate a file without running |
|   📋   | Reload on file change                                     |

## Media detection

| Status | Feature                                                            |
| :----: | ------------------------------------------------------------------ |
|   📋   | Detect mounted volumes by polling (works everywhere, incl. Docker) |
|   📋   | Event-based detection on Linux                                     |
|   📋   | Event-based detection on Windows                                   |
|   💭   | Event-based detection on macOS                                     |
|   📋   | Multiple cards at the same time                                    |
|   📋   | Check on startup that the OS polls card readers for media changes  |

## Readers and slots

By default cliphand only touches card readers that the user has added. Any other storage device is
ignored, so a USB SSD or a system disk can never be ingested or cleaned by mistake.

| Status | Feature                                                                      |
| :----: | ---------------------------------------------------------------------------- |
|   📋   | List detected card readers and their slots                                   |
|   📋   | Onboarding: insert a card into the reader or slot you want to use, name it   |
|   📋   | Show configured readers that are currently not connected                     |
|   📋   | Identify readers by serial number, or by USB port if the serial isn't unique |
|   💭   | Recognize a known reader on a different USB port and offer to update config  |
|   💭   | Per-slot profiles: rename pattern and destination depend on the slot         |
|   💭   | Choose the profile by card label or camera model instead of the slot         |
|   💭   | Warn when a reader runs slower than it supports (e.g. USB 3 reader at USB 2) |

## Ingest

| Status | Feature                                                    |
| :----: | ---------------------------------------------------------- |
|   📋   | Copy to a temporary folder with hashing during the copy    |
|   📋   | Recognize common card layouts (DCIM, Sony, GoPro, …)       |
|   📋   | Keep related files together (RAW + JPG, proxies, sidecars) |
|   📋   | Detect already ingested cards                              |
|   📋   | Report corrupt or unreadable files                         |
|   📋   | Tell a pulled card apart from a read error on the card     |
|   📋   | Read-only access to the card while ingesting               |
|   💭   | Resume an interrupted ingest when the card is reinserted   |

## Metadata and renaming

| Status | Feature                                                    |
| :----: | ---------------------------------------------------------- |
|   📋   | Read photo metadata (EXIF)                                 |
|   📋   | Read video metadata (MP4 / MOV)                            |
|   📋   | Configurable rename pattern, e.g. `{date}_{camera}_{clip}` |
|   📋   | Configurable folder structure at the destination           |

## Delivery and cleanup

| Status | Feature                                                  |
| :----: | -------------------------------------------------------- |
|   📋   | Deliver to a local folder                                |
|   📋   | Deliver to a network share                               |
|   📋   | Atomic writes: no half-written files at the destination  |
|   📋   | Verify every delivered file against its hash             |
|   📋   | Clean the card only after successful verification        |
|   📋   | Never clean a card the reader reports as write-protected |
|   📋   | Show which profile matched before the card is cleaned    |

## Web UI

| Status | Feature                                                      |
| :----: | ------------------------------------------------------------ |
|   📋   | Optional built-in web server                                 |
|   📋   | Live status of all cards and ingests                         |
|   📋   | Add and name card readers and slots (onboarding)             |
|   📋   | Edit the configuration, changes are written back to the file |

## Platform

| Status | Feature                  |
| :----: | ------------------------ |
|   📋   | Run as a systemd service |
|   📋   | Run as a Windows service |

## Hardware status display

| Status | Feature                                                  |
| :----: | -------------------------------------------------------- |
|   💭   | Custom PCB with LEDs and/or a display, connected via USB |
|   💭   | Per-card status: ingesting, done, error, corrupt file    |
