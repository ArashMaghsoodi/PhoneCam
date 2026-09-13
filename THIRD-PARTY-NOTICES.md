# Third-party notices

PhoneCam's own code is released under the [MIT License](LICENSE).
The release executable also contains the following third-party components, redistributed unmodified.
Those that must exist as files are unpacked on first start into `%LOCALAPPDATA%\PhoneCam\app\<build>\`,
together with this notice and PhoneCam's license.

## scrcpy-server 4.1

- Files: `tools/scrcpy-server`
- Project: <https://github.com/Genymobile/scrcpy>
- Copyright (C) 2018 Genymobile, Copyright (C) 2018-2026 Romain Vimont
- License: Apache License 2.0. The full text is included as `tools/LICENSE-scrcpy.txt`
  and at <https://www.apache.org/licenses/LICENSE-2.0>.

PhoneCam starts this server on the phone through adb and talks to it with its own client; the server itself is not modified.

## Android Debug Bridge (adb)

- Files: `tools/adb.exe`, `tools/AdbWinApi.dll`, `tools/AdbWinUsbApi.dll`
- Origin: Android SDK Platform-Tools 37.0.0, as shipped in the scrcpy 4.1 Windows release
  (`scrcpy-win64-v4.1.zip`, SHA-256 `5b12172b3264b2889f4583ee64752ce832e29bc8b1089dca81093459697165db`)
- Source: part of the Android Open Source Project, <https://android.googlesource.com/platform/packages/modules/adb/>
- License: Apache License 2.0

## .NET runtime and Windows Forms

- Bundled inside `PhoneCam.exe` (self-contained build)
- Copyright (c) .NET Foundation and Contributors
- License: MIT, <https://github.com/dotnet/runtime/blob/main/LICENSE.TXT> and <https://github.com/dotnet/winforms/blob/main/LICENSE.TXT>
- Their own third-party notices: <https://github.com/dotnet/runtime/blob/main/THIRD-PARTY-NOTICES.TXT>

## Microsoft Edge WebView2 SDK 1.0.4191.47

- The managed wrappers are bundled inside `PhoneCam.exe`; `webview2/WebView2Loader.dll` is unpacked on first start.
  The WebView2 Runtime itself is not included: PhoneCam uses the one installed in Windows.
- License:

```
Copyright (C) Microsoft Corporation. All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

   * Redistributions of source code must retain the above copyright
notice, this list of conditions and the following disclaimer.
   * Redistributions in binary form must reproduce the above
copyright notice, this list of conditions and the following disclaimer
in the documentation and/or other materials provided with the
distribution.
   * The name of Microsoft Corporation, or the names of its contributors
may not be used to endorse or promote products derived from this
software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

PhoneCam is an independent project and is not affiliated with or endorsed by Genymobile, Google, Microsoft, Reincubate or realme.
