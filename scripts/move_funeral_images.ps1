$src='templates\funeral'
$dst='assets\images\funeral'
New-Item -ItemType Directory -Force -Path $dst | Out-Null
$map = @{
  'pexels-ud007-8284462.jpg' = 'hero-portrait.jpg'
  'pexels-ud007-8284462 copy.jpg' = 'hero-portrait-2.jpg'
  'old man1.jpg' = 'portrait-oldman.jpg'
  'gp.jpg' = 'portrait-gp.jpg'
  'candle.jpg' = 'candle-small.jpg'
}
foreach($k in $map.Keys){
  $srcPath = Join-Path $src $k
  if(Test-Path $srcPath){
    $dest = Join-Path $dst $map[$k]
    Move-Item -LiteralPath $srcPath -Destination $dest -Force
    Write-Output "moved: $k -> $dest"
  } else {
    Write-Output "not found: $k"
  }
}