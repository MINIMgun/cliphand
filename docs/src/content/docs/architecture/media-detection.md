---
title: Media detection
description: How card readers and cards are represented by the operating system, and the resulting design rules for cliphand.
---

This page describes how card readers and cards are represented by Linux and Windows and which
design rules follow from that for cliphand. Which readers cliphand acts on, and which changes it
makes to the system for them, is described in
[Reader ownership](/cliphand/architecture/reader-ownership/).

## Linux

### Device structure

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

### Events

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

Triggers:

- A card is **ready** when a block device with a filesystem appears below an allowed slot.
- A card is **gone** when its slot reports a size of 0, or when the slot itself is removed. The
  partition `remove` event is not used for this.

### Identifiers

| Identifier                      | Identifies | Stability                                                                      |
| ------------------------------- | ---------- | ------------------------------------------------------------------------------ |
| Device name (`sde`, `sde1`)     | –          | Not stable. Depends on the other connected devices.                            |
| USB serial number               | Reader     | Not guaranteed to be unique. Some readers report the same value on every unit. |
| USB port path (`by-path`)       | Reader     | Stable while the reader stays on the same port and controller.                 |
| LUN                             | Slot       | Stable, defined by the firmware.                                               |
| Partition UUID                  | Card       | Not reliable, often `00000000-01`.                                             |
| Filesystem UUID (volume serial) | Card       | Stable until the card is formatted. Not guaranteed to be unique.               |
| Filesystem label                | Card       | Often not set.                                                                 |
| `DISKSEQ`                       | Insertion  | Unique per media change until reboot. Changes on insertion and removal.        |

### Media change polling

USB card readers do not notify the host about inserted or removed cards. The kernel detects media
changes by polling each slot. Polling is disabled by default in the kernel and enabled by systemd's
udev rules with an interval of 2 seconds. Without polling, media changes are only detected when the
slot is accessed.

- Card detection takes up to 2 seconds, plus about 0.3 seconds for filesystem probing.
- cliphand checks the polling setting on startup and reports a missing configuration. This is
  relevant on systems without systemd, such as minimal images, containers and embedded systems.

### Mounting

A mount persists after its card has been removed. When a card is inserted into the same slot again,
the existing mount becomes accessible again. If a different card is inserted, the mount reads it
with the cached metadata of the previous card, and a writable mount can corrupt it.

- Cards are mounted read-only while ingesting and writable only for cleaning.
- A card is unmounted as soon as it is gone (lazy unmount, as files may still be open).
- Every insertion gets a new mount. Mounts are never reused.
- On startup, cliphand removes leftover mounts from previous runs.

### Read errors

When a card is removed during a copy, the read fails with an I/O error about one second before the
media change event arrives. A damaged card produces the same I/O error. The underlying cause
(e.g. "medium not present") is only available in the kernel log.

## Windows

### Device structure

Windows represents a USB card reader as a tree of device nodes. Each slot has its own disk and its
own volume. Both exist as long as the reader is connected, regardless of whether a card is
inserted. Example of a two-slot reader:

```
USB device   USB\VID_05E3&PID_0764\000000002960              driver USBSTOR, port, container ID
├─ disk      USBSTOR\Disk&…\000000002960&0     Disk 4         slot 1, "No Media" while empty
│  └─ volume STORAGE\Volume\_??_USBSTOR#…&0    E:             filesystem while a card is inserted
└─ disk      USBSTOR\Disk&…\000000002960&1     Disk 5         slot 2
   └─ volume STORAGE\Volume\_??_USBSTOR#…&1    F:             size 0 while empty
```

- The LUN is the suffix of the disk's instance ID (`&0`, `&1`).
- The volume belongs to the slot, not to the card. Its volume GUID and drive letter stay the same
  when a different card is inserted.
- The USB serial number is part of the reader's instance ID. Windows treats it as unique, also when
  the reader reports the same value on every unit.
- Readers using the UAS driver are not enumerated below `USBSTOR`. Device paths are not used to
  recognize readers.
- Explorer, AutoPlay and the search indexer access every volume that has a drive letter. Windows
  creates a `System Volume Information` folder on a card the first time it is mounted.

