Add-Type -AssemblyName System.Drawing
$imgPath = 'C:\Users\Acer\.gemini\antigravity\brain\ca476315-796a-4766-b29f-9762b3f2295c\.user_uploaded\media_1795600515324_75910b68.jpg'
$img = [System.Drawing.Bitmap]::FromFile($imgPath)

for ($x = 120; $x -le 160; $x += 2) {
    $p = $img.GetPixel($x, 500)
    Write-Host ("X=" + $x + ": R=" + $p.R + " G=" + $p.G + " B=" + $p.B)
}

$img.Dispose()
