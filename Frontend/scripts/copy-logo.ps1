# Copia el logo del casco a public/ (ejecutar una vez desde la raíz del repo)
$src = Join-Path $PSScriptRoot "..\..\..\.cursor\projects\c-Users-ROBOTICA-Documents-CampusSocial\assets\c__Users_ROBOTICA_AppData_Roaming_Cursor_User_workspaceStorage_bc3420eed26cd17be1bef7263bc62f38_images_image-150623c9-7c78-404e-a16c-754dc56f2762.png"
$dstDir = Join-Path $PSScriptRoot "..\public"
$dst = Join-Path $dstDir "logo.png"
if (-not (Test-Path $src)) {
  Write-Host "No se encontró la imagen en Cursor assets. Copia manualmente tu PNG a Fontend/public/logo.png"
  exit 1
}
New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
Copy-Item -LiteralPath $src -Destination $dst -Force
Write-Host "Logo copiado a $dst"
