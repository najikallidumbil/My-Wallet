Add-Type -AssemblyName System.Drawing
$imgPath = 'C:\Users\Acer\.gemini\antigravity\brain\ca476315-796a-4766-b29f-9762b3f2295c\.user_uploaded\media_1795600515324_75910b68.jpg'
$img = [System.Drawing.Bitmap]::FromFile($imgPath)

# Check bounding box of non-black pixels (R+G+B > 20)
$minX = 1024; $maxX = 0; $minY = 1024; $maxY = 0

for ($y = 0; $y -lt 1024; $y += 4) {
    for ($x = 0; $x -lt 1024; $x += 4) {
        $p = $img.GetPixel($x, $y)
        if (($p.R + $p.G + $p.B) -gt 30) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

Write-Host "Non-black bounding box: X=[$minX, $maxX], Y=[$minY, $maxY]"
Write-Host "Width: $($maxX - $minX), Height: $($maxY - $minY)"

# Check bounding box of the white wallet (R > 200, G > 200, B > 200)
$wMinX = 1024; $wMaxX = 0; $wMinY = 1024; $wMaxY = 0
for ($y = 0; $y -lt 1024; $y += 4) {
    for ($x = 0; $x -lt 1024; $x += 4) {
        $p = $img.GetPixel($x, $y)
        if ($p.R -gt 200 -and $p.G -gt 200 -and $p.B -gt 200) {
            if ($x -lt $wMinX) { $wMinX = $x }
            if ($x -gt $wMaxX) { $wMaxX = $x }
            if ($y -lt $wMinY) { $wMinY = $y }
            if ($y -gt $wMaxY) { $wMaxY = $y }
        }
    }
}
Write-Host "White wallet bounding box: X=[$wMinX, $wMaxX], Y=[$wMinY, $wMaxY]"
Write-Host "Wallet Width: $($wMaxX - $wMinX), Wallet Height: $($wMaxY - $wMinY)"

$img.Dispose()
