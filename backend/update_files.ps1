$P = "C:\Users\user\Desktop\mandeles-next"
$D = "C:\Users\user\Downloads"

Write-Host "Mandeles - Updating files" -ForegroundColor Cyan

$u = 0

function cp1($src, $dst) {
    if (Test-Path $src) {
        $dir = Split-Path $dst
        if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        Copy-Item $src $dst -Force
        Write-Host "[OK] $([IO.Path]::GetFileName($src))" -ForegroundColor Green
        $script:u++
    }
}

cp1 "$D\prisma.ts"          "$P\lib\prisma.ts"
cp1 "$D\lotto.ts"           "$P\lib\lotto.ts"
cp1 "$D\auth.ts"            "$P\lib\auth.ts"
cp1 "$D\sms.ts"             "$P\lib\sms.ts"
cp1 "$D\demo.ts"            "$P\lib\demo.ts"
cp1 "$D\Nav.tsx"            "$P\components\Nav.tsx"
cp1 "$D\StatsWidget.tsx"    "$P\components\StatsWidget.tsx"
cp1 "$D\home_page.tsx"      "$P\app\page.tsx"
cp1 "$D\auth_page.tsx"      "$P\app\(site)\auth\page.tsx"
cp1 "$D\profile_page.tsx"   "$P\app\(site)\profile\page.tsx"
cp1 "$D\lotto_page.tsx"     "$P\app\(site)\lotto\page.tsx"
cp1 "$D\admin_page.tsx"     "$P\app\(site)\admin\page.tsx"
cp1 "$D\toto_page.tsx"      "$P\app\(site)\toto\page.tsx"
cp1 "$D\stats_route.ts"     "$P\app\api\stats\route.ts"
cp1 "$D\subscribe_route.ts" "$P\app\api\lotto\subscribe\route.ts"
cp1 "$D\submit_route.ts"    "$P\app\api\lotto\submit\route.ts"
cp1 "$D\middleware.ts"      "$P\middleware.ts"
cp1 "$D\prisma.config.js"   "$P\prisma.config.js"
cp1 "$D\schema.prisma"      "$P\prisma\schema.prisma"
cp1 "$D\draw_results.json"  "$P\draw_results.json"

Write-Host "Done: $u files updated" -ForegroundColor Green