### Events

Insertion and removal of a card produce no device events. They are reported only to applications
that hold an open handle to the slot's disk or volume and register for notifications on it.
cliphand therefore subscribes on two levels:

- **Device notifications** (`CM_Register_Notification` for device instances and interfaces) for
  readers, slots and volumes being added and removed.
- **Handle notifications** (`CM_Register_Notification` on an open handle per slot disk and volume)
  for media changes, mounts and lock requests.

| Situation           | Notifications                                                                      |
| ------------------- | ---------------------------------------------------------------------------------- |
| Reader connected    | Instances enumerated and started from the USB device down to the volumes           |
| Card inserted       | `MEDIA_ARRIVAL` on the disk, layout changes, `VOLUME_MOUNT` on the volume          |
| Card removed        | `MEDIA_REMOVAL` on the disk, layout changes                                        |
| Card ejected        | `VOLUME_LOCK` and `VOLUME_UNLOCK` on the volume, then `MEDIA_REMOVAL`              |
| Reader disconnected | `REMOVE_COMPLETE` on all handles, interface and instance removals, no query before |

Properties of the notifications:

- **Duplicates.** A single insertion produces several layout change and mount notifications.
- **Ordering.** The order across devices is not fixed.
- **Self-triggered notifications.** Opening an empty slot or querying its medium makes Windows read
  the disk layout again and produces a layout change notification. Reacting to layout changes with
  a medium query creates a loop.
- **Window messages and WMI.** `WM_DEVICECHANGE` and `Win32_VolumeChangeEvent` report readers being
  connected and disconnected, but not card changes. They are also not available to services.
- **Startup.** Cards that are already inserted when cliphand starts do not produce notifications.

Triggers:

- A card is **ready** after `MEDIA_ARRIVAL` on its slot, once the slot's volume is mounted with a
  filesystem.
- A card is **gone** after `MEDIA_REMOVAL` on its slot, or when the slot is removed.

### Eject requests

Ejecting a card through Explorer or "Safely remove hardware" ejects the medium, not the reader. The
reader and its slots remain present. Windows sends `VOLUME_LOCK` before it attempts to lock the
volume. An application that still has files open on the volume makes the lock fail, and the user
receives a "device in use" message.

- cliphand treats `VOLUME_LOCK` as a request to release the card. It stops the job of that card and
  closes all of its handles on the volume.
- Handles opened only for notifications do not block an eject.

### Identifiers

| Identifier                                     | Identifies | Stability                                                                           |
| ---------------------------------------------- | ---------- | ----------------------------------------------------------------------------------- |
| Disk number                                    | –          | Not stable. Depends on the other connected devices.                                 |
| Instance ID of the USB device                  | Reader     | Contains the serial number. Without a serial number, it is derived from the port.   |
| Location path (`DEVPKEY_Device_LocationPaths`) | Reader     | Stable while the reader stays on the same port and controller.                      |
| Container ID                                   | Reader     | Shared by all device nodes of the reader.                                           |
| LUN (instance ID suffix)                       | Slot       | Stable, defined by the firmware.                                                    |
| Volume GUID, drive letter                      | Slot       | Stable for the slot. Not related to the card.                                       |
| MBR disk signature                             | Card       | Not reliable, often `00000000`.                                                     |
| Volume serial number                           | Card       | Stable until the card is formatted. Not guaranteed to be unique, can be `00000000`. |
| Volume label                                   | Card       | Often not set.                                                                      |

There is no identifier for a single insertion. cliphand assigns its own insertion ID when it
observes a card arriving.

### Media detection

Windows polls removable-media slots itself. Card detection takes less than one second and requires
no configuration.

### Mounting and access

