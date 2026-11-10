---
title: Media detection
description: How card readers and cards are represented by the operating system, and the resulting design rules for cliphand.
---

This page describes how card readers and cards are represented by the operating system and which
design rules follow from that for cliphand. It currently covers **Linux**. Windows is not covered
yet.

## Device structure on Linux

A USB card reader is a single USB device. Each slot is a SCSI logical unit (LUN) with its own block
device. The block device of a slot exists as long as the reader is connected, regardless of whether
a card is inserted. Example of a two-slot reader:

```
USB device          2-1             vendor/product, serial, speed
└─ USB interface    2-1:1.0         class 8/6/80 (mass storage), driver usb-storage
   └─ SCSI host     host1
      └─ target     target1:0:0
         ├─ LUN 0   1:0:0:0 → sde   slot 1 (SD), size 0 while empty
         │                   └─ sde1    partition, present while a card is inserted
         └─ LUN 1   1:0:0:1 → sdf   slot 2 (microSD)
```

- The assignment of physical slots to LUNs is defined by the reader's firmware and does not change
  between ports, hosts or reconnects. The LUN number does not indicate which physical slot it
  belongs to. This can only be determined by inserting a card.
- Cards usually carry a partition table with a single partition. Cards formatted without a
  partition table ("superfloppy") hold the filesystem directly on the slot's block device.
- Headless systems do not mount cards automatically. cliphand mounts cards itself.

## Events

The kernel emits a _uevent_ for every device change. udev enriches it with additional properties
(filesystem type, UUID, serial number, stable symlinks) and publishes it again. cliphand consumes
the udev events.

| Situation           | Events                                                                |
| ------------------- | --------------------------------------------------------------------- |
| Reader connected    | `add` from the USB device down to one block device per slot           |
| Card inserted       | `change` on the slot (`DISK_MEDIA_CHANGE=1`), then `add` of partition |
| Card removed        | `change` on the slot, size becomes 0, then `remove` of partition      |
| Reader disconnected | `remove` from the partition up to the USB device, no `change`         |

Properties of the event stream:

- **Duplicates.** A single insertion produces several `change` events, originating from both the
  kernel and udev.
- **Ordering.** Ordering is only guaranteed between a device and its parents, not across devices.
- **Current state.** udev reports the state at the time it processes an event, which may be newer
  than the event itself.
- **Mounted partitions.** The kernel does not remove or rescan the partitions of a disk while one of
  them is mounted. Removing a mounted card produces only the `change` on the slot.
- **Removal events.** A `remove` event of a USB device does not include its serial number.
- **Startup.** Cards that are already inserted when cliphand starts do not produce events.

### Design rules

1. An event is a trigger only. On every event, cliphand reads the current state and reconciles it
   with its known state. Processing the same event more than once has no effect.
2. On startup, cliphand takes a snapshot of all present devices and then follows the event stream.
3. A card is **ready** when a block device with a filesystem appears below an allowed slot.
4. A card is **gone** when its slot reports a size of 0, or when the slot itself is removed. The
   partition `remove` event is not used for this.
5. cliphand keeps its own record of known devices, insertions and jobs, and resolves removals
   against it.

## Identifiers

| Identifier                      | Identifies | Stability                                                                      |
| ------------------------------- | ---------- | ------------------------------------------------------------------------------ |
| Device name (`sde`, `sde1`)     | –          | Not stable. Depends on the other connected devices.                            |
| USB serial number               | Reader     | Not guaranteed to be unique. Some readers report the same value on every unit. |
| USB port path (`by-path`)       | Reader     | Stable while the reader stays on the same port and controller.                 |
| LUN                             | Slot       | Stable, defined by the firmware.                                               |
| Partition UUID                  | Card       | Not reliable, often `00000000-01`.                                             |
| Filesystem UUID (volume serial) | Card       | Stable until the card is formatted.                                            |
| Filesystem label                | Card       | Often not set.                                                                 |
| `DISKSEQ`                       | Insertion  | Unique per media change until reboot. Changes on insertion and removal.        |

