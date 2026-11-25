Add-Type -AssemblyName System.Drawing
$imgPath = 'C:\Users\Acer\.gemini\antigravity\brain\ca476315-796a-4766-b29f-9762b3f2295c\.user_uploaded\media_1795600515324_75910b68.jpg'
$img = [System.Drawing.Bitmap]::FromFile($imgPath)

# Check top-most pixel of the wallet + bills
$topY = 1024
$botY = 0
$leftX = 1024
$rightX = 0

for ($y = 0; $y -lt 1024; $y++) {
    for ($x = 0; $x -lt 1024; $x++) {
        $p = $img.GetPixel($x, $y)
        # Check if NOT the blue background
        # Blue background has: R < 30 (except very top/bottom), and G between 40 and 160, B between 100 and 255.
        # But wallet is white (R > 200, G > 200, B > 200), bills are bright cyan (R > 50, G > 180, B > 230),
        # clasp is medium blue with white circle, coin is gold (R > 200, G > 150).
        $isWalletOrChild = ($p.R -gt 200 -and $p.G -gt 200 -and $p.B -gt 200) -or # White wallet / circle
                           ($p.R -gt 50 -and $p.G -gt 180 -and $p.B -gt 230) -or # Cyan bills
                           ($p.R -gt 200 -and $p.G -gt 140 -and $p.B -lt 100) -or # Gold coin
                           ($p.R -lt 50 -and $p.G -lt 60 -and $p.B -gt 100 -and $x -gt 200 -and $x -lt 600 -and $y -gt 350 -and $y -lt 650) # Dark M logo

        if ($isWalletOrChild) {
            if ($y -lt $topY) { $topY = $y }
            if ($y -gt $botY) { $botY = $y }
            if ($x -lt $leftX) { $leftX = $x }
            if ($x -gt $rightX) { $rightX = $x }
        }
    }
}

Write-Host "Overall graphic bounds: X=[$leftX, $rightX], Y=[$topY, $botY]"
Write-Host "Total Graphic Width: $($rightX - $leftX), Height: $($botY - $topY)"

$img.Dispose()
