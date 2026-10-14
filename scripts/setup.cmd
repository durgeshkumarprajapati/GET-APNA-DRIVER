@echo off
REM Double-click launcher for Windows: runs setup.ps1 without fighting
REM PowerShell's default execution-policy restrictions.
REM Any arguments you pass to this .cmd are forwarded as-is, e.g.:
REM   scripts\setup.cmd -Yes -SkipSeed
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1" %*
