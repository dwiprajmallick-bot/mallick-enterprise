Clear-Host

$modules = @(
    [PSCustomObject]@{ No=1;  Name="Project Foundation";                          Status="DONE";    Progress=100 }
    [PSCustomObject]@{ No=2;  Name="Business / Product Structure";                Status="DONE";    Progress=100 }
    [PSCustomObject]@{ No=3;  Name="Customer Management";                         Status="DONE";    Progress=100 }
    [PSCustomObject]@{ No=4;  Name="Supplier Management";                         Status="DONE";    Progress=100 }
    [PSCustomObject]@{ No=5;  Name="Product Management";                          Status="DONE";    Progress=100 }
    [PSCustomObject]@{ No=6;  Name="Order Management";                            Status="DONE";    Progress=100 }
    [PSCustomObject]@{ No=7;  Name="Quotation / RFQ Foundation";                  Status="DONE";    Progress=100 }
    [PSCustomObject]@{ No=8;  Name="Purchase Order";                              Status="DONE";    Progress=100 }
    [PSCustomObject]@{ No=9;  Name="GRN - Goods Receipt";                         Status="DONE";    Progress=100 }
    [PSCustomObject]@{ No=10; Name="Purchase Workflow";                           Status="DONE";    Progress=100 }
    [PSCustomObject]@{ No=11; Name="Stock Foundation";                            Status="PARTIAL"; Progress=60 }
    [PSCustomObject]@{ No=12; Name="Invoice Foundation";                          Status="PARTIAL"; Progress=60 }
    [PSCustomObject]@{ No=13; Name="Payment Dashboard / Reversal";                Status="DONE";    Progress=100 }
    [PSCustomObject]@{ No=14; Name="Supplier Payable";                            Status="DONE";    Progress=100 }
    [PSCustomObject]@{ No=15; Name="Customer Receivable";                         Status="WORKING"; Progress=70 }
    [PSCustomObject]@{ No=16; Name="Ledger / Accounting Engine";                  Status="PARTIAL"; Progress=40 }
    [PSCustomObject]@{ No=17; Name="GST Management";                              Status="PARTIAL"; Progress=40 }
    [PSCustomObject]@{ No=18; Name="Documents";                                   Status="PARTIAL"; Progress=50 }
    [PSCustomObject]@{ No=19; Name="Audit Trail";                                 Status="PARTIAL"; Progress=70 }
    [PSCustomObject]@{ No=20; Name="Admin Panel / Navigation";                    Status="PARTIAL"; Progress=70 }
    [PSCustomObject]@{ No=21; Name="Admin Authentication";                        Status="PARTIAL"; Progress=60 }
    [PSCustomObject]@{ No=22; Name="Customer Statement / Aging";                  Status="PENDING"; Progress=0 }
    [PSCustomObject]@{ No=23; Name="Sales -> Invoice -> Delivery -> Payment";     Status="PENDING"; Progress=0 }
    [PSCustomObject]@{ No=24; Name="Credit Note / Debit Note / Returns";          Status="PENDING"; Progress=0 }
    [PSCustomObject]@{ No=25; Name="Complete Inventory Control";                  Status="PENDING"; Progress=0 }
    [PSCustomObject]@{ No=26; Name="Expense Management";                          Status="PENDING"; Progress=0 }
    [PSCustomObject]@{ No=27; Name="Cash & Bank Management";                      Status="PENDING"; Progress=0 }
    [PSCustomObject]@{ No=28; Name="Complete GST / Return System";                Status="PENDING"; Progress=0 }
    [PSCustomObject]@{ No=29; Name="Accounting Reports";                          Status="PENDING"; Progress=0 }
    [PSCustomObject]@{ No=30; Name="Staff / Accountant / Roles";                   Status="PENDING"; Progress=0 }
    [PSCustomObject]@{ No=31; Name="Approval System";                             Status="PENDING"; Progress=0 }
    [PSCustomObject]@{ No=32; Name="Bill Scan / OCR";                             Status="PENDING"; Progress=0 }
    [PSCustomObject]@{ No=33; Name="Customer Portal";                             Status="PENDING"; Progress=0 }
    [PSCustomObject]@{ No=34; Name="Supplier Portal";                             Status="PENDING"; Progress=0 }
    [PSCustomObject]@{ No=35; Name="B2B RFQ / Procurement";                       Status="PENDING"; Progress=0 }
    [PSCustomObject]@{ No=36; Name="Government / PSU Tender";                     Status="PENDING"; Progress=0 }
    [PSCustomObject]@{ No=37; Name="Dashboard / Analytics";                       Status="PENDING"; Progress=0 }
    [PSCustomObject]@{ No=38; Name="PDF / Print / Excel / CSV Export";             Status="PENDING"; Progress=0 }
    [PSCustomObject]@{ No=39; Name="Notification System";                         Status="PENDING"; Progress=0 }
    [PSCustomObject]@{ No=40; Name="Security Hardening";                          Status="PENDING"; Progress=0 }
    [PSCustomObject]@{ No=41; Name="Final Comprehensive Validation";              Status="PENDING"; Progress=0 }
    [PSCustomObject]@{ No=42; Name="Production Deployment";                      Status="PENDING"; Progress=0 }
)

