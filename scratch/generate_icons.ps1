Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\Acer\.gemini\antigravity\brain\ca476315-796a-4766-b29f-9762b3f2295c\.user_uploaded\media_1795600515324_75910b68.jpg'
$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $src.Width
$h = $src.Height

# 1. Create clean 1024x1024 icon with transparent corners (flood-fill outside squircle)
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

# Ensure destination directory exists
$assetsDir = 'C:\Users\Acer\Downloads\MyProjects\My-Wallet\assets'
if (-not (Test-Path $assetsDir)) { New-Item -ItemType Directory -Path $assetsDir -Force }

# Save assets/icon.png
$iconPath = "$assetsDir\icon.png"
$cleanIcon.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Generated $iconPath"

# 2. Generate Option B: Padded Squircle inside 1024x1024 canvas (safe-zone diameter 66-72dp = ~720px)
# Target scaled size = 730px
$targetSize = 730
$padIcon = New-Object System.Drawing.Bitmap 1024, 1024, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($padIcon)
$g.Clear([System.Drawing.Color]::Transparent)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

$offsetX = [int]((1024 - $targetSize) / 2)
$offsetY = [int]((1024 - $targetSize) / 2)
$destRect = New-Object System.Drawing.Rectangle $offsetX, $offsetY, $targetSize, $targetSize
$g.DrawImage($cleanIcon, $destRect, 0, 0, $w, $h, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

$adaptivePaddedPath = "$assetsDir\adaptive-icon-padded.png"
$padIcon.Save($adaptivePaddedPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Generated $adaptivePaddedPath"

# Check how a circular mask of diameter 72% (736px) cuts the padded icon vs full icon
Write-Host "Offset: $offsetX, Target Size: $targetSize (Radius from center: $([int]($targetSize/2))px)"

$padIcon.Dispose()
$cleanIcon.Dispose()
$src.Dispose()
