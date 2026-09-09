# settings.ps1 — рядом с Collect-WinMssqlSnapshot.ps1 на хосте.
# Кодировка: UTF-8 с BOM (Windows PowerShell 5.1).

# Инстанс SQL: '.' или MSSQLSERVER = default, иначе имя (PRODATA → MSSQL$PRODATA).
$SqlInstance = '.'

# Если Windows-аутентификация учётки агента не проходит — логин SQL:
# $SqlUser = 'zabbix'
# $SqlPassword = 'смените'
