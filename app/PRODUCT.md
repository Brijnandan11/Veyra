# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: frontend-only implementation in a lightweight React/Vite setup chosen for the empty scaffold; backend integration remains REST API-ready.

## Users

Product teams, developers, and operators who need to monitor websites and HTTP APIs, inspect failures, and communicate service health through a public status page.

## Product Purpose

Veyra provides a focused interface for adding URL monitors, viewing current health, reviewing check history, understanding incidents, and presenting service status publicly. Success means a user can quickly see what is healthy, what is failing, why it failed, and what visitors see on the public status page.

## Positioning

Veyra turns backend monitoring data into a single, legible operational view that connects live monitor health, historical checks, incident lifecycles, statistics, and a public status page without adding product scope beyond monitoring.

## Operating Context

Users work from a monitoring dashboard where checks run on a configured interval. They need to scan current health, open a monitor for evidence, inspect response times and HTTP status codes, review incidents, and preview or visit a public status page. The frontend consumes REST resources and must communicate loading, success, error, and empty states clearly.

## Capabilities and Constraints

- Monitor management: create, list, view, edit, delete, and enable or disable monitors.
- Monitor fields are name, URL, interval, and active state.
- Monitor details show UP or DOWN status, URL, response time, HTTP status, and last checked time.
- Check history shows time, status, HTTP status code, response time, and error.
- Incidents show status, started time, resolved time, and duration.
- Statistics show uptime, total checks, UP checks, DOWN checks, and average response time.
- A public status page is available without authentication and shows system health, per-service uptime, and recent incidents.
- Backend data is authoritative; the frontend does not implement monitoring, incident detection, or statistics calculations.
- REST endpoints are the integration contract, including `/api/v1/monitors`, monitor checks, monitor incidents, monitor stats, and `/status/:username`.
- v1 excludes authentication, organizations, multi-tenancy, notifications, billing, OAuth, real-time sockets, and other non-monitoring features.

## Evidence on Hand

The confirmed product scope is supplied in the user-provided Veyra brief. No production backend, brand assets, customer evidence, testimonials, or real monitoring data are present in the repository; frontend demo data must be treated as illustrative.

## Product Principles

- Put current service health at the center of every monitoring workflow.
- Make failures explainable through evidence, not just status labels.
- Keep the monitoring surface focused and operationally calm.
- Treat backend results as source of truth and represent uncertainty with explicit states.
- Make public status communication as clear as the private operator view.

## Accessibility & Inclusion

The web interface should support keyboard navigation, visible focus, semantic structure, readable contrast, responsive layouts, and non-color status communication.
