Add-Type -AssemblyName System.Drawing
$imgPath = 'C:\Users\Acer\.gemini\antigravity\brain\ca476315-796a-4766-b29f-9762b3f2295c\.user_uploaded\media_1795600515324_75910b68.jpg'
$img = [System.Drawing.Bitmap]::FromFile($imgPath)

# Sample diagonal from (0,0) towards (512,512) to see where the squircle starts
for ($d = 0; $d -lt 300; $d += 10) {
    $p = $img.GetPixel($d, $d)
    Write-Host "Diag ($d, $d): R=$($p.R) G=$($p.G) B=$($p.B)"
}
$img.Dispose()
