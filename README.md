<p align="center">
  <img src="icon.svg" alt="Alertmanager Logo" width="21%">
</p>

# Alertmanager on StartOS

> Everything not listed in this document should behave the same as upstream
> Alertmanager. If a feature, setting, or behavior is not mentioned here, the
> upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

[Alertmanager](https://github.com/prometheus/alertmanager) receives alerts from Prometheus and other clients, groups, deduplicates and silences them, and routes notifications to receivers such as email and webhooks. This package runs a single instance behind a StartOS-enforced login and publishes a machine key so the Prometheus package can deliver alerts to it.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

The package runs the upstream image unmodified, with the package supplying the command line.

| Property      | Value                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------- |
| Image         | `prom/alertmanager`, upstream, unmodified                                                   |
| Architectures | x86_64, aarch64                                                                             |
| Entrypoint    | `alertmanager` with package-set flags; runs as `nobody`                                     |
| Subcontainer  | `alertmanager-sub` — runs the `chown` oneshot, then the `alertmanager` daemon               |

The command line fixes the config path (`/etc/alertmanager/alertmanager.yml`), the storage path (`/alertmanager`), the listen address (`:9093`), `--web.external-url` from **Set Primary URL**, and disables clustering (`--cluster.listen-address=`). `SSL_CERT_FILE` points at a bundle of the image's CA certificates plus this server's root CA, so webhooks to other services on this server's HTTPS addresses verify.

Inspect the running instance with `start-cli package attach alertmanager -n alertmanager-sub -- <cmd>`; `amtool` is available inside.

## Volume and Data Layout

Three volumes hold the user's configuration and Alertmanager's state, the package's own settings, and the key published to dependents.

| Volume    | Path on volume              | Mounted at      | Contents                                                       |
| --------- | --------------------------- | --------------- | -------------------------------------------------------------- |
| `main`    | `config/alertmanager.yml`   | not mounted     | The user's configuration, as written by Edit Configuration     |
| `main`    | `data/`                     | `/alertmanager` | Silences and the notification log (`silences`, `nflog`)        |
| `startos` | `store.json`                | not mounted     | Admin password, SMTP selection, email recipient, primary URL   |
| `public`  | `credentials.json`          | not mounted     | `apiKey`, read by dependent services                           |

The `chown` oneshot gives `data/` to `nobody` on every start, since StartOS mounts volumes root-owned.

## File Models

The package keeps the user's configuration and its own settings apart, and builds the file Alertmanager reads from both on every start.

- **`main/config/alertmanager.yml`** (YAML, kept verbatim with comments). Seeded at install with a single `default` receiver that every alert routes to. Written only by **Edit Configuration**, which validates first; a hand edit survives but is not validated until the next start.
- **`/etc/alertmanager/alertmanager.yml`** in the subcontainer (no model). Regenerated on every start from the file above plus `store.json`: when SMTP is configured, all `global.smtp_*` keys are replaced with the selected SMTP settings (including removing unselected authentication and TLS options), and when a recipient is set an `email_configs` entry is appended to the receiver named `default` (created if missing). Never edit this copy; it does not survive a restart.
- **`startos/store.json`** (JSON). `adminPassword` (written by **Set Admin Password**), `smtp` and `emailTo` (written by **Email Alerts**), and `primaryUrl` (written by **Set Primary URL**; unset means the preferred address).
- **`public/credentials.json`** (JSON). `apiKey`, generated at init whenever it is missing. Deleting it rotates the key on the next init; dependents restart onto the new one.

A change to the configuration or `store.json` restarts Alertmanager.

## Dependencies

None. The Prometheus package depends on this one optionally, and reads `public/credentials.json` to authenticate.

## Network Access and Interfaces

One HTTP interface serves the web UI and the API, behind a StartOS proxy that requires HTTP Basic authentication on every address, the bridge address included.

| Interface | ID   | Type | Port | Purpose                                                       |
| --------- | ---- | ---- | ---- | ------------------------------------------------------------- |
| Web UI    | `ui` | ui   | 9093 | Alerts, silences and status pages; `/api/v2` for clients      |

The proxy accepts two credentials: `admin` with the password from **Set Admin Password**, and `service` with the `apiKey` from `credentials.json`. Clients that post alerts (`/api/v2/alerts`) must send one of them. Clustering port 9094 is not opened.

## Installation and First-Run Flow

The admin password must be created before the service can start, and the upstream example webhook is replaced.

1. Install seeds `alertmanager.yml` with a `default` receiver that has no integrations, generates the `apiKey`, and raises the critical **Set Admin Password** task.
2. Until the task is done, the service cannot start and the proxy admits no admin login.
3. Notifications go nowhere until the user configures a receiver — with **Email Alerts** or **Edit Configuration**.

## Actions

Four actions cover the login, the routing configuration, email delivery, and the address notifications link to.

- **Set Admin Password** — run at install (task) and whenever the password should change. Generates a 32-character password, stores it in `store.json`, and returns it. The proxy picks it up immediately without restarting Alertmanager; the old password stops working. Safe to repeat; each run replaces the password.
- **Edit Configuration** — run to add receivers (webhooks, chat integrations, extra email recipients), routes, inhibition rules or templates. Builds the effective configuration, runs `amtool check-config` in a temporary container, and saves only if it passes; the rejection message is amtool's. Saving restarts Alertmanager (a few seconds; silences persist). Safe to repeat.
- **Email Alerts** — run to send alerts by email. Takes the standard StartOS SMTP choice (disabled, system SMTP, or custom) and a recipient, which is required unless SMTP is disabled. Validates the resulting configuration with `amtool` like **Edit Configuration**, then writes `store.json` and restarts Alertmanager. Email goes to whatever routes reach the `default` receiver, which in the seeded configuration is every alert. Choosing **Disabled** stops the package's email: its SMTP settings and the recipient are left out of the effective configuration, and the action refuses if an email receiver added by hand still needs them.
- **Set Primary URL** — run when the links in notifications should open a particular address, such as a public domain. The SDK's standard primary-URL action: it offers the Web UI's addresses, and while none is chosen, or the chosen one is gone, Alertmanager uses the preferred address (a public domain, else `.local`). Passed as `--web.external-url`; saving restarts Alertmanager. Safe to repeat.

## Tasks

One task protects the login.

- **Set Admin Password** — `critical`. Raised whenever `store.json` has no `adminPassword`, which is the case after install. Cleared by running the action. Returns only if the password is removed from `store.json`.

## Health Checks

One check reports whether Alertmanager is listening.

- **Web Interface** (`alertmanager`) — ready once a process listens on port 9093. A failure after a configuration change almost always means Alertmanager rejected the effective configuration at startup: read the service logs for the parse error, and correct it with **Edit Configuration**. A failure with no configuration change points at the storage path; check that `chown` completed in the logs.

## Backups and Restore

All three volumes are copied wholesale (`ofVolumes`), with no exclusions.

A restore brings back the configuration, silences, the notification log, the admin password and SMTP settings, and the `apiKey`, so a restored Prometheus keeps authenticating without a key change. Nothing needs to be re-entered.

## Limitations and Differences

1. **Single instance only.** Clustering is disabled; high-availability pairs are not supported.
2. **SMTP keys are package-owned.** `global.smtp_*` values written by hand in **Edit Configuration** are overwritten whenever **Email Alerts** has SMTP configured.
3. **The login is enforced by StartOS, not Alertmanager.** Alertmanager's own `--web.config.file` authentication is not used.

---

## Quick Reference for AI Consumers

```yaml
package_id: alertmanager
image: prom/alertmanager
architectures: [x86_64, aarch64]
subcontainers: [alertmanager-sub]
volumes:
  main: /alertmanager (subpath data)
  startos: not mounted
  public: not mounted
file_models:
  - main/config/alertmanager.yml
  - startos/store.json
  - public/credentials.json
startos_managed_env_vars:
  - SSL_CERT_FILE
dependencies: none
interfaces:
  ui: { type: ui, port: 9093 }
actions:
  - set-admin-password
  - edit-config
  - email-alerts
  - set-primary-url
tasks:
  - { action: set-admin-password, severity: critical }
health_checks:
  - alertmanager
```
