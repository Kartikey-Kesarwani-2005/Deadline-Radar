# One-time challenge reminders (always-on-top window + toast):
#   -Mode checkin : Mon 26 Oct 9:00 AM - week-2 Wispr usage card check-in
#   -Mode submit  : Fri 30 Oct 8:00 AM - submission day
# Scheduled as Windows tasks: DeadlineRadar-Checkin26Oct / DeadlineRadar-Submit30Oct
param([ValidateSet('checkin', 'submit')][string]$Mode = 'checkin')

if ($Mode -eq 'checkin') {
  $title = 'Week-2 check-in - Deadline Radar'
  $lines = @(
    '1. Wispr Flow desktop app > Insights > usage card ka screenshot lo',
    '2. Challenge site pe weekly check-in me upload karo',
    '   (ranked by words dictated - har hafte upload karna zaroori hai)',
    '3. Optional bonus: #NoHandsChallenge progress post (X/anywhere)',
    '   paste-ready template: SUBMISSION.md section 4',
    '',
    'Weekly winners Monday announce hote hain - subah hi kar lena.'
  )
}
else {
  $title = 'SUBMIT TODAY - Deadline Radar'
  $lines = @(
    'Hard stop: 11:59 pm IST. Subah submit kar lo, raat ka last hour mat lo.',
    '',
    '1. SUBMISSION.md kholo (button neeche) - section 5 ke [__] numbers bharo',
    '   (3 numbers: Weekly report screenshot + Wispr usage card se)',
    '2. Challenge site pe Submit karo:',
    '   live link + demo video (2 min) + Wispr usage card + write-up',
    '3. Demo video pending hai to DEMO-SCRIPT.md se record karo',
    '   (screen record + Wispr Flow se dictate kiya hua voiceover)',
    '',
    'Link: https://kartikey-kesarwani-2005.github.io/Deadline-Radar/'
  )
}

# --- toast ---
try {
  [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
  [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
  $xmlText = @"
<toast><visual><binding template="ToastGeneric">
<text>$title</text>
<text>Open the reminder window - checklist inside</text>
</binding></visual></toast>
"@
  $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
  $xml.LoadXml($xmlText)
  [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('PowerShell').Show(
    (New-Object Windows.UI.Notifications.ToastNotification $xml))
} catch { }

# --- reminder window (always on top) ---
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = $title
$form.Size = New-Object System.Drawing.Size(660, 430)
$form.StartPosition = 'CenterScreen'
$form.TopMost = $true
$form.BackColor = [System.Drawing.Color]::FromArgb(13, 20, 36)
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false

$label = New-Object System.Windows.Forms.Label
$label.Text = if ($Mode -eq 'submit') { 'Submission day - checklist:' } else { 'Weekly check-in - checklist:' }
$label.ForeColor = [System.Drawing.Color]::FromArgb(52, 211, 153)
$label.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$label.AutoSize = $false
$label.Size = New-Object System.Drawing.Size(610, 26)
$label.Location = New-Object System.Drawing.Point(14, 12)
$form.Controls.Add($label)

$box = New-Object System.Windows.Forms.TextBox
$box.Multiline = $true
$box.ReadOnly = $true
$box.ScrollBars = 'Vertical'
$box.Text = ($lines -join "`r`n")
$box.BackColor = [System.Drawing.Color]::FromArgb(13, 20, 36)
$box.ForeColor = [System.Drawing.Color]::FromArgb(226, 232, 240)
$box.Font = New-Object System.Drawing.Font('Segoe UI', 12)
$box.BorderStyle = 'None'
$box.Size = New-Object System.Drawing.Size(618, 270)
$box.Location = New-Object System.Drawing.Point(14, 44)
$form.Controls.Add($box)

$btnOpen = New-Object System.Windows.Forms.Button
$btnOpen.Text = 'Open SUBMISSION.md'
$btnOpen.Size = New-Object System.Drawing.Size(180, 36)
$btnOpen.Location = New-Object System.Drawing.Point(14, 330)
$btnOpen.BackColor = [System.Drawing.Color]::FromArgb(56, 189, 248)
$btnOpen.ForeColor = [System.Drawing.Color]::FromArgb(2, 10, 18)
$btnOpen.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
$btnOpen.FlatStyle = 'Flat'
$btnOpen.Add_Click({ Invoke-Item 'D:\Hackathon\Deadline Radar\SUBMISSION.md' })
$form.Controls.Add($btnOpen)

$btn = New-Object System.Windows.Forms.Button
$btn.Text = 'Done - close'
$btn.Size = New-Object System.Drawing.Size(130, 36)
$btn.Location = New-Object System.Drawing.Point(502, 330)
$btn.BackColor = [System.Drawing.Color]::FromArgb(16, 185, 129)
$btn.ForeColor = [System.Drawing.Color]::FromArgb(2, 10, 18)
$btn.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
$btn.FlatStyle = 'Flat'
$btn.Add_Click({ $form.Close() })
$form.Controls.Add($btn)

$hint = New-Object System.Windows.Forms.Label
$hint.Text = if ($Mode -eq 'submit') { 'Reminder: Fri 30 Oct, 8:00 AM' } else { 'Reminder: Mon 26 Oct, 9:00 AM' }
$hint.ForeColor = [System.Drawing.Color]::FromArgb(100, 116, 139)
$hint.Font = New-Object System.Drawing.Font('Segoe UI', 8)
$hint.AutoSize = $true
$hint.Location = New-Object System.Drawing.Point(210, 340)
$form.Controls.Add($hint)

[System.Windows.Forms.Application]::Run($form)
