# Shows a Windows toast reminding the daily 2-minute Wispr dictation.
# Scheduled by: DeadlineRadar-DailyWispr task (9:00 PM daily).
try {
  [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
  [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

  $dayNames = @('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')
  $today = $dayNames[(Get-Date).DayOfWeek.value__]

  $xmlText = @"
<toast><visual><binding template="ToastGeneric">
<text>Wispr time - 2 minute dictation ($today script)</text>
<text>Open DICTATE-DAILY.md, hold your Wispr key and speak today's script. Usage card +1</text>
</binding></visual></toast>
"@
  $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
  $xml.LoadXml($xmlText)
  $toast = New-Object Windows.UI.Notifications.ToastNotification $xml
  [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('PowerShell').Show($toast)
} catch {
  # A blocked notification should never break anything.
}
