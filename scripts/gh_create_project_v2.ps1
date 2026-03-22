param(
  [string]$Owner = "farias-debug",
  [string]$Title = "RoutingPetLove - Kanban"
)

$ErrorActionPreference = "Stop"

function Get-OwnerId {
  $userQuery = 'query($login: String!) { user(login: $login) { id } }'
  $userResult = gh api graphql -f query=$userQuery -F login=$Owner | ConvertFrom-Json
  if ($userResult.data.user.id) {
    return $userResult.data.user.id
  }

  $orgQuery = 'query($login: String!) { organization(login: $login) { id } }'
  $orgResult = gh api graphql -f query=$orgQuery -F login=$Owner | ConvertFrom-Json
  if ($orgResult.data.organization.id) {
    return $orgResult.data.organization.id
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
