Add-Type -AssemblyName System.Drawing
$imgPath = 'C:\Users\Acer\.gemini\antigravity\brain\ca476315-796a-4766-b29f-9762b3f2295c\.user_uploaded\media_1795600515324_75910b68.jpg'
$img = [System.Drawing.Bitmap]::FromFile($imgPath)

# Test flood fill from 4 corners
$w = $img.Width
$h = $img.Height
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

$count = 0
while ($queue.Count -gt 0) {
    $p = $queue.Dequeue()
    $count++
    
    $dxs = @(-1, 1, 0, 0)
    $dys = @(0, 0, -1, 1)
    
    for ($i = 0; $i -lt 4; $i++) {
        $nx = $p.X + $dxs[$i]
        $ny = $p.Y + $dys[$i]
        
        if ($nx -ge 0 -and $nx -lt $w -and $ny -ge 0 -and $ny -lt $h) {
            if (-not $visited[$nx, $ny]) {
                $pix = $img.GetPixel($nx, $ny)
                # If dark black (outside corner)
                if ($pix.R -lt 15 -and $pix.G -lt 15 -and $pix.B -lt 15) {
                    $visited[$nx, $ny] = $true
                    $queue.Enqueue((New-Object System.Drawing.Point $nx, $ny))
                }
            }
        }
    }
}

Write-Host "Total black corner pixels identified: $count out of $($w*$h)"
$img.Dispose()
