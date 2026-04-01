# 🚀 ORBIT — Satellite Tracker

## 🔴 Live Demo
👉 https://vrhovaco.github.io/satellite-tracker-orbit/

## 📦 Repository
👉 https://github.com/vrhovaco/satellite-tracker-orbit

---

## 🌍 Overview

**ORBIT** is a portfolio-grade satellite tracking web application that visualizes orbital motion around Earth using a custom-rendered globe.

The project combines geospatial rendering, orbital simulation, and interactive UI to create a realistic and visually polished tracking system.

Unlike typical UI demos, this project focuses on **engineering logic and real-time simulation**, not just design.

---

## ✨ Features

- Real-time animated globe (orthographic projection)
- Satellite orbit visualization and path tracing
- Drag-based globe rotation (interactive control)
- Multiple view modes:
  - Auto rotation
  - North pole view
  - Satellite tracking mode
- Live UTC clock and epoch time display
- Sidebar with satellite list and visibility state
- Detailed telemetry panel (position, elevation, status)
- Elevation angle visualization from observer location
- Custom space-themed UI with smooth transitions and ambient effects

---

## 🛰️ Core Concepts

- Orbital motion simulation (simplified physics model)
- Geographic projection using D3.js
- Canvas-based rendering pipeline
- Elevation angle approximation for visibility detection
- State-driven UI without frameworks

---

## 🛠️ Tech Stack

- HTML5  
- CSS3 (custom UI, animations, theming)  
- Vanilla JavaScript  
- Canvas API  
- D3.js (geographic projections)  
- World Atlas TopoJSON data  

---

## 📁 Project Structure
📦 satellite-tracker-orbit
┣ 📜 index.html # Layout and canvas container
┣ 📜 style.css # UI styling and animations
┣ 📜 app.js # Simulation logic and rendering engine
┗ 📜 README.md


---

## ⚙️ How It Works

Each satellite is modeled using simplified orbital parameters:

- inclination  
- orbital period  
- altitude  
- phase offset  

The system calculates satellite position over time and:

1. Converts orbital data into latitude/longitude  
2. Projects coordinates onto an orthographic globe  
3. Renders the result using Canvas  
4. Computes elevation angle relative to observer  
5. Determines visibility state (visible / not visible)  

---

## 🎯 Purpose

This project demonstrates the ability to build advanced frontend systems involving:

- real-time simulation  
- geospatial data visualization  
- canvas rendering  
- interactive UI architecture  

Applicable to domains such as:

- space tech dashboards  
- satellite tracking systems  
- geospatial analytics  
- simulation-based interfaces  

---

## 💡 Highlights

- Strong combination of math, visualization, and UI  
- Fully custom rendering (no heavy frameworks)  
- Realistic simulation behavior  
- Clean separation of logic and presentation  
- Portfolio-level complexity and originality  

---

## ▶️ Running the Project

Because the app fetches external TopoJSON data, it must be served via a local server.

### Option 1 — VS Code Live Server  
Run with Live Server extension  

### Option 2 — Python
```bash
python -m http.server 8000
