# PhoneCam

**Your Android phone as a live camera for a projector or a big screen: on Windows, over a USB cable, with nothing to install on the phone.**

PhoneCam is a small portable Windows app in the spirit of Camo Studio, cut down to what a classroom needs: plug the phone in, point it at a notebook, a calculator or a lab bench, and project the picture full screen with low latency.

> The user interface is currently in Italian. The main labels are translated in [Using the app](#using-the-app).

## Features

- **Plug and play**: detects the phone as soon as it is connected with USB debugging on, and starts the camera by itself.
- **Every lens the phone exposes**: main, ultra-wide, macro and front cameras, each with the resolutions it declares (16:9 and 4:3, up to 4K).
- **Frame rate and quality presets** (4 to 32 Mbit/s).
- **Continuous autofocus**, handled by the phone.
- **Zoom** and **torch** control.
- **Rotate, mirror, fit or fill** the picture.
- **Full screen** for projectors, with a side panel that can be hidden or floated over the image.
- **Keeps streaming with the phone screen off.**
- **Remembers your settings**, and sets aside lenses the phone refuses to stream (one click brings them back).
- **Portable**: one folder, no installer, no .NET installation needed.

## Requirements

| | |
|---|---|
| **PC** | Windows 10 or 11, 64-bit |
| | Microsoft Edge WebView2 Runtime, already present on Windows 11 and on up-to-date Windows 10 |
| | Windows "N" editions also need the Media Feature Pack, for H.264 decoding |
| **Phone** | Android 12 or newer |
| | Developer options → **USB debugging** turned on |
| | A USB cable that carries data |

## Getting started

1. Download `PhoneCam-<version>-win-x64.zip` from the [latest release](https://github.com/vittop89/PhoneCam/releases/latest) and extract it anywhere, a USB stick included.
2. On the phone, turn on **USB debugging**: Settings → About phone → tap *Build number* seven times, then Developer options → USB debugging.
3. Connect the phone to the PC and run `PhoneCam.exe`.
4. The first time on each PC the phone asks **"Allow USB debugging?"**: tap *Allow*, ticking *Always allow from this computer*.
5. The picture appears within a few seconds. Double-click it or press **F11** for full screen.

While PhoneCam is running, keep closed:

- the phone's own Camera app, which has priority over PhoneCam;
- other programs that use adb, such as Camo Studio, Android Studio or a different version of scrcpy.

The PC's own webcams are not used and do not get in the way.

## Using the app

| Italian label | Meaning |
|---|---|
| Obiettivo | Lens |
| Risoluzione, FPS, Qualità | Resolution, frame rate, quality |
| Zoom e luce, Torcia | Zoom and light, torch |
| Ruota, Specchia, Riempi / Adatta | Rotate, mirror, fill / fit |
| Schermo intero | Full screen |
| In diretta | Live |

### Keyboard shortcuts

| Key | Action |
|---|---|
| F11, or double-click on the image | Full screen on / off |
| Esc | Leave full screen |
| P | Show or hide the side panel |
| + / − | Zoom in / out |
| R | Rotate by 90° |
| M | Mirror |
| A | Fit / fill |

Changing lens, resolution, frame rate or quality restarts the stream, which takes a second or two. Zoom, torch and the image controls apply immediately.

## Troubleshooting

| What you see | What to do |
|---|---|
| *Collega il telefono con il cavo USB* | The phone is not detected: use a cable that carries data, try another port, check that USB debugging is on. |
| *Sul telefono tocca «Consenti»…* | Accept the USB debugging prompt on the phone. |
| *La fotocamera è occupata da un'altra app…* | Close the phone's Camera app or any other app using the camera. PhoneCam retries by itself. |
| A lens disappears from the list, with a notice | The phone refused to stream that lens: some manufacturers keep extra lenses for their own camera app. *Mostra di nuovo l'obiettivo escluso* brings it back. |
| *Il telefono non riesce a trasmettere con queste impostazioni* | The phone's encoder rejected the resolution or quality: choose a lower one. |
| Windows SmartScreen warns about the app | The executable is not code-signed: *More info* → *Run anyway*. |
| Black picture and 0 fps | Update or install the WebView2 Runtime; on Windows N install the Media Feature Pack. |

Settings and a diagnostic log are kept in `%LOCALAPPDATA%\PhoneCam` (`settings.json`, `phonecam.log`).

## How it works

```
 Android phone                                  Windows PC
┌───────────────────────────────┐   USB, adb   ┌──────────────────────────────────────┐
│ scrcpy-server (app_process)   │ ───────────► │ PhoneCam.exe (WinForms)              │
│ camera → hardware H.264       │ ◄─────────── │   adb tunnel, scrcpy protocol parser │
└───────────────────────────────┘  zoom, torch │ WebView2 page                        │
                                               │   WebCodecs H.264 decoding → canvas  │
                                               └──────────────────────────────────────┘
```

- When the phone connects, PhoneCam copies [scrcpy-server](https://github.com/Genymobile/scrcpy) to it and starts it through adb, with the camera as video source. Nothing is installed on the phone, and the server deletes its own file once started.
- The phone encodes H.264 in hardware; the stream travels through an adb forward tunnel over the USB cable.
- On Windows, PhoneCam parses the scrcpy 4.1 protocol and hands each packet to a WebView2 page, which decodes it with WebCodecs (hardware accelerated) and draws it on a canvas.
- Zoom and torch commands go through the scrcpy control channel.

PhoneCam shows the camera on screen; it does not provide a virtual webcam for Teams, Zoom or Meet.

## Tested on

- realme GT Neo 3 150W (RMX3563), Android 14, with Windows 11: 1280×720, 1920×1080 and 3840×2160 at 30 fps. One extra rear lens is reserved by the phone and is set aside automatically.

Other phones should work when their manufacturer lets adb use the camera. Reports are welcome in the [issues](https://github.com/vittop89/PhoneCam/issues).

## Building from source

Requirements: Windows, the .NET 8 SDK or newer, PowerShell.

```powershell
# Download scrcpy 4.1 (adb + scrcpy-server) and verify its SHA-256
.\scripts\fetch-scrcpy.ps1

# Build and run
dotnet run --project src\PhoneCam

# Portable self-contained build in dist\ (folder and zip)
.\scripts\publish.ps1
```

Useful switches:

- `PhoneCam.exe --debug` enables the WebView2 developer tools.
- `PhoneCam.exe --selftest <clip.h264> <result.txt>` plays an H.264 file through the decoder without a phone and writes what the page decoded. FFmpeg can make a test clip:
  `ffmpeg -f lavfi -i testsrc2=size=1920x1080:rate=30 -t 5 -c:v libx264 -bf 0 -g 60 -f h264 clip.h264`

## License

PhoneCam is released under the [MIT License](LICENSE).
The portable release bundles scrcpy-server and adb (Apache License 2.0), the .NET runtime (MIT) and the WebView2 SDK (Microsoft, BSD-style license): see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

PhoneCam is not affiliated with Genymobile, Google, Microsoft, Reincubate or realme.
