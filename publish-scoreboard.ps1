# Copia o scoreboard exportado pelo plugin AldebaranTags para o site e publica no GitHub Pages.
# Agende no Task Scheduler do Windows (ex.: a cada 5 minutos) na maquina do servidor.
#
# Requisitos: gh CLI autenticado (gh auth login) e o repo do site clonado localmente.

param(
    # data file gerado pelo plugin no servidor
    [string]$Source = "C:\Aldebaran\RustServer\server\carbon\data\AldebaranTagsScoreboard.json",
    # clone local do repositorio do site
    [string]$SiteRepo = "C:\Aldebaran\RustServer\site"
)

if (-not (Test-Path $Source)) {
    Write-Host "Scoreboard ainda nao exportado pelo plugin: $Source"
    exit 0
}

$target = Join-Path $SiteRepo "data\scoreboard.json"
Copy-Item $Source $target -Force

Set-Location $SiteRepo
git add data/scoreboard.json
$changed = git status --porcelain data/scoreboard.json
if ($changed) {
    git commit -m "scoreboard update" | Out-Null
    git push
    Write-Host "Scoreboard publicado."
} else {
    Write-Host "Sem mudancas no scoreboard."
}
