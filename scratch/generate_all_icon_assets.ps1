Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\Acer\.gemini\antigravity\brain\ca476315-796a-4766-b29f-9762b3f2295c\.user_uploaded\media_1795600515324_75910b68.jpg'
$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $src.Width
$h = $src.Height

Write-Host "Source image loaded: ${w}x${h}"

# 1. Clean squircle icon: remove black corners via flood-fill
$cleanIcon = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$visited = New-Object 'bool[,]' $w, $h
$queue = New-Object System.Collections.Generic.Queue[System.Drawing.Point]

$corners = @(
    (New-Object System.Drawing.Point 0, 0),
    (New-Object System.Drawing.Point ($w - 1), 0),
    (New-Object System.Drawing.Point 0, ($h - 1)),
    (New-Object System.Drawing.Point ($w - 1), ($h - 1))
)
foreach ($c in $corners) {
    $queue.Enqueue($c)
    $visited[$c.X, $c.Y] = $true
}

$dxs = @(-1, 1, 0, 0)
$dys = @(0, 0, -1, 1)

while ($queue.Count -gt 0) {
    $p = $queue.Dequeue()
    for ($i = 0; $i -lt 4; $i++) {
        $nx = $p.X + $dxs[$i]
        $ny = $p.Y + $dys[$i]
        if ($nx -ge 0 -and $nx -lt $w -and $ny -ge 0 -and $ny -lt $h) {
            if (-not $visited[$nx, $ny]) {
                $pix = $src.GetPixel($nx, $ny)
                if ($pix.R -lt 15 -and $pix.G -lt 15 -and $pix.B -lt 15) {
                    $visited[$nx, $ny] = $true
                    $queue.Enqueue((New-Object System.Drawing.Point $nx, $ny))
                }
            }
        }
    }
}

for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        if ($visited[$x, $y]) {
            $cleanIcon.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        } else {
            $cleanIcon.SetPixel($x, $y, $src.GetPixel($x, $y))
        }
    }
}

# Directories
$assetsDir = 'C:\Users\Acer\Downloads\MyProjects\My-Wallet\assets'
$publicDir = 'C:\Users\Acer\Downloads\MyProjects\My-Wallet\public'
if (-not (Test-Path $assetsDir)) { New-Item -ItemType Directory -Path $assetsDir -Force }
if (-not (Test-Path $publicDir)) { New-Item -ItemType Directory -Path $publicDir -Force }

# 1. assets/icon.png (1024x1024)
$iconPath = "$assetsDir\icon.png"
$cleanIcon.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "✓ Created $iconPath"

# 2. assets/adaptive-icon.png (1024x1024 with 768px centered artwork for Android safe-zone)
$scale = 768
$adaptive = New-Object System.Drawing.Bitmap 1024, 1024, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($adaptive)
$g.Clear([System.Drawing.Color]::Transparent)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

$offX = [int]((1024 - $scale) / 2)
$offY = [int]((1024 - $scale) / 2)
$g.DrawImage($cleanIcon, $offX, $offY, $scale, $scale)
$g.Dispose()

$adaptivePath = "$assetsDir\adaptive-icon.png"
$adaptive.Save($adaptivePath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "✓ Created $adaptivePath (Scale: ${scale}x${scale}, Safe-zone padded)"

# 3. assets/adaptive-icon-background.png (1024x1024 full-bleed blue gradient)
$bg = New-Object System.Drawing.Bitmap 1024, 1024, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gbg = [System.Drawing.Graphics]::FromImage($bg)
$rect = New-Object System.Drawing.Rectangle 0, 0, 1024, 1024
$topColor = [System.Drawing.Color]::FromArgb(255, 1, 147, 246)   # #0193F6
$botColor = [System.Drawing.Color]::FromArgb(255, 1, 33, 120)    # #012178
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $topColor, $botColor, 45.0
$gbg.FillRectangle($brush, $rect)
$brush.Dispose()
$gbg.Dispose()

$bgPath = "$assetsDir\adaptive-icon-background.png"
$bg.Save($bgPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "✓ Created $bgPath"
$bg.Dispose()

# Helper function to generate resized PNG
function Create-ResizedPng($srcBmp, $destPath, $size) {
    $res = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $gr = [System.Drawing.Graphics]::FromImage($res)
    $gr.Clear([System.Drawing.Color]::Transparent)
    $gr.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gr.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gr.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $gr.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $gr.DrawImage($srcBmp, 0, 0, $size, $size)
    $gr.Dispose()
    $res.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $res.Dispose()
    Write-Host "✓ Created $destPath (${size}x${size})"
}

# 4. assets/favicon.png (48x48)
Create-ResizedPng $cleanIcon "$assetsDir\favicon.png" 48

# 5. public/favicon.png (48x48)
Create-ResizedPng $cleanIcon "$publicDir\favicon.png" 48

# 6. public/icon-192.png (192x192)
Create-ResizedPng $cleanIcon "$publicDir\icon-192.png" 192

# 7. public/icon-512.png (512x512)
Create-ResizedPng $cleanIcon "$publicDir\icon-512.png" 512

$cleanIcon.Dispose()
$adaptive.Dispose()
$src.Dispose()

Write-Host "`nAll icon assets successfully generated!"
