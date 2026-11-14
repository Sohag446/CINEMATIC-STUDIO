; ==============================================================================
; CINEMATIC STUDIO — NSIS Lifecycle Hooks for Windows Installer & Uninstaller
; ==============================================================================
; Supported Hooks:
; - NSIS_HOOK_PREINSTALL:   Runs before copying files and creating shortcuts
; - NSIS_HOOK_POSTINSTALL:  Runs after copying files and setting registry keys
; - NSIS_HOOK_PREUNINSTALL: Runs before removing files, registry keys, and shortcuts
; - NSIS_HOOK_POSTUNINSTALL: Runs after files and registry keys are removed
; ==============================================================================

!macro NSIS_HOOK_PREINSTALL
  DetailPrint "CINEMATIC STUDIO: Checking for active application processes..."
  ; Terminate only application-owned processes to release file locks
  nsExec::Exec 'taskkill /F /IM cinematic-studio.exe /T'
  nsExec::Exec 'taskkill /F /IM cinematic-studio-host.exe /T'
!macroend

!macro NSIS_HOOK_POSTINSTALL
  DetailPrint "CINEMATIC STUDIO: Configuring Chrome Native Messaging Host..."

  ; Ensure NativeMessaging directory exists in LocalAppData
  CreateDirectory "$LOCALAPPDATA\CinematicStudio\NativeMessaging"
  CreateDirectory "$LOCALAPPDATA\CinematicStudio\bin"

  ; Copy or stage host binary into LocalAppData bin for reliable discovery
  IfFileExists "$INSTDIR\resources\bin\cinematic-studio-host.exe" 0 +3
    CopyFiles /SILENT "$INSTDIR\resources\bin\cinematic-studio-host.exe" "$LOCALAPPDATA\CinematicStudio\bin\cinematic-studio-host.exe"
    Goto host_copied

  IfFileExists "$INSTDIR\cinematic-studio-host.exe" 0 host_copied
    CopyFiles /SILENT "$INSTDIR\cinematic-studio-host.exe" "$LOCALAPPDATA\CinematicStudio\bin\cinematic-studio-host.exe"

  host_copied:

  ; Determine final host binary path for manifest
  StrCpy $R0 "$INSTDIR\resources\bin\cinematic-studio-host.exe"
  IfFileExists "$R0" write_manifest 0
  StrCpy $R0 "$LOCALAPPDATA\CinematicStudio\bin\cinematic-studio-host.exe"

  write_manifest:
  ; Write Native Messaging Host JSON Manifest
  FileOpen $0 "$LOCALAPPDATA\CinematicStudio\NativeMessaging\com.cinematic.studio.json" w
  FileWrite $0 '{\r$\n'
  FileWrite $0 '  "name": "com.cinematic.studio",\r$\n'
  FileWrite $0 '  "description": "Cinematic Studio Chrome Native Messaging Host",\r$\n'
  ; Use direct formatted path
  FileWrite $0 '  "path": "$LOCALAPPDATA\\CinematicStudio\\bin\\cinematic-studio-host.exe",\r$\n'
  FileWrite $0 '  "type": "stdio",\r$\n'
  FileWrite $0 '  "allowed_origins": [\r$\n'
  FileWrite $0 '    "chrome-extension://olfkacbfbgihonffpmnmnhmfmonfhmpf/"\r$\n'
  FileWrite $0 '  ]\r$\n'
  FileWrite $0 '}\r$\n'
  FileClose $0

  ; Register in Windows Registry under Current User
  WriteRegStr HKCU "Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio" "" "$LOCALAPPDATA\CinematicStudio\NativeMessaging\com.cinematic.studio.json"

  ; Ensure Desktop Shortcut is created
  CreateShortcut "$DESKTOP\Cinematic Studio.lnk" "$INSTDIR\Cinematic Studio.exe" "" "$INSTDIR\Cinematic Studio.exe" 0
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  DetailPrint "CINEMATIC STUDIO: Terminating application background processes..."
  ; Terminate application-owned processes before file removal
  nsExec::Exec 'taskkill /F /IM cinematic-studio.exe /T'
  nsExec::Exec 'taskkill /F /IM cinematic-studio-host.exe /T'

  DetailPrint "CINEMATIC STUDIO: Unregistering Chrome Native Messaging Host..."
  ; Remove HKCU registry registration
  DeleteRegKey HKCU "Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio"

  ; Remove Native Messaging Host manifest
  Delete "$LOCALAPPDATA\CinematicStudio\NativeMessaging\com.cinematic.studio.json"
  RMDir "$LOCALAPPDATA\CinematicStudio\NativeMessaging"

  ; Remove shortcuts
  Delete "$DESKTOP\Cinematic Studio.lnk"
  Delete "$SMPROGRAMS\Cinematic Studio.lnk"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  DetailPrint "CINEMATIC STUDIO: Preserving user projects and creative media by default."
  ; NOTICE: User projects in C:\CinematicStudio\Projects and %LOCALAPPDATA%\CinematicStudio\cinematic_studio.db
  ; are intentionally preserved to prevent accidental data loss during upgrades or reinstallations.
  ; Only application-owned helper binaries in bin are cleaned:
  Delete "$LOCALAPPDATA\CinematicStudio\bin\cinematic-studio-host.exe"
  RMDir "$LOCALAPPDATA\CinematicStudio\bin"
!macroend
