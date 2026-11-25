Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\Acer\.gemini\antigravity\brain\ca476315-796a-4766-b29f-9762b3f2295c\.user_uploaded\media_1795600515324_75910b68.jpg'
$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $src.Width
$h = $src.Height

# Clean icon: remove black corners
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

# Scale cleanIcon to 760px and center in 1024x1024
$scale = 768
$adaptive = New-Object System.Drawing.Bitmap 1024, 1024, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($adaptive)
$g.Clear([System.Drawing.Color]::Transparent)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

$offX = [int]((1024 - $scale) / 2)
$offY = [int]((1024 - $scale) / 2)
$g.DrawImage($cleanIcon, $offX, $offY, $scale, $scale)
$g.Dispose()

# Now simulate Android circular mask (diameter 683px = radius 341px from center 512,512)
# Check every pixel in the 683px circle
$maskedCircle = New-Object System.Drawing.Bitmap 1024, 1024, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$transparentPixelCountInsideCircle = 0
$r = 341.5
$centerX = 512
$centerY = 512

for ($y = 0; $y -lt 1024; $y++) {
    for ($x = 0; $x -lt 1024; $x++) {
        $dist = [Math]::Sqrt(($x - $centerX)*($x - $centerX) + ($y - $centerY)*($y - $centerY))
        if ($dist -le $r) {
            $p = $adaptive.GetPixel($x, $y)
            if ($p.A -eq 0) {
                $transparentPixelCountInsideCircle++
            }
            $maskedCircle.SetPixel($x, $y, $p)
        } else {
            $maskedCircle.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}

Write-Host "Scale: $scale x $scale (Offset: $offX, $offY)"
Write-Host "Transparent pixels inside 683px circle mask: $transparentPixelCountInsideCircle"

# If transparentPixelCountInsideCircle > 0, then the circle mask caught some transparent corner
# If transparentPixelCountInsideCircle == 0, the circle mask is 100% filled with the blue gradient!

$testPath = "C:\Users\Acer\Downloads\MyProjects\My-Wallet\scratch\simulated_circle_mask.png"
$maskedCircle.Save($testPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved simulated circular mask to $testPath"

$maskedCircle.Dispose()
$adaptive.Dispose()
$cleanIcon.Dispose()
$src.Dispose()
