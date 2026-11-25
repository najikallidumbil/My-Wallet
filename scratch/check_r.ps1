Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\Acer\.gemini\antigravity\brain\ca476315-796a-4766-b29f-9762b3f2295c\.user_uploaded\media_1795600515324_75910b68.jpg'
$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $src.Width
$h = $src.Height

# Let's inspect the boundary between background and the wallet/bills/coin
# In the original image:
# The background is always blue: (R is low, G is medium, B is high).
# Let's check the maximum R in the background outside the wallet:
# In sample_gradient:
# Top-Left: R=0, G=157, B=254
# Top-Center: R=0, G=133, B=238
# Top-Right: R=1, G=97, B=217
# Bottom-Right: R=1, G=34, B=127
# Notice: In the background, R is ALMOST ALWAYS <= 20!
# Whereas:
# The white wallet has R > 200, G > 200, B > 200.
# The gold coin has R > 200, G > 140, B < 100.
# The cyan bills have R > 40, G > 180, B > 220.
# The dark blue 'M' logo has R < 30, but it is surrounded by the white wallet (X in 240..580, Y in 380..660).
# The blue clasp has X in 630..880, Y in 400..600, with a white button inside!

# Let's test checking what pixels have R > 30 outside the wallet
$highRCount = 0
for ($y = 0; $y -lt 1024; $y += 4) {
    for ($x = 0; $x -lt 1024; $x += 4) {
        $p = $src.GetPixel($x, $y)
        if ($p.R -gt 30) {
            $highRCount++
        }
    }
}
Write-Host "Pixels with R > 30: $highRCount out of $(256*256)"
$src.Dispose()
