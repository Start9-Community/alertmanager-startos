# Alertmanager

## Documentation

- [Alertmanager documentation](https://github.com/prometheus/alertmanager/tree/main/docs) — the upstream guide to configuration, routing, receivers, templates and the API.

## What you get on StartOS

- A **Web UI** interface for viewing current alerts, creating silences, and checking the configuration Alertmanager is running. It also serves the API that Prometheus and other tools send alerts to.
- A login in front of the interface, created by this service rather than by Alertmanager.
- Email notifications through the email server StartOS already uses, or one you provide.
- Automatic connection to the Prometheus service: when both are installed, Prometheus sends its alerts here with no setup.

## Getting set up

1. Run **Set Admin Password** when prompted. Save the username (`admin`) and the password it shows you; your browser asks for them when you open the Web UI.
2. Start the service.
3. To receive alerts by email, run **Email Alerts**, choose your email server, and enter the address alerts should go to.
4. Install **Prometheus** if you have not already. It sends its alerts here automatically.

## Using Alertmanager

### Web UI

Open the **Web UI** interface and log in. The **Alerts** page shows what is firing now, grouped as notifications will be. Use **Silences** to mute an alert you already know about, for a set time.

### Actions

- **Set Admin Password** — creates a new password for the Web UI. Run it again any time you want to change the password; the old one stops working right away.
- **Email Alerts** — chooses the email server and the address alerts are sent to. Choose **Disabled** to stop email.
- **Set Primary URL** — the address the links in notifications open. Choose the address you reach Alertmanager from away from home, such as a public domain, if you read alerts there.
- **Edit Configuration** — edits Alertmanager's configuration file directly, for anything beyond email: webhooks, chat services such as Telegram or Slack, different destinations for different alerts, and rules that suppress one alert while another is firing. Your changes are checked before they are saved, and you see the error if anything is wrong. The configuration format is described in the upstream documentation.

### Sending alerts from other tools

Tools other than Prometheus can post alerts to the Web UI address under `/api/v2/alerts`, logging in as `admin` with your password.
