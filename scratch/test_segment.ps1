Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\Acer\.gemini\antigravity\brain\ca476315-796a-4766-b29f-9762b3f2295c\.user_uploaded\media_1795600515324_75910b68.jpg'
$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $src.Width
$h = $src.Height

# Let's inspect the boundary of the wallet, bills, clasp, and coin
# Let's see if we can do a precise extraction:
# We know the wallet + bills + clasp + coin is contained within X in [130, 880], Y in [120, 850]
# Outside this bounding box, everything is background blue or corner black.
Write-Host "Width: $w, Height: $h"
$src.Dispose()