$totalModules = $modules.Count

$completed = @(
    $modules | Where-Object { $_.Status -eq "DONE" }
).Count

$partial = @(
    $modules | Where-Object { $_.Status -eq "PARTIAL" }
).Count

$working = @(
    $modules | Where-Object { $_.Status -eq "WORKING" }
).Count

$pending = @(
    $modules | Where-Object { $_.Status -eq "PENDING" }
).Count

$progressValues = @(
    $modules | ForEach-Object {
        [int]$_.Progress
    }
)

$totalProgress = 0

foreach ($value in $progressValues) {
    $totalProgress += $value
}

$overallProgress = [math]::Round(
    ($totalProgress / $totalModules),
    0
)

$notCompleted = @(
    $modules | Where-Object { $_.Progress -lt 100 }
)

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "                 OFFICEKART PROJECT STATUS" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "PROJECT SUMMARY" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------"

Write-Host ("Total Modules       : {0}" -f $totalModules)
Write-Host ("Completed           : {0}" -f $completed)
Write-Host ("Partially Complete  : {0}" -f $partial)
Write-Host ("In Progress         : {0}" -f $working)
Write-Host ("Pending             : {0}" -f $pending)
Write-Host ("Overall Progress    : {0}%" -f $overallProgress)

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "MODULE STATUS" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

foreach ($module in $modules) {

    $statusText = "[{0}]" -f $module.Status

    Write-Host (
        "{0,2}. {1,-48} {2,-10} {3,4}%" -f `
        $module.No,
        $module.Name,
        $statusText,
        $module.Progress
    )
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "REMAINING WORK" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host ("Modules not fully completed: {0}" -f $notCompleted.Count)
Write-Host ""

foreach ($module in $notCompleted) {

    Write-Host (
        "{0}. {1} - {2}% complete" -f `
        $module.No,
        $module.Name,
        $module.Progress
    )
}

$nextModule = $modules |
    Where-Object { $_.Progress -lt 100 } |
    Sort-Object No |
    Select-Object -First 1

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "NEXT MODULE" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

if ($null -ne $nextModule) {

    Write-Host (
        "NEXT: {0}" -f $nextModule.Name
    ) -ForegroundColor Green

} else {

    Write-Host "ALL MODULES COMPLETE" -ForegroundColor Green
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "IMPORTANT" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This is the MASTER PROJECT ROADMAP."
Write-Host "Update Status and Progress when a module changes."
Write-Host ""
Write-Host "Final comprehensive validation will be done after"
Write-Host "all planned modules are implemented."
Write-Host ""
Write-Host "============================================================"
Write-Host ""
