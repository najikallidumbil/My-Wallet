Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\Acer\.gemini\antigravity\brain\ca476315-796a-4766-b29f-9762b3f2295c\.user_uploaded\media_1795600515324_75910b68.jpg'
$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $src.Width
$h = $src.Height

# We will create two versions of adaptive-icon.png to compare:
# Version 1: Padded full squircle on transparent background (scale=680px, safe-zone diameter=625px)
# Version 2: Extracted wallet+bills+coin graphic centered at scale=680px

# Let's inspect the exact pixels of the wallet and coin
# The wallet: White (R > 210, G > 210, B > 210)
# The bills: Cyan (G > 170, B > 220, R < 120)
# The M logo: Navy blue inside the wallet (X between 240 and 580, Y between 380 and 660)
# The blue clasp: Blue tab (X between 600 and 880, Y between 400 and 600)
# The gold coin: Gold (R > 210, G > 140, B < 90)

Write-Host "Analyzing graphic extraction..."
$src.Dispose()