Windows mounts the filesystem of a card automatically. A drive letter is not required: a volume
is accessible through its volume path (`\\?\Volume{GUID}\`).

- **Read-only.** The disk of a slot can be set read-only (`Set-Disk -IsReadOnly`). Writes fail
  with "The media is write protected". Changing the setting dismounts and remounts the volume, so
  all open handles become invalid. The setting is stored per slot and persists across card changes
  and reconnects of the reader. Administrator rights are required.
- **Drive letter.** The drive letter of a slot's volume can be removed (`mountvol /D`). The removal
  is stored per slot and persists across card changes and reconnects of the reader. A volume
  without a drive letter is not shown by Explorer and not reported by WMI or window messages. Handle
  notifications are not affected. Administrator rights are required.
- **Open handles after removal.** When a card is removed, Windows keeps the volume of every open
  file. When a card with the same volume serial number is inserted, the existing handles become
  valid again, also if a different card was inserted in between. A card with a different volume
  serial number makes the handles fail with `ERROR_WRONG_DISK`. Two cards with the same volume
  serial number are therefore not told apart.
- **Concurrent access.** Other programs, such as antivirus software and the search indexer, open
  newly written files on a card. Deleting a file can fail temporarily because it is in use.

### Read errors

When a card is removed during a copy, the media removal notification arrives before the read fails.
The error code indicates the cause:

| Situation               | Error                                                          |
| ----------------------- | -------------------------------------------------------------- |
| Card removed            | `ERROR_NOT_READY` (21)                                         |
| Different card inserted | `ERROR_WRONG_DISK` (34)                                        |
| Reader disconnected     | `ERROR_NO_SUCH_DEVICE` (433), then `ERROR_FILE_INVALID` (1006) |
| Damaged card            | Not verified                                                   |

## Design rules

1. An event is a trigger only. On every event, cliphand reads the current state and reconciles it
   with its known state. Processing the same event more than once has no effect.
2. On startup, cliphand takes a snapshot of all present devices and then follows the event stream.
3. cliphand keeps its own record of known devices, insertions and jobs, and resolves removals
   against it.
4. Cards are accessed read-only while ingesting and writable only for cleaning.
5. When a card is gone, cliphand stops its job and releases all mounts and handles. Every insertion
   gets new mounts and handles. Mounts and handles are never reused across insertions.
6. On startup, cliphand removes leftovers of previous runs, such as mounts, and restores the state
   of its slots.
7. The order of read errors and removal events differs between operating systems and is not relied
   on. After an I/O error, cliphand checks the slot:
   - **Medium gone:** the card was removed. The job is stopped.
   - **Medium present:** the file is unreadable. It is reported as corrupt and the remaining files
     are processed.
8. Deleting files on a card is retried when it fails because another program has the file open.

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

| Concept   | Description                                                                      |
| --------- | -------------------------------------------------------------------------------- |
| Reader    | A card reader added by the user, with a name and a fingerprint                   |
| Slot      | Reader + LUN, with a name                                                        |
| Card      | Identified by volume serial number, label and size                               |
| Insertion | One card in one slot, from insertion to removal, with an ID assigned by cliphand |
| Profile   | Rename pattern, destination, cleaning policy                                     |
| Binding   | Assignment of a profile, e.g. to a slot, ordered by priority                     |

The reader fingerprint consists of vendor ID, product ID, revision, serial number, number of LUNs
and the port path.

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

An adapter per operating system provides a snapshot of the present readers, slots and media as a
tree (reader, slots, media) and a stream of change notifications. It reads device attributes, opens
and closes cards, and applies the system changes described in
[Reader ownership](/cliphand/architecture/reader-ownership/). It does not make decisions.

- **Linux:** udev events, sysfs attributes, own mounts.
- **Windows:** device and handle notifications, device properties, volume paths. The adapter keeps
  one handle per slot disk and volume open and closes it when the device is removed.

### Configuration

Known readers, including their fingerprint and confirmed port, are part of the configuration file
and are written back by the web UI. cliphand keeps no additional persistent state on the host.

## Open points

- Reader types other than USB readers with removable media, such as CFexpress readers, built-in SD
  readers and readers with an internal hub.
- Two identical readers connected at the same time on Windows: how Windows resolves the duplicate
  instance ID.
- Error codes of a damaged card on Linux and Windows.
- Cards with several partitions.
- Docker: access to the host's udev data for reader identification (mounting `/run/udev`), or
  mounting by the host with cliphand watching a directory.
- Resuming an interrupted ingest versus restarting it when a card is inserted again.
