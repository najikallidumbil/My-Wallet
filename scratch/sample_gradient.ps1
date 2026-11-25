Add-Type -AssemblyName System.Drawing
$imgPath = 'C:\Users\Acer\.gemini\antigravity\brain\ca476315-796a-4766-b29f-9762b3f2295c\.user_uploaded\media_1795600515324_75910b68.jpg'
$img = [System.Drawing.Bitmap]::FromFile($imgPath)

$points = @(
    @{ Name="Top-Center"; X=512; Y=50 },
    @{ Name="Top-Left"; X=200; Y=100 },
    @{ Name="Top-Right"; X=824; Y=100 },
    @{ Name="Left-Edge"; X=80; Y=512 },
    @{ Name="Right-Edge"; X=944; Y=512 },
    @{ Name="Bottom-Center"; X=512; Y=970 },
    @{ Name="Bottom-Left"; X=200; Y=900 },
    @{ Name="Bottom-Right"; X=824; Y=900 }
)

foreach ($pt in $points) {
    $c = $img.GetPixel($pt.X, $pt.Y)
    $hex = "#{0:X2}{1:X2}{2:X2}" -f $c.R, $c.G, $c.B
    Write-Host "$($pt.Name) at ($($pt.X), $($pt.Y)): $hex (R=$($c.R), G=$($c.G), B=$($c.B))"
}

$img.Dispose()
