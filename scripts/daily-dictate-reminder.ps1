# Daily reminder: shows today's dictation script from DICTATE-DAILY.md
# in a small always-on-top window (plus a toast). Scheduled 9:00 PM daily
# by the task: DeadlineRadar-DailyWispr
$md = 'D:\Hackathon\Deadline Radar\DICTATE-DAILY.md'
$dayNames = @('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')
$today = $dayNames[(Get-Date).DayOfWeek.value__]

# --- extract today's section from the markdown ---
$scriptText = ''
try {
  $lines = Get-Content -Encoding UTF8 $md
  $start = $null
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^## $today\b") { $start = $i; break }
  }
  if ($null -ne $start) {
    $end = $lines.Count
    for ($i = $start + 1; $i -lt $lines.Count; $i++) {
      if ($lines[$i] -match '^## ') { $end = $i; break }
    }
    $scriptText = ($lines[$start..($end - 1)] -join "`r`n").Trim()
  }
} catch { }

if (-not $scriptText) { $scriptText = "Open DICTATE-DAILY.md and speak today's script ($today)." }

# --- toast ---
try {
  [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
  [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
  $xmlText = @"
<toast><visual><binding template="ToastGeneric">
<text>Wispr time - 2 minute dictation ($today)</text>
<text>The script window is open - hold your Wispr key and just read it aloud</text>
</binding></visual></toast>
"@
  $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
  $xml.LoadXml($xmlText)
  [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('PowerShell').Show(
    (New-Object Windows.UI.Notifications.ToastNotification $xml))
} catch { }

# --- script window (always on top, big text, one Close button) ---
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = "Wispr dictate now - $today script"
$form.Size = New-Object System.Drawing.Size(620, 460)
$form.StartPosition = 'CenterScreen'
$form.TopMost = $true
$form.BackColor = [System.Drawing.Color]::FromArgb(13, 20, 36)
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false

$label = New-Object System.Windows.Forms.Label
$label.Text = "Hold your Wispr key and READ THIS ALOUD (about 2 min):"
$label.ForeColor = [System.Drawing.Color]::FromArgb(52, 211, 153)
$label.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
$label.AutoSize = $false
$label.Size = New-Object System.Drawing.Size(580, 24)
$label.Location = New-Object System.Drawing.Point(14, 12)
$form.Controls.Add($label)

$box = New-Object System.Windows.Forms.TextBox
$box.Multiline = $true
$box.ReadOnly = $true
$box.ScrollBars = 'Vertical'
$box.Text = $scriptText
$box.BackColor = [System.Drawing.Color]::FromArgb(13, 20, 36)
$box.ForeColor = [System.Drawing.Color]::FromArgb(226, 232, 240)
$box.Font = New-Object System.Drawing.Font('Segoe UI', 13)
$box.BorderStyle = 'None'
$box.Size = New-Object System.Drawing.Size(580, 300)
$box.Location = New-Object System.Drawing.Point(14, 44)
$form.Controls.Add($box)

$btn = New-Object System.Windows.Forms.Button
$btn.Text = "Done - close"
$btn.Size = New-Object System.Drawing.Size(130, 36)
$btn.Location = New-Object System.Drawing.Point(464, 356)
$btn.BackColor = [System.Drawing.Color]::FromArgb(16, 185, 129)
$btn.ForeColor = [System.Drawing.Color]::FromArgb(2, 10, 18)
$btn.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
$btn.FlatStyle = 'Flat'
$btn.Add_Click({ $form.Close() })
$form.Controls.Add($btn)

$hint = New-Object System.Windows.Forms.Label
$hint.Text = "Reminder at 9:00 PM daily - time badalna ho to bolo."
$hint.ForeColor = [System.Drawing.Color]::FromArgb(100, 116, 139)
$hint.Font = New-Object System.Drawing.Font('Segoe UI', 8)
$hint.AutoSize = $true
$hint.Location = New-Object System.Drawing.Point(14, 364)
$form.Controls.Add($hint)

[System.Windows.Forms.Application]::Run($form)
