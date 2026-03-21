param(
    [string]$Owner = "farias-debug",
    [string]$Title = "RoutingPetLove - Kanban"
)

$ErrorActionPreference = "Stop"

function Get-OwnerId {
    $result = gh api graphql -f query='query($login: String!) { organization(login: $login) { id } user(login: $login) { id } }' -F login=$Owner | ConvertFrom-Json
    if ($result.data.organization.id) {
        return $result.data.organization.id
    }
    if ($result.data.user.id) {
        return $result.data.user.id
    }
    throw "Nao foi possivel localizar owner id para $Owner"
}

$ownerId = Get-OwnerId

$mutation = @'
mutation($ownerId: ID!, $title: String!) {
  createProjectV2(input: {ownerId: $ownerId, title: $title}) {
    projectV2 {
      id
      number
      title
      url
    }
  }
}
'@

$result = gh api graphql -f query=$mutation -F ownerId=$ownerId -F title=$Title | ConvertFrom-Json
$project = $result.data.createProjectV2.projectV2

Write-Host "Project criado:" -ForegroundColor Green
Write-Host ("- Titulo: {0}" -f $project.title)
Write-Host ("- Numero: {0}" -f $project.number)
Write-Host ("- URL: {0}" -f $project.url)
