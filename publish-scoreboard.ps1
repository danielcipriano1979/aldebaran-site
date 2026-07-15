# Copia o scoreboard e as estatisticas exportados pelos plugins para o site e publica no GitHub Pages.
# Agende no Task Scheduler do Windows (ex.: a cada 5 minutos) NA MAQUINA DO SERVIDOR:
#   schtasks /Create /SC MINUTE /MO 5 /TN "AldebaranScoreboard" /TR "powershell -ExecutionPolicy Bypass -File C:\Aldebaran\RustServer\site\publish-scoreboard.ps1"
#
# Requisitos na maquina: git + gh CLI autenticado (gh auth login) e este diretorio sendo o clone do repo aldebaran-site.

param(
    [string]$DataDir = "C:\Aldebaran\RustServer\server\carbon\data",
    [string]$SiteRepo = $PSScriptRoot
)

$pairs = @(
    @{ Source = Join-Path $DataDir "AldebaranTagsScoreboard.json"; Target = "data\scoreboard.json" },
    @{ Source = Join-Path $DataDir "AldebaranStatsExport.json";    Target = "data\stats.json" }
)

$copied = $false
foreach ($pair in $pairs) {
    if (Test-Path $pair.Source) {
        Copy-Item $pair.Source (Join-Path $SiteRepo $pair.Target) -Force
        $copied = $true
    }
}

if (-not $copied) {
    Write-Host "Nenhum export encontrado ainda em $DataDir"
    exit 0
}

Set-Location $SiteRepo
git add data/scoreboard.json data/stats.json 2>$null
$changed = git status --porcelain data
if ($changed) {
    git commit -m "atualiza scoreboard/stats" | Out-Null
    git push
    Write-Host "Scoreboard e stats publicados."
} else {
    Write-Host "Sem mudancas."
}
