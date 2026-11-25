Add-Type -AssemblyName System.Drawing
$imgPath = 'C:\Users\Acer\.gemini\antigravity\brain\ca476315-796a-4766-b29f-9762b3f2295c\.user_uploaded\media_1795600515324_75910b68.jpg'
$img = [System.Drawing.Bitmap]::FromFile($imgPath)

Write-Host "Pixel (0,0): $($img.GetPixel(0,0))"
Write-Host "Pixel (512,10): $($img.GetPixel(512,10))"
Write-Host "Pixel (50,50): $($img.GetPixel(50,50))"
Write-Host "Pixel (512,512): $($img.GetPixel(512,512))"
Write-Host "Pixel (10,512): $($img.GetPixel(10,512))"
Write-Host "Pixel (1014,512): $($img.GetPixel(1014,512))"
Write-Host "Pixel (512,1014): $($img.GetPixel(512,1014))"
Write-Host "Pixel (1023,1023): $($img.GetPixel(1023,1023))"

$img.Dispose()
