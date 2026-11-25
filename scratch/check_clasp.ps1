Add-Type -AssemblyName System.Drawing
$imgPath = 'C:\Users\Acer\.gemini\antigravity\brain\ca476315-796a-4766-b29f-9762b3f2295c\.user_uploaded\media_1795600515324_75910b68.jpg'
$src = [System.Drawing.Bitmap]::FromFile($imgPath)

# Sample clasp horizontally at Y=500 from X=600 to X=900
for ($x = 620; $x -le 900; $x += 10) {
    $p = $src.GetPixel($x, 500)
    Write-Host ("X=" + $x + ": R=" + $p.R + " G=" + $p.G + " B=" + $p.B)
}
$src.Dispose()
