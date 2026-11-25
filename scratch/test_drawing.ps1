Add-Type -AssemblyName System.Drawing

$bmp = New-Object System.Drawing.Bitmap 100, 100
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::Transparent)
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::Blue)
$g.FillEllipse($brush, 10, 10, 80, 80)
$brush.Dispose()
$g.Dispose()

$testOut = "$PSScriptRoot\test_drawing.png"
$bmp.Save($testOut, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

if (Test-Path $testOut) {
    Write-Host "Success! Generated $testOut"
    Remove-Item $testOut
}
