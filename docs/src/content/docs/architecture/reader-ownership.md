---
title: Reader ownership
description: Which card readers cliphand acts on, which changes it makes to the system for them, and how they are reverted.
---

A reader that the user adds to cliphand is under cliphand's authority. cliphand prevents other
programs and the desktop from accessing its cards and controls when a card is writable. All other
readers and storage devices are left unchanged.

## Rationale

When the operating system and other programs keep normal access to a reader, cliphand cannot
guarantee a correct ingest:

- Explorer, AutoPlay, photo import tools, the search indexer and antivirus software open cards and
  their files.
- Open files of other programs make ejecting and cleaning a card fail.
- A card can be written to by other programs while it is being ingested.
- On Windows, files that remain open across a card change can attach to a different card with the
  same volume serial number.

## States

| State    | Meaning                                                                                                  |
| -------- | -------------------------------------------------------------------------------------------------------- |
| Observed | The reader is detected and listed. cliphand makes no changes to it and ingests no cards.                 |
| Claimed  | The user has added the reader. cliphand applies its system changes and ingests its cards.                |
| Released | The reader is removed from cliphand. All system changes are reverted to the operating system's defaults. |

A reader is claimed only when the user adds it during onboarding and the
[reader reconciliation](/cliphand/architecture/media-detection/#reader-reconciliation) has
confirmed the match. A reader that matches only with confirmation pending, such as a reader on a
different port or one of several identical readers, is not claimed until the user confirms it.

## System changes

| Measure                       | Linux                                                       | Windows                                       |
| ----------------------------- | ----------------------------------------------------------- | --------------------------------------------- |
| Hide cards from the desktop   | udev rule setting `UDISKS_IGNORE=1` on the reader's slots   | No drive letter on the slots' volumes         |
| Read-only outside of cleaning | Read-only mounts, optionally `blockdev --setro` on the slot | `Set-Disk -IsReadOnly` on the slots' disks    |
| Mounts                        | Mounted by cliphand in its own directory                    | Mounted by Windows, accessed via volume paths |

- The udev rule only has an effect on systems with an automounter, such as desktop environments.
  Headless systems do not mount cards automatically.
- On Windows, both settings are stored per slot and persist across card changes, reconnects of
  the reader and restarts.
- Switching a slot between read-only and writable dismounts the card. cliphand switches only
  between the ingest and cleaning phases, never while files are open.

## Reconciliation of the system state

cliphand does not apply its changes once, but derives the required state of every slot from the
configuration and establishes it:

- on startup,
- when a reader or slot appears,
- when the configuration changes.

The required state is determined by domain logic without I/O. The adapter applies it.

- **Crash recovery.** A slot that remains read-only after a crash is corrected on the next start.
- **Release through configuration.** A reader removed from the configuration is released on the
  next reconciliation.
- **External changes.** When another program or an administrator changes the state of a claimed
  slot, cliphand reports the deviation. It reapplies its state at most once per event and does not
  compete with the other program.

## Release

A released reader is returned to the operating system's defaults:

- **Windows:** the slots' disks are writable and their volumes receive the next free drive letter.
  The original drive letter is not restored.
- **Linux:** the udev rule for the reader is removed and the slots are writable.

The `cliphand release` command releases one reader or, with `--all`, all readers that cliphand has
changed. It works without a valid configuration and without a running service. The uninstaller
runs `cliphand release --all`.

## Limitations

- **Privileges.** Claiming a reader requires administrator rights on Windows and root on Linux.
  Without them, cliphand does not claim the reader and reports the missing privilege.
- **Identical readers.** On Windows, the settings are stored per device instance. For several
  identical readers with the same serial number, it is not verified that the settings stay
  separate.
- **Docker.** In a container, the host owns the devices and udev rules. cliphand can only claim a
  reader to the extent that the host grants access.

## User interface

A claimed reader is not shown by Explorer or the desktop. The web UI shows every claimed reader as
managed by cliphand and offers to release it. The documentation describes how to release readers
manually with `cliphand release`.
