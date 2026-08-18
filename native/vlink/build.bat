@echo off
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%"
set "BUILD=%ROOT%build"
set "SRC=%ROOT%src"

if not exist "%BUILD%" mkdir "%BUILD%"

set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
if not exist "%VSWHERE%" (
  echo vswhere.exe not found. Install Visual Studio 2022 Build Tools.
  exit /b 1
)

for /f "usebackq tokens=*" %%i in (`"%VSWHERE%" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do set "VS=%%i"
if not defined VS (
  echo MSVC toolset not found.
  exit /b 1
)

call "%VS%\VC\Auxiliary\Build\vcvars64.bat" >nul
if errorlevel 1 exit /b 1

set "COMMON=%SRC%\vlink_protocol.cpp %SRC%\vlink_server.cpp"
set "CFLAGS=/nologo /O2 /EHsc /W3 /DUNICODE /D_UNICODE /D_CRT_SECURE_NO_WARNINGS /I%SRC% /Fo%BUILD%\\"

echo Building VLink.vst3 ...
cl %CFLAGS% /LD %SRC%\vlink_factory.cpp %SRC%\vlink_processor.cpp %COMMON% /Fe:%BUILD%\VLink.dll /link /DLL ws2_32.lib
if errorlevel 1 exit /b 1

set "BUNDLE=%BUILD%\VLink.vst3\Contents\x86_64-win"
if not exist "%BUNDLE%" mkdir "%BUNDLE%"
copy /Y "%BUILD%\VLink.dll" "%BUNDLE%\VLink.vst3" >nul
copy /Y "%BUILD%\VLink.dll" "%BUILD%\VLink.vst3\VLink.vst3" >nul

echo Building VLinkNode.exe ...
cl %CFLAGS% %SRC%\vlink_standalone.cpp %COMMON% /Fe:%BUILD%\VLinkNode.exe /link ws2_32.lib
if errorlevel 1 exit /b 1

del /Q "%BUILD%\*.obj" 2>nul
echo.
echo Wrote:
echo   %BUILD%\VLink.vst3
echo   %BUILD%\VLinkNode.exe
endlocal
