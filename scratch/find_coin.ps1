Add-Type -AssemblyName System.Drawing
$imgPath = 'C:\Users\Acer\.gemini\antigravity\brain\ca476315-796a-4766-b29f-9762b3f2295c\.user_uploaded\media_1795600515324_75910b68.jpg'
$img = [System.Drawing.Bitmap]::FromFile($imgPath)

$cMinX = 1024; $cMaxX = 0; $cMinY = 1024; $cMaxY = 0
for ($y = 0; $y -lt 1024; $y += 4) {
    for ($x = 0; $x -lt 1024; $x += 4) {
        $p = $img.GetPixel($x, $y)
        # Gold/yellow coin
        if ($p.R -gt 220 -and $p.G -gt 160 -and $p.B -lt 80) {
            if ($x -lt $cMinX) { $cMinX = $x }
            if ($x -gt $cMaxX) { $cMaxX = $x }
            if ($y -lt $cMinY) { $cMinY = $y }
            if ($y -gt $cMaxY) { $cMaxY = $y }
        }
    }
}
Write-Host "Rupee coin bounding box: X=[$cMinX, $cMaxX], Y=[$cMinY, $cMaxY]"

$img.Dispose()
