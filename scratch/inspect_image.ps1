Add-Type -AssemblyName System.Drawing
$imgPath = 'C:\Users\Acer\.gemini\antigravity\brain\ca476315-796a-4766-b29f-9762b3f2295c\.user_uploaded\media_1795600515324_75910b68.jpg'
$img = [System.Drawing.Image]::FromFile($imgPath)
Write-Host "Width: $($img.Width), Height: $($img.Height)"
$img.Dispose()