cliphand uses the following identities:

| Entity    | Identity                                                       |
| --------- | -------------------------------------------------------------- |
| Reader    | USB serial number, or USB port path if the serial isn't unique |
| Slot      | Reader + LUN                                                   |
| Card      | Filesystem UUID                                                |
| Insertion | `DISKSEQ`                                                      |

## Media change polling

USB card readers do not notify the host about inserted or removed cards. The kernel detects media
changes by polling each slot. Polling is disabled by default in the kernel and enabled by systemd's
udev rules with an interval of 2 seconds. Without polling, media changes are only detected when the
slot is accessed.

- Card detection takes up to 2 seconds, plus about 0.3 seconds for filesystem probing.
- cliphand checks the polling setting on startup and reports a missing configuration. This is
  relevant on systems without systemd, such as minimal images, containers and embedded systems.

## Mounting

A mount persists after its card has been removed. When a card is inserted into the same slot again,
the existing mount becomes accessible again. If a different card is inserted, the mount reads it
with the cached metadata of the previous card, and a writable mount can corrupt it.

- Cards are mounted read-only while ingesting and writable only for cleaning.
- A card is unmounted as soon as it is gone (lazy unmount, as files may still be open).
- Every insertion gets a new mount. Mounts are never reused.
- On startup, cliphand removes leftover mounts from previous runs.

## Read errors

When a card is removed during a copy, the read fails with an I/O error about one second before the
media change event arrives. A damaged card produces the same I/O error. The underlying cause
(e.g. "medium not present") is only available in the kernel log.

After an I/O error, cliphand checks the slot:

- **Medium gone:** the card was removed. The job is stopped.
- **Medium present:** the file is unreadable. It is reported as corrupt and the remaining files are
  processed.

## Hardware characteristics

- **Write protection.** The lock switch on SD cards is mechanical and is read by the reader, not by
  the card. Not all readers report it. cliphand respects a reported write protection but does not
  depend on it.
- **Shared command queue.** Readers using the `usb-storage` driver process one command at a time
  across all slots, so cards in the same reader share its bandwidth. Readers using the `uas` driver
  support command queuing.
- **Link speed.** The negotiated USB speed is available, so a USB 3 reader connected at USB 2 speed
  can be detected.

## Architecture

### Domain concepts

| Concept   | Description                                                    |
| --------- | -------------------------------------------------------------- |
| Reader    | A card reader added by the user, with a name and a fingerprint |
| Slot      | Reader + LUN, with a name                                      |
| Card      | Identified by its filesystem UUID                              |
| Insertion | One card in one slot, from insertion to removal                |
| Profile   | Rename pattern, destination, cleaning policy                   |
| Binding   | Assignment of a profile, e.g. to a slot, ordered by priority   |

### Reader reconciliation

Reader reconciliation is domain logic without I/O. It takes the configured readers and the
currently present devices and determines:

- which present device corresponds to which configured reader,
- which configured readers are not connected,
- which assignments require confirmation by the user.

An exact match of fingerprint and port is applied automatically. All other matches, such as a reader
on a different port or several identical readers, require confirmation. Cards in an unconfirmed
reader are not ingested.

### Adapters

The Linux adapter provides a snapshot of the present devices and a stream of change notifications,
reads device attributes from sysfs, and mounts and unmounts cards. It does not make decisions.

### Configuration

Known readers, including their fingerprint and confirmed port, are part of the configuration file
and are written back by the web UI. cliphand keeps no additional persistent state on the host.

## Open points

- Device representation and events on Windows.
- Docker: access to the host's udev data for reader identification (mounting `/run/udev`), or
  mounting by the host with cliphand watching a directory.
- Resuming an interrupted ingest versus restarting it when a card is inserted again.
