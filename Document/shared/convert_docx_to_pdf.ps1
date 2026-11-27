param (
    [Parameter(Mandatory=$true)]
    [string]$FilePath
)

$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    $docxPath = (Resolve-Path $FilePath).Path
    $pdfPath = [System.IO.Path]::ChangeExtension($docxPath, ".pdf")
    Write-Host "Converting $docxPath to $pdfPath"
    $doc = $word.Documents.Open($docxPath)
    # wdFormatPDF = 17
    $doc.SaveAs([ref]$pdfPath, [ref]17)
    $doc.Close([ref]$false)
    Write-Host "Success! Converted to $pdfPath"
} catch {
    Write-Error $_
} finally {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}
