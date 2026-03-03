# Test login la API Volta (PowerShell)
# Rulează în PowerShell: .\scripts\test-login-api.ps1
# Sau: cd volta_app; .\scripts\test-login-api.ps1
# Înlocuiește EMAIL_TA și PAROLA_TA cu datele tale reale.

$uri = "https://api.volta.md/app/mobile/auth/login"
$body = @{
    username = "mjskyion@gmail.com"
    password = "volta2025"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $uri -Method POST -ContentType "application/json" -Body $body
    Write-Host "Succes! auth_token primit."
    $response | ConvertTo-Json
} catch {
    Write-Host "Eroare:" $_.Exception.Message
    if ($_.Exception.Response) {
        Write-Host "Status:" $_.Exception.Response.StatusCode.value__
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Raspuns:" $reader.ReadToEnd()
    }
}
