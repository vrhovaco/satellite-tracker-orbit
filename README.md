// ===============================
// FILE: README.md
// ===============================

# ORBIT — Satellite Tracker

## 🔴 Live Demo
https://vrhovaco.github.io/satellite-tracker-orbit/

A real-time satellite tracking web app focused on visual clarity, orbital simulation, and interactive globe-based exploration.

## Overview

ORBIT is a portfolio-grade front-end project that visualizes a set of tracked satellites around Earth using a custom-rendered orthographic globe. The app combines geospatial rendering, orbital math, elevation calculations, and a polished sci-fi inspired interface.

This project is built to demonstrate more than styling. It shows practical work with:

- canvas-based rendering
- D3 geographic projections
- orbital simulation logic
- visibility and elevation calculations
- interactive UI state management without frameworks

## Features

- Real-time animated globe with rotating Earth view
- Satellite orbit traces
- Manual globe rotation with drag interaction
- Auto view, north pole view, and satellite tracking mode
- Live UTC clock and epoch output
- Satellite sidebar with real-time visibility state
- Detailed telemetry panel for the selected satellite
- Elevation arc visualization from a fixed ground observer location
- Custom space-themed UI with subtle motion and ambient effects

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Canvas API
- D3.js for geographic projection
- World Atlas TopoJSON data

## Project Structure

```text
.
├── index.html
├── style.css
├── app.js
└── README.md
```

## How It Works

Each satellite is represented by a simplified orbital model containing:

- inclination
- orbital period
- altitude
- starting phase

The app calculates a simulated latitude and longitude over time, projects the position onto an orthographic globe, and determines whether the satellite is visible from the observer location using an elevation-angle approximation.

## Running the Project

Because the app fetches world atlas data, it should be served through a local web server rather than opened directly as a file.

### Option 1 — VS Code Live Server

Open the project folder and run it with Live Server.

### Option 2 — Python

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```
This project is provided for portfolio and educational use.
