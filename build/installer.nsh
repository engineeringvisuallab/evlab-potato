; Custom NSIS include for electron-builder (nsis.include). Adds SEPARATE Start Menu + Desktop shortcuts per app,
; each launching the same EVLab Potato.exe with --app=<key> and its own icon (like Word / Excel / PowerPoint).
; Icons come from resources\icons (electron-builder extraResources).
!macro customInstall
  CreateShortCut "$SMPROGRAMS\EVWrite.lnk"   "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "--app=evwrite"   "$INSTDIR\resources\icons\evwrite.ico"   0
  CreateShortCut "$SMPROGRAMS\EVCell.lnk"    "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "--app=evcell"    "$INSTDIR\resources\icons\evcell.ico"    0
  CreateShortCut "$SMPROGRAMS\EVPresent.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "--app=evpresent" "$INSTDIR\resources\icons\evpresent.ico" 0
  CreateShortCut "$DESKTOP\EVWrite.lnk"      "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "--app=evwrite"   "$INSTDIR\resources\icons\evwrite.ico"   0
  CreateShortCut "$DESKTOP\EVCell.lnk"       "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "--app=evcell"    "$INSTDIR\resources\icons\evcell.ico"    0
  CreateShortCut "$DESKTOP\EVPresent.lnk"    "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "--app=evpresent" "$INSTDIR\resources\icons\evpresent.ico" 0
!macroend

!macro customUnInstall
  Delete "$SMPROGRAMS\EVWrite.lnk"
  Delete "$SMPROGRAMS\EVCell.lnk"
  Delete "$SMPROGRAMS\EVPresent.lnk"
  Delete "$DESKTOP\EVWrite.lnk"
  Delete "$DESKTOP\EVCell.lnk"
  Delete "$DESKTOP\EVPresent.lnk"
!macroend
