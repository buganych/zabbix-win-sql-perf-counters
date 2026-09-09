import { CodeBlock } from "@/components/code-block";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const templates = `1. На Windows поставьте Zabbix agent 2 (не классический agent, если нужен MSSQL-плагин).
2. Хосту назначьте шаблон «Windows by Zabbix agent» — CPU, память, диски, paging, очереди.
3. В mssql.conf плагина укажите URI инстанса.
4. Хосту назначьте «MSSQL by Zabbix agent 2».

Один элемент mssql.perfcounter.get забирает все глобальные счётчики SQL.
Зависимые элементы режут JSONPath'ом Buffer Manager, Statistics, Locks и т.д.`;

const mssqlConf = `Plugins.MSSQL.Timeout=15
Plugins.MSSQL.Sessions.Default.Uri=sqlserver://localhost:1433
Plugins.MSSQL.Sessions.Default.User=zabbix
Plugins.MSSQL.Sessions.Default.Password=***`;

const userParam = `Timeout=10
UnsafeUserParameters=1
UserParameter=win.mssql.snapshot,powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\\zabbix\\Collect-WinMssqlSnapshot.ps1" -Stdout`;

const dependent = `# master
win.mssql.snapshot

# dependent, preprocessing JSONPath
$.values["os.cpu.util"]
$.values["mssql.page_life_expectancy"]
$.values["mssql.buffer_cache_hit_ratio"]
$.values["mssql.batch_requests_sec"]`;

const sender = `zabbix_sender -z zabbix.example.ru -s SQL01.corp.local -i snapshot-zabbix_sender.txt`;

const officialSql = `mssql.perfcounter.get["{$MSSQL.URI}","{$MSSQL.USER}","{$MSSQL.PASSWORD}"]
mssql.db.get["{$MSSQL.URI}","{$MSSQL.USER}","{$MSSQL.PASSWORD}"]
mssql.version["{$MSSQL.URI}","{$MSSQL.USER}","{$MSSQL.PASSWORD}"]`;

export function ZabbixView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Вывод в Zabbix</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Для постоянных графиков ОС и СУБД используйте штатные шаблоны. Коллектор нужен, когда надо снять всё одним
          вызовом, проверить имена объектов или отправить разовый trapper. Весь комплект развёртывания — архив для{" "}
          <code className="font-mono">C:\Работа\Заслон\Мониторинг заббикс 1646642</code>:{" "}
          <a className="underline underline-offset-2" href="/%D0%9C%D0%BE%D0%BD%D0%B8%D1%82%D0%BE%D1%80%D0%B8%D0%BD%D0%B3%20%D0%B7%D0%B0%D0%B1%D0%B1%D0%B8%D0%BA%D1%81%201646642.zip">
            скачать ZIP
          </a>
          .
        </p>
      </div>

      <Alert>
        <AlertTitle>Рекомендуемый путь</AlertTitle>
        <AlertDescription>
          Шаблон Windows закрывает PerfMon ОС. Шаблон MSSQL by Zabbix agent 2 забирает счётчики СУБД одним{" "}
          <code className="font-mono">mssql.perfcounter.get</code> — отдельно по каждому counter item заводить не нужно.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Официальные шаблоны</CardTitle>
            <CardDescription>Zabbix 6.4 / 7.x, без внешних скриптов для SQL.</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock code={templates} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Плагин MSSQL</CardTitle>
            <CardDescription>
              Файл обычно лежит рядом с агентом:{" "}
              <code className="font-mono">zabbix_agent2.d/plugins.d/mssql.conf</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock code={mssqlConf} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Один элемент на все счётчики SQL</CardTitle>
          <CardDescription>
            Так шаблон и делает: master-item возвращает JSON, графики — зависимые элементы. Макросы URI/USER/PASSWORD
            задаются на хосте.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock code={officialSql} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Свой JSON одним UserParameter</CardTitle>
          <CardDescription>
            Если агент 2 с плагином недоступен, коллектор отдаёт и ОС, и SQL одним ключом{" "}
            <code className="font-mono">win.mssql.snapshot</code>. Импортируйте{" "}
            <code className="font-mono">zabbix/template_win_mssql_snapshot.yaml</code>.
            Timeout агента поставьте не меньше 10 с: Get-Counter берёт два образца.{" "}
            <a className="underline underline-offset-2" href="/collectors/template_win_mssql_snapshot.yaml">
              Скачать YAML
            </a>
            {" · "}
            <a className="underline underline-offset-2" href="/collectors/win-mssql-snapshot.conf">
              фрагмент agent.conf
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CodeBlock code={userParam} />
          <CodeBlock code={dependent} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Разовая отправка trapper</CardTitle>
          <CardDescription>
            С дашборда скачайте файл zabbix_sender или соберите его скриптом с{" "}
            <code className="font-mono">-SenderFile</code>. На шаблоне элементы типа Zabbix trapper с ключами{" "}
            <code className="font-mono">snapshot.*</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock code={sender} />
        </CardContent>
      </Card>
    </div>
  );
}
